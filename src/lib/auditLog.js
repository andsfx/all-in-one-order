/**
 * Audit Logging Utility
 * 
 * Provides functions to log order changes for audit trail.
 * Tracks who changed what, when, and from what value to what value.
 */

import { supabase } from './supabase';
import { logError } from './logError';

/**
 * Log an order change to the audit log
 * @param {Object} params - Audit log parameters
 * @param {string} params.orderId - Order ID
 * @param {string} params.action - Action type (INSERT, UPDATE, DELETE, STATUS_CHANGE)
 * @param {string} params.fieldName - Field that was changed (e.g., 'status', 'total')
 * @param {any} params.oldValue - Previous value
 * @param {any} params.newValue - New value
 * @param {string} params.userType - User type ('admin', 'customer', 'system')
 * @param {string} params.sessionToken - Session token (for customer actions)
 * @param {Object} params.metadata - Additional context
 * @returns {Promise<Object>} Audit log entry
 */
export async function logOrderChange({
  orderId,
  action,
  fieldName = null,
  oldValue = null,
  newValue = null,
  userType = 'system',
  sessionToken = null,
  metadata = null
}) {
  try {
    // Convert values to strings for storage
    const oldValueStr = oldValue !== null ? JSON.stringify(oldValue) : null;
    const newValueStr = newValue !== null ? JSON.stringify(newValue) : null;

    // Call the database function to log the change
    const { data, error } = await supabase.rpc('log_order_change', {
      p_order_id: orderId,
      p_action: action,
      p_field_name: fieldName,
      p_old_value: oldValueStr,
      p_new_value: newValueStr,
      p_user_type: userType,
      p_session_token: sessionToken,
      p_metadata: metadata
    });

    if (error) {
      logError(error instanceof Error ? error : new Error(String(error.message || error)), { metadata: { source: 'auditLog.logOrderChange', type: 'rpc_error' } });
      return null;
    }

    return data;
  } catch (error) {
    logError(error instanceof Error ? error : new Error(String(error)), { metadata: { source: 'auditLog.logOrderChange' } });
    return null;
  }
}

/**
 * Log order status change
 * @param {string} orderId - Order ID
 * @param {string} oldStatus - Previous status
 * @param {string} newStatus - New status
 * @param {string} userType - User type ('admin', 'customer', 'system')
 * @param {string} sessionToken - Session token (for customer actions)
 * @param {Object} metadata - Additional context (e.g., reason)
 */
export async function logStatusChange(orderId, oldStatus, newStatus, userType = 'admin', sessionToken = null, metadata = null) {
  return logOrderChange({
    orderId,
    action: 'STATUS_CHANGE',
    fieldName: 'status',
    oldValue: oldStatus,
    newValue: newStatus,
    userType,
    sessionToken,
    metadata
  });
}

/**
 * Log order creation
 * @param {string} orderId - Order ID
 * @param {Object} orderData - Order data
 * @param {string} sessionToken - Session token
 */
export async function logOrderCreation(orderId, orderData, sessionToken) {
  return logOrderChange({
    orderId,
    action: 'INSERT',
    fieldName: null,
    oldValue: null,
    newValue: orderData,
    userType: 'customer',
    sessionToken,
    metadata: {
      customer_name: orderData.customer_name,
      total: orderData.total,
      payment_method: orderData.payment_method
    }
  });
}

/**
 * Log order cancellation
 * @param {string} orderId - Order ID
 * @param {string} userType - User type ('admin' or 'customer')
 * @param {string} sessionToken - Session token (for customer cancellations)
 * @param {string} reason - Reason for cancellation
 */
export async function logOrderCancellation(orderId, userType, sessionToken = null, reason = null) {
  return logOrderChange({
    orderId,
    action: 'STATUS_CHANGE',
    fieldName: 'status',
    oldValue: 'pending_payment', // Assuming only pending orders can be cancelled
    newValue: 'cancelled',
    userType,
    sessionToken,
    metadata: reason ? { reason } : null
  });
}

/**
 * Log payment confirmation
 * @param {string} orderId - Order ID
 * @param {string} paymentMethod - Payment method used
 */
export async function logPaymentConfirmation(orderId, paymentMethod) {
  return logOrderChange({
    orderId,
    action: 'STATUS_CHANGE',
    fieldName: 'status',
    oldValue: 'pending_payment',
    newValue: 'paid',
    userType: 'admin',
    metadata: {
      payment_method: paymentMethod,
      confirmed_at: new Date().toISOString()
    }
  });
}

/**
 * Fetch audit logs for an order
 * @param {string} orderId - Order ID
 * @param {number} limit - Maximum number of logs to fetch
 * @returns {Promise<Array>} Array of audit log entries
 */
export async function getOrderAuditLogs(orderId, limit = 50) {
  try {
    const { data, error } = await supabase
      .from('audit_logs')
      .select('*')
      .eq('table_name', 'orders')
      .eq('record_id', orderId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      logError(error instanceof Error ? error : new Error(String(error.message || error)), { metadata: { source: 'auditLog.getOrderAuditLogs' } });
      return [];
    }

    return data || [];
  } catch (error) {
    logError(error instanceof Error ? error : new Error(String(error)), { metadata: { source: 'auditLog.getOrderAuditLogs' } });
    return [];
  }
}

/**
 * Fetch all audit logs with pagination
 * @param {number} page - Page number (0-indexed)
 * @param {number} pageSize - Number of logs per page
 * @param {Object} filters - Optional filters
 * @returns {Promise<Object>} { data: Array, count: number }
 */
export async function getAuditLogs(page = 0, pageSize = 50, filters = {}) {
  try {
    let query = supabase
      .from('audit_logs_with_details')
      .select('*', { count: 'exact' });

    // Apply filters
    if (filters.orderId) {
      query = query.eq('record_id', filters.orderId);
    }
    if (filters.userType) {
      query = query.eq('user_type', filters.userType);
    }
    if (filters.action) {
      query = query.eq('action', filters.action);
    }
    if (filters.dateFrom) {
      query = query.gte('created_at', filters.dateFrom);
    }
    if (filters.dateTo) {
      query = query.lte('created_at', filters.dateTo);
    }

    // Pagination
    const from = page * pageSize;
    const to = from + pageSize - 1;

    const { data, error, count } = await query
      .order('created_at', { ascending: false })
      .range(from, to);

    if (error) {
      logError(error instanceof Error ? error : new Error(String(error.message || error)), { metadata: { source: 'auditLog.getAuditLogs' } });
      return { data: [], count: 0 };
    }

    return { data: data || [], count: count || 0 };
  } catch (error) {
    logError(error instanceof Error ? error : new Error(String(error)), { metadata: { source: 'auditLog.getAuditLogs' } });
    return { data: [], count: 0 };
  }
}

/**
 * Format audit log entry for display
 * @param {Object} log - Audit log entry
 * @returns {string} Human-readable description
 */
export function formatAuditLog(log) {
  const actor = log.user_email || (log.user_type === 'customer' ? 'Customer' : 'System');
  const time = new Date(log.created_at).toLocaleString('id-ID');

  switch (log.action) {
    case 'INSERT':
      return `${actor} membuat order ${log.record_id} pada ${time}`;
    
    case 'STATUS_CHANGE':
      return `${actor} mengubah status dari "${log.old_value}" ke "${log.new_value}" pada ${time}`;
    
    case 'UPDATE':
      if (log.field_name) {
        return `${actor} mengubah ${log.field_name} dari "${log.old_value}" ke "${log.new_value}" pada ${time}`;
      }
      return `${actor} mengupdate order ${log.record_id} pada ${time}`;
    
    case 'DELETE':
      return `${actor} menghapus order ${log.record_id} pada ${time}`;
    
    default:
      return `${actor} melakukan ${log.action} pada ${time}`;
  }
}

/**
 * Get audit log statistics
 * @param {string} dateFrom - Start date (ISO string)
 * @param {string} dateTo - End date (ISO string)
 * @returns {Promise<Object>} Statistics object
 */
export async function getAuditLogStats(dateFrom, dateTo) {
  try {
    const { data, error } = await supabase
      .from('audit_logs')
      .select('action, user_type')
      .gte('created_at', dateFrom)
      .lte('created_at', dateTo);

    if (error) {
      logError(error instanceof Error ? error : new Error(String(error.message || error)), { metadata: { source: 'auditLog.getAuditLogStats' } });
      return null;
    }

    // Calculate statistics
    const stats = {
      total: data.length,
      byAction: {},
      byUserType: {}
    };

    data.forEach(log => {
      // Count by action
      stats.byAction[log.action] = (stats.byAction[log.action] || 0) + 1;
      
      // Count by user type
      stats.byUserType[log.user_type] = (stats.byUserType[log.user_type] || 0) + 1;
    });

    return stats;
  } catch (error) {
    logError(error instanceof Error ? error : new Error(String(error)), { metadata: { source: 'auditLog.getAuditLogStats' } });
    return null;
  }
}

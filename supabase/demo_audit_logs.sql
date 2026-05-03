-- Demo Audit Log Entries
-- Run this to populate audit_logs table with example data for testing

-- Example 1: Customer creates order
insert into audit_logs (
  table_name,
  record_id,
  action,
  user_type,
  session_token,
  metadata,
  created_at
) values (
  'orders',
  'ORD-0001',
  'INSERT',
  'customer',
  'demo-session-token-123',
  '{"customer_name": "John Doe", "total": 50000, "payment_method": "qris"}'::jsonb,
  now() - interval '2 hours'
);

-- Example 2: Admin confirms payment
insert into audit_logs (
  table_name,
  record_id,
  action,
  field_name,
  old_value,
  new_value,
  user_type,
  user_id,
  user_email,
  metadata,
  created_at
) values (
  'orders',
  'ORD-0001',
  'STATUS_CHANGE',
  'status',
  'pending_payment',
  'paid',
  'admin',
  (select id from auth.users limit 1),
  (select email from auth.users limit 1),
  '{"payment_method": "qris", "confirmed_at": "2026-05-03T10:30:00Z"}'::jsonb,
  now() - interval '1 hour 50 minutes'
);

-- Example 3: Admin changes status to preparing
insert into audit_logs (
  table_name,
  record_id,
  action,
  field_name,
  old_value,
  new_value,
  user_type,
  user_id,
  user_email,
  created_at
) values (
  'orders',
  'ORD-0001',
  'STATUS_CHANGE',
  'status',
  'paid',
  'preparing',
  'admin',
  (select id from auth.users limit 1),
  (select email from auth.users limit 1),
  now() - interval '1 hour 30 minutes'
);

-- Example 4: Admin marks order ready
insert into audit_logs (
  table_name,
  record_id,
  action,
  field_name,
  old_value,
  new_value,
  user_type,
  user_id,
  user_email,
  created_at
) values (
  'orders',
  'ORD-0001',
  'STATUS_CHANGE',
  'status',
  'preparing',
  'ready',
  'admin',
  (select id from auth.users limit 1),
  (select email from auth.users limit 1),
  now() - interval '1 hour'
);

-- Example 5: Customer cancels order (different order)
insert into audit_logs (
  table_name,
  record_id,
  action,
  field_name,
  old_value,
  new_value,
  user_type,
  session_token,
  metadata,
  created_at
) values (
  'orders',
  'ORD-0002',
  'STATUS_CHANGE',
  'status',
  'pending_payment',
  'cancelled',
  'customer',
  'demo-session-token-456',
  '{"reason": "Customer cancelled order", "cancelled_by": "customer"}'::jsonb,
  now() - interval '30 minutes'
);

-- Example 6: System auto-cancel (expired payment)
insert into audit_logs (
  table_name,
  record_id,
  action,
  field_name,
  old_value,
  new_value,
  user_type,
  metadata,
  created_at
) values (
  'orders',
  'ORD-0003',
  'STATUS_CHANGE',
  'status',
  'pending_payment',
  'cancelled',
  'system',
  '{"reason": "Payment timeout - auto-cancelled after 15 minutes", "auto_cancel": true}'::jsonb,
  now() - interval '15 minutes'
);

-- Verify demo data
select 
  id,
  table_name,
  record_id,
  action,
  user_type,
  user_email,
  field_name,
  old_value,
  new_value,
  created_at
from audit_logs
order by created_at desc
limit 10;

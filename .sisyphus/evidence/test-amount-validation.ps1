#!/usr/bin/env pwsh
# Manual Test Script for Payment Amount Validation
# Run this after deploying the webhook to test fraud prevention

$WEBHOOK_URL = "https://your-project.supabase.co/functions/v1/cashi-webhook"
$WEBHOOK_SECRET = "your-webhook-secret"

Write-Host "=== Payment Amount Validation Test ===" -ForegroundColor Cyan
Write-Host ""

# Function to compute HMAC-SHA256 signature
function Get-HmacSignature {
    param([string]$Body, [string]$Secret)
    
    $hmac = New-Object System.Security.Cryptography.HMACSHA256
    $hmac.Key = [Text.Encoding]::UTF8.GetBytes($Secret)
    $hash = $hmac.ComputeHash([Text.Encoding]::UTF8.GetBytes($Body))
    return ($hash | ForEach-Object { $_.ToString("x2") }) -join ''
}

# Test 1: Amount Mismatch (Fraud Attempt)
Write-Host "Test 1: Amount Mismatch (Fraud Attempt)" -ForegroundColor Yellow
Write-Host "Expected: 200 with error JSON, order stays pending_payment" -ForegroundColor Gray

$body1 = @{
    event = "PAYMENT_SETTLED"
    data = @{
        transaction_id = "TXN-TEST-FRAUD-1"
        order_id = "existing-order-id-here"  # Replace with real order ID
        status = "SETTLED"
        amount = 1000  # Fraudulent amount (order total is 50000)
        paid_at = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ")
    }
} | ConvertTo-Json -Compress

$signature1 = Get-HmacSignature -Body $body1 -Secret $WEBHOOK_SECRET

Write-Host "Request Body:" -ForegroundColor Gray
Write-Host $body1 -ForegroundColor DarkGray
Write-Host ""

try {
    $response1 = Invoke-WebRequest -Uri $WEBHOOK_URL `
        -Method POST `
        -Headers @{
            "X-Signature" = $signature1
            "Content-Type" = "application/json"
        } `
        -Body $body1 `
        -UseBasicParsing
    
    Write-Host "Status: $($response1.StatusCode)" -ForegroundColor $(if ($response1.StatusCode -eq 200) { "Green" } else { "Red" })
    Write-Host "Response: $($response1.Content)" -ForegroundColor DarkGray
    
    $json1 = $response1.Content | ConvertFrom-Json
    if ($json1.error -eq "Payment amount mismatch") {
        Write-Host "✅ PASS: Fraud attempt detected and rejected" -ForegroundColor Green
    } else {
        Write-Host "❌ FAIL: Expected error response" -ForegroundColor Red
    }
} catch {
    Write-Host "❌ ERROR: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""
Write-Host "---" -ForegroundColor DarkGray
Write-Host ""

# Test 2: Amount Match (Legitimate Payment)
Write-Host "Test 2: Amount Match (Legitimate Payment)" -ForegroundColor Yellow
Write-Host "Expected: 200 'OK', order updated to paid" -ForegroundColor Gray

$body2 = @{
    event = "PAYMENT_SETTLED"
    data = @{
        transaction_id = "TXN-TEST-LEGIT-1"
        order_id = "existing-order-id-here"  # Replace with real order ID
        status = "SETTLED"
        amount = 50000  # Correct amount matching order total
        paid_at = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ")
    }
} | ConvertTo-Json -Compress

$signature2 = Get-HmacSignature -Body $body2 -Secret $WEBHOOK_SECRET

Write-Host "Request Body:" -ForegroundColor Gray
Write-Host $body2 -ForegroundColor DarkGray
Write-Host ""

try {
    $response2 = Invoke-WebRequest -Uri $WEBHOOK_URL `
        -Method POST `
        -Headers @{
            "X-Signature" = $signature2
            "Content-Type" = "application/json"
        } `
        -Body $body2 `
        -UseBasicParsing
    
    Write-Host "Status: $($response2.StatusCode)" -ForegroundColor $(if ($response2.StatusCode -eq 200) { "Green" } else { "Red" })
    Write-Host "Response: $($response2.Content)" -ForegroundColor DarkGray
    
    if ($response2.Content -eq "OK") {
        Write-Host "✅ PASS: Legitimate payment accepted" -ForegroundColor Green
    } else {
        Write-Host "⚠️ WARNING: Unexpected response (may still be valid)" -ForegroundColor Yellow
    }
} catch {
    Write-Host "❌ ERROR: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""
Write-Host "---" -ForegroundColor DarkGray
Write-Host ""

# Test 3: Within Tolerance (Edge Case)
Write-Host "Test 3: Within Tolerance (50 rupiah difference)" -ForegroundColor Yellow
Write-Host "Expected: 200 'OK', order updated to paid" -ForegroundColor Gray

$body3 = @{
    event = "PAYMENT_SETTLED"
    data = @{
        transaction_id = "TXN-TEST-TOLERANCE-1"
        order_id = "existing-order-id-here"  # Replace with real order ID
        status = "SETTLED"
        amount = 50050  # Within 100 tolerance
        paid_at = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ")
    }
} | ConvertTo-Json -Compress

$signature3 = Get-HmacSignature -Body $body3 -Secret $WEBHOOK_SECRET

Write-Host "Request Body:" -ForegroundColor Gray
Write-Host $body3 -ForegroundColor DarkGray
Write-Host ""

try {
    $response3 = Invoke-WebRequest -Uri $WEBHOOK_URL `
        -Method POST `
        -Headers @{
            "X-Signature" = $signature3
            "Content-Type" = "application/json"
        } `
        -Body $body3 `
        -UseBasicParsing
    
    Write-Host "Status: $($response3.StatusCode)" -ForegroundColor $(if ($response3.StatusCode -eq 200) { "Green" } else { "Red" })
    Write-Host "Response: $($response3.Content)" -ForegroundColor DarkGray
    
    if ($response3.Content -eq "OK") {
        Write-Host "✅ PASS: Payment within tolerance accepted" -ForegroundColor Green
    } else {
        Write-Host "⚠️ WARNING: Unexpected response" -ForegroundColor Yellow
    }
} catch {
    Write-Host "❌ ERROR: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""
Write-Host "=== Verification Queries ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "Check fraud logs in Supabase:" -ForegroundColor Gray
Write-Host "SELECT * FROM audit_logs WHERE action = 'FRAUD_ATTEMPT' ORDER BY created_at DESC LIMIT 10;" -ForegroundColor DarkGray
Write-Host ""
Write-Host "Check order status:" -ForegroundColor Gray
Write-Host "SELECT id, status, total, paid_at FROM orders WHERE id = 'your-order-id';" -ForegroundColor DarkGray
Write-Host ""
Write-Host "=== Test Complete ===" -ForegroundColor Cyan

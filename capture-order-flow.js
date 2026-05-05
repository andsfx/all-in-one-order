/**
 * Enhanced Screenshot Capture Script
 * Simulates user flow to capture order-status and payment screenshots
 */

import { chromium } from 'playwright';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const APP_URL = 'https://order-kopi-app.vercel.app';
const SCREENSHOTS_DIR = path.join(__dirname, 'screenshots');

async function captureOrderFlow() {
  console.log('🚀 Starting order flow screenshot capture...\n');
  
  const browser = await chromium.launch({ headless: false }); // Non-headless to see what's happening
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    deviceScaleFactor: 1,
  });
  const page = await context.newPage();

  try {
    // Navigate to home
    console.log('📱 Opening app...');
    await page.goto(APP_URL, { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    // Check if store is open
    const storeStatus = await page.locator('text=/tutup|closed/i').count();
    if (storeStatus > 0) {
      console.log('⚠️  Store is closed. Screenshots may show closed state.');
    }

    // Try to add item to cart
    console.log('🛒 Adding item to cart...');
    const addToCartButtons = await page.locator('button:has-text("Tambah")').all();
    if (addToCartButtons.length > 0) {
      await addToCartButtons[0].click();
      await page.waitForTimeout(1000);
      
      // Check if modal opened
      const modalVisible = await page.locator('[role="dialog"]').count();
      if (modalVisible > 0) {
        console.log('✅ Product modal opened');
        
        // Select options if available
        const sizeButtons = await page.locator('button:has-text("Regular")').all();
        if (sizeButtons.length > 0) {
          await sizeButtons[0].click();
          await page.waitForTimeout(500);
        }
        
        // Add to cart
        const confirmButton = await page.locator('button:has-text("Tambah ke Keranjang")').first();
        if (await confirmButton.count() > 0) {
          await confirmButton.click();
          await page.waitForTimeout(1500);
          console.log('✅ Item added to cart');
        }
      }
    }

    // Go to cart/checkout
    console.log('💳 Going to checkout...');
    const cartButton = await page.locator('button:has-text("Keranjang"), a[href*="cart"]').first();
    if (await cartButton.count() > 0) {
      await cartButton.click();
      await page.waitForTimeout(2000);
      
      // Try to proceed to checkout
      const checkoutButton = await page.locator('button:has-text("Checkout"), button:has-text("Buat Pesanan")').first();
      if (await checkoutButton.count() > 0) {
        // Fill customer info if needed
        const nameInput = await page.locator('input[name="customer_name"], input[placeholder*="nama"]').first();
        if (await nameInput.count() > 0) {
          await nameInput.fill('Test Customer');
          await page.waitForTimeout(500);
        }
        
        // Select payment method (QRIS)
        const qrisOption = await page.locator('input[value="qris"], label:has-text("QRIS")').first();
        if (await qrisOption.count() > 0) {
          await qrisOption.click();
          await page.waitForTimeout(500);
        }
        
        // Click checkout
        await checkoutButton.click();
        await page.waitForTimeout(3000);
        
        console.log('📸 Capturing: qris-payment.png');
        await page.screenshot({
          path: path.join(SCREENSHOTS_DIR, 'qris-payment.png'),
          fullPage: false,
        });
        console.log('✅ qris-payment.png saved\n');
        
        // Wait a bit to see if QRIS loads
        await page.waitForTimeout(2000);
        
        // Capture order status page
        console.log('📸 Capturing: order-status.png');
        await page.screenshot({
          path: path.join(SCREENSHOTS_DIR, 'order-status.png'),
          fullPage: false,
        });
        console.log('✅ order-status.png saved\n');
      }
    }

    // For rating screenshot, we need a completed order
    // Let's create a placeholder or skip
    console.log('⚠️  Rating screenshot requires completed order - skipping\n');
    
    // Create a placeholder for payment-confirmed
    console.log('⚠️  Payment confirmation screenshot requires actual payment - skipping\n');

    console.log('✅ Order flow screenshot capture complete!');
    console.log('\n📝 Captured:');
    console.log('   ✅ qris-payment.png');
    console.log('   ✅ order-status.png');
    console.log('\n⚠️  Still needed (capture manually):');
    console.log('   - rating.png (requires completed order)');
    console.log('   - payment-confirmed.png (requires actual payment)');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.log('\n💡 Tip: If order creation failed, you may need to:');
    console.log('   1. Ensure store is open');
    console.log('   2. Check if products are available');
    console.log('   3. Verify payment gateway is configured');
  } finally {
    await browser.close();
  }
}

// Run the script
captureOrderFlow().catch(console.error);

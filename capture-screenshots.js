/**
 * Screenshot Capture Script
 * Captures all required screenshots for README.md
 */

import { chromium } from 'playwright';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const APP_URL = 'https://order-kopi-app.vercel.app';
const SCREENSHOTS_DIR = path.join(__dirname, 'screenshots');

async function captureScreenshots() {
  console.log('🚀 Starting screenshot capture...\n');
  
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    deviceScaleFactor: 1,
  });
  const page = await context.newPage();

  try {
    // 1. Menu Page (Customer)
    console.log('📸 Capturing: menu.png');
    await page.goto(APP_URL, { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000); // Wait for content to load
    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, 'menu.png'),
      fullPage: false,
    });
    console.log('✅ menu.png saved\n');

    // 2. Order Status Page (Customer)
    console.log('📸 Capturing: order-status.png');
    // Try to find an existing order or create a test scenario
    const orderLinks = await page.locator('a[href*="/order/"]').all();
    if (orderLinks.length > 0) {
      await orderLinks[0].click();
      await page.waitForTimeout(2000);
      await page.screenshot({
        path: path.join(SCREENSHOTS_DIR, 'order-status.png'),
        fullPage: false,
      });
      console.log('✅ order-status.png saved\n');
      await page.goto(APP_URL); // Go back to home
    } else {
      console.log('⚠️  No orders found, skipping order-status.png\n');
    }

    // 3. Rating Page (Customer)
    console.log('📸 Capturing: rating.png');
    // This would require a completed order, skip for now
    console.log('⚠️  Rating page requires completed order, skipping for now\n');

    // 4. Admin Dashboard
    console.log('📸 Capturing: admin-dashboard.png');
    await page.goto(`${APP_URL}/admin`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);
    
    // Check if login is required
    const loginForm = await page.locator('input[type="password"]').count();
    if (loginForm > 0) {
      console.log('⚠️  Admin login required. Please provide credentials or capture manually.\n');
      console.log('   To capture admin screenshots:');
      console.log('   1. Login to admin panel manually');
      console.log('   2. Take screenshots using browser DevTools (Ctrl+Shift+P → "Capture screenshot")');
      console.log('   3. Save to screenshots/ folder\n');
    } else {
      await page.screenshot({
        path: path.join(SCREENSHOTS_DIR, 'admin-dashboard.png'),
        fullPage: false,
      });
      console.log('✅ admin-dashboard.png saved\n');

      // 5. Admin Menu Management
      console.log('📸 Capturing: admin-menu.png');
      await page.goto(`${APP_URL}/admin/menu`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(2000);
      await page.screenshot({
        path: path.join(SCREENSHOTS_DIR, 'admin-menu.png'),
        fullPage: false,
      });
      console.log('✅ admin-menu.png saved\n');

      // 6. Admin Reports
      console.log('📸 Capturing: admin-reports.png');
      await page.goto(`${APP_URL}/admin/reports`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(2000);
      await page.screenshot({
        path: path.join(SCREENSHOTS_DIR, 'admin-reports.png'),
        fullPage: false,
      });
      console.log('✅ admin-reports.png saved\n');
    }

    // 7. QRIS Payment (requires order creation)
    console.log('📸 Capturing: qris-payment.png');
    console.log('⚠️  QRIS payment requires order creation, skipping for now\n');

    // 8. Payment Confirmation
    console.log('📸 Capturing: payment-confirmed.png');
    console.log('⚠️  Payment confirmation requires completed payment, skipping for now\n');

    console.log('✅ Screenshot capture complete!');
    console.log('\n📝 Summary:');
    console.log('   ✅ menu.png');
    console.log('   ⚠️  order-status.png (requires existing order)');
    console.log('   ⚠️  rating.png (requires completed order)');
    console.log('   ⚠️  admin-dashboard.png (requires login)');
    console.log('   ⚠️  admin-menu.png (requires login)');
    console.log('   ⚠️  admin-reports.png (requires login)');
    console.log('   ⚠️  qris-payment.png (requires order creation)');
    console.log('   ⚠️  payment-confirmed.png (requires payment)');
    console.log('\n💡 Tip: For best results, capture admin and payment screenshots manually:');
    console.log('   1. Open https://order-kopi-app.vercel.app/admin');
    console.log('   2. Login with admin credentials');
    console.log('   3. Use browser DevTools: Ctrl+Shift+P → "Capture screenshot"');
    console.log('   4. Save to screenshots/ folder with correct names');

  } catch (error) {
    console.error('❌ Error capturing screenshots:', error.message);
  } finally {
    await browser.close();
  }
}

// Run the script
captureScreenshots().catch(console.error);

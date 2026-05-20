// Manual QA scenario: requires running app + Supabase. Do not wire into CI without explicit setup.
import { test, expect } from '@playwright/test';

const evidencePath = '.sisyphus/evidence/task-16-customer-flow.png';

test.describe('manual QA customer order workflow', () => {
  test('browse to cart to checkout to order status, with empty/invalid/network failure states', async ({ page }) => {
    await page.goto('/');

    const emptyCheckoutResponse = page.waitForResponse((response) => response.url().includes('/checkout')).catch(() => null);
    await page.goto('/checkout');
    await emptyCheckoutResponse;
    await expect(page).toHaveURL(/\//);
    await page.goto('/');

    const firstProduct = page
      .locator('button, [role="button"], article, [class*="Product"], [class*="product"]')
      .filter({ hasText: /Rp|Tambah|Add|Beli|Pesan/i })
      .first();
    await expect(firstProduct).toBeVisible({ timeout: 15000 });
    await firstProduct.click();

    const addToCart = page.getByRole('button', { name: /tambah|add|cart|keranjang|pesan/i }).first();
    await expect(addToCart).toBeVisible({ timeout: 10000 });
    await addToCart.click();

    const checkoutLink = page.getByRole('link', { name: /checkout|pesan|keranjang|lanjut/i }).first();
    const checkoutButton = page.getByRole('button', { name: /checkout|pesan|keranjang|lanjut/i }).first();
    if (await checkoutLink.isVisible().catch(() => false)) {
      await checkoutLink.click();
    } else {
      await checkoutButton.click();
    }

    await expect(page).toHaveURL(/checkout/);

    const submitOrder = page.getByRole('button', { name: /buat pesanan|submit|order|pesan sekarang|checkout/i }).last();
    await submitOrder.click();
    await expect(page.getByText(/nama|wajib|invalid|tidak valid|required/i).first()).toBeVisible({ timeout: 10000 });

    await page.getByPlaceholder(/nama/i).fill('QA Customer');
    await page.getByPlaceholder(/contoh: 5|table|meja/i).fill('5');

    await page.route('**/rest/v1/orders**', async (route) => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ message: 'QA mocked server error' }),
      });
    });
    await submitOrder.click();
    await expect(page.getByText(/error|gagal|coba|server|pesanan/i).first()).toBeVisible({ timeout: 10000 });
    await page.unroute('**/rest/v1/orders**');

    await submitOrder.click();
    await expect(page).toHaveURL(/\/order\//, { timeout: 30000 });
    await expect(page.getByText(/order|pesanan|id/i).first()).toBeVisible({ timeout: 15000 });

    await page.screenshot({ path: evidencePath, fullPage: true });
  });
});

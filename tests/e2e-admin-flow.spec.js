// Manual QA scenario: requires running app + Supabase. Do not wire into CI without explicit setup.
import { test, expect } from '@playwright/test';

const redirectScreenshot = '.sisyphus/evidence/task-16-admin-redirect.png';
const invalidLoginScreenshot = '.sisyphus/evidence/task-16-admin-invalid-login.png';
const networkErrorScreenshot = '.sisyphus/evidence/task-16-admin-network-error.png';

test.describe('manual QA admin workflow', () => {
  test('unauthorized admin route redirects to login', async ({ page }) => {
    await page.goto('/admin');
    await page.waitForURL(/\/login/, { timeout: 15000 });
    await expect(page).toHaveURL(/\/login/);
    await expect(page.getByRole('heading', { name: /admin login/i })).toBeVisible();
    await expect(page.getByPlaceholder(/admin@email\.com|email/i)).toBeVisible();
    await expect(page.getByPlaceholder(/password|masukkan password/i)).toBeVisible();
    await page.screenshot({ path: redirectScreenshot, fullPage: true });
  });

  test('login form rejects invalid credentials and surfaces error', async ({ page }) => {
    await page.goto('/login');
    await page.getByPlaceholder(/admin@email\.com|email/i).fill('not-an-admin@example.com');
    await page.getByPlaceholder(/password|masukkan password/i).fill('wrong-password-123');
    const submit = page.getByRole('button', { name: /masuk|login|sign in/i }).first();
    await submit.click();
    await expect(page.getByText(/email atau password salah|invalid|salah/i).first()).toBeVisible({ timeout: 15000 });
    await expect(page).toHaveURL(/\/login/);
    await page.screenshot({ path: invalidLoginScreenshot, fullPage: true });
  });

  test('mocked auth network failure surfaces error to admin', async ({ page }) => {
    await page.route('**/auth/v1/token**', async (route) => {
      await route.fulfill({
        status: 503,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'service_unavailable' }),
      });
    });
    await page.goto('/login');
    await page.getByPlaceholder(/admin@email\.com|email/i).fill('admin@example.com');
    await page.getByPlaceholder(/password|masukkan password/i).fill('correct-but-mocked-fail');
    const submit = page.getByRole('button', { name: /masuk|login|sign in/i }).first();
    await submit.click();
    await expect(page.getByText(/email atau password salah|gagal|error|salah/i).first()).toBeVisible({ timeout: 15000 });
    await expect(page).toHaveURL(/\/login/);
    await page.screenshot({ path: networkErrorScreenshot, fullPage: true });
    await page.unroute('**/auth/v1/token**');
  });
});

import { test, expect } from '@playwright/test';

test.describe('Visual Safeguard Banner Environment Simulation', () => {
  test('should NOT show banner in PRODUCTION environment', async ({ page }) => {
    // Note: This relies on the environment variable NOT being 'preview'
    test.skip(
      process.env.NEXT_PUBLIC_VERCEL_ENV === 'preview',
      'Test does not apply when NEXT_PUBLIC_VERCEL_ENV is preview'
    );
    await page.goto('/');
    const banner = page.locator('text=UAT SANDBOX — DO NOT ENTER REAL APPLICANT DATA OR PII');
    await expect(banner).not.toBeVisible();
  });

  test('should show banner in PREVIEW environment', async ({ page }) => {
    // This test will be run with NEXT_PUBLIC_VERCEL_ENV=preview
    test.skip(
      process.env.NEXT_PUBLIC_VERCEL_ENV !== 'preview',
      'Test only applies when NEXT_PUBLIC_VERCEL_ENV is preview'
    );
    await page.goto('/');
    const banner = page.locator('text=UAT SANDBOX — DO NOT ENTER REAL APPLICANT DATA OR PII');
    await expect(banner).toBeVisible();
    await expect(banner).toHaveClass(/bg-red-600/);
  });
});

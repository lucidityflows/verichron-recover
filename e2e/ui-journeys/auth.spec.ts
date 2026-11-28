import { test, expect } from '@playwright/test';

test.describe('Authentication Flow', () => {
  
test.only('should display an error for invalid credentials', async ({ page }) => {
    await page.goto('/login');
    
    // Explicitly wait for the login form to be rendered
    await page.waitForSelector('h1:has-text("Welcome back")');

    await expect(page.locator('h1', { hasText: 'Welcome back' })).toBeVisible();

    await page.fill('input[name="email"]', 'invalid@example.com');
    await page.fill('input[name="password"]', 'wrongpassword');
    await page.click('button[type="submit"]');

    // Expect an error toast to appear, waiting up to 10 seconds
    await page.waitForSelector('div[data-sonner-toast][data-type="error"]', { timeout: 10000 });
    await expect(page.locator('div[data-sonner-toast][data-type="error"]')).toBeVisible();
    
    // User should remain on the login page
    await expect(page).toHaveURL('/login');
  });
});

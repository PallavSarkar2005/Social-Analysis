import { test, expect } from "@playwright/test";

test.describe("Social IQ End-to-End Navigation & Auth Flow", () => {
  const BASE_URL = "http://localhost:5173";

  test("should load landing page successfully", async ({ page }) => {
    await page.goto(BASE_URL);
    
    // Check main title or intro message
    await expect(page).toHaveTitle(/Social IQ/i);
    const loginLink = page.locator("a:has-text('Sign In')");
    await expect(loginLink).toBeVisible();
  });

  test("should navigate to Login, authenticate, and show Dashboard", async ({ page }) => {
    await page.goto(`${BASE_URL}/login`);

    // Fill credentials
    await page.fill("input[type='email']", "tester_e2e@test.com");
    await page.fill("input[type='password']", "Password123!");
    
    // Submit form
    await page.click("button:has-text('Sign In')");

    // Should redirect to dashboard and show user card or profile details
    await expect(page).toHaveURL(`${BASE_URL}/dashboard`);
    const activeRegistryHeader = page.locator("h1:has-text('Dashboard')");
    await expect(activeRegistryHeader).toBeVisible();
  });

  test("should navigate to Analyzer page and find search elements", async ({ page }) => {
    // Navigate straight to analyzer page (after login or mock cookies)
    await page.goto(`${BASE_URL}/analyzer`);

    const inputField = page.locator("input[placeholder*='Paste YouTube']");
    await expect(inputField).toBeVisible();

    const auditButton = page.locator("button:has-text('Run Audit Analysis')");
    await expect(auditButton).toBeVisible();
  });
});

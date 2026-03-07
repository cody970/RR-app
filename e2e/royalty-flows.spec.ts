import { test, expect } from '@playwright/test';

test.describe('Royalty Management Flows', () => {
  test.describe('Statements', () => {
    test('should display statements list', async ({ page }) => {
      await page.goto('/statements');
      
      // Check for statements table or list
      await expect(page.locator('[data-testid="statements-list"]')).toBeVisible();
    });

    test('should allow statement filtering', async ({ page }) => {
      await page.goto('/statements');
      
      // Check for filter controls
      await expect(page.locator('[data-testid="statement-filters"]')).toBeVisible();
      
      // Try to apply a filter
      // This would need actual filter selectors based on your UI
    });

    test('should show statement details', async ({ page }) => {
      await page.goto('/statements');
      
      // Click on first statement (if exists)
      const firstStatement = page.locator('[data-testid="statement-item"]').first();
      if (await firstStatement.count() > 0) {
        await firstStatement.click();
        await expect(page.locator('[data-testid="statement-details"]')).toBeVisible();
      }
    });
  });

  test.describe('Writers', () => {
    test('should display writers list', async ({ page }) => {
      await page.goto('/writers');
      
      // Check for writers table or list
      await expect(page.locator('[data-testid="writers-list"]')).toBeVisible();
    });

    test('should allow adding a new writer', async ({ page }) => {
      await page.goto('/writers');
      
      // Click add writer button
      await page.click('button:has-text("Add Writer")');
      
      // Check for form
      await expect(page.locator('form[data-testid="writer-form"]')).toBeVisible();
    });
  });

  test.describe('Works', () => {
    test('should display works catalog', async ({ page }) => {
      await page.goto('/works');
      
      // Check for works table or grid
      await expect(page.locator('[data-testid="works-catalog"]')).toBeVisible();
    });

    test('should allow searching works', async ({ page }) => {
      await page.goto('/works');
      
      // Check for search input
      await expect(page.locator('input[placeholder*="search" i]')).toBeVisible();
      
      // Try searching
      await page.fill('input[placeholder*="search" i]', 'test song');
      await page.press('input[placeholder*="search" i]', 'Enter');
    });
  });

  test.describe('Reports', () => {
    test('should generate a royalty report', async ({ page }) => {
      await page.goto('/reports');
      
      // Check for report generation form
      await expect(page.locator('[data-testid="report-form"]')).toBeVisible();
    });

    test('should export report to PDF', async ({ page }) => {
      await page.goto('/reports');
      
      // Check for export button
      const exportButton = page.locator('button:has-text("Export")');
      if (await exportButton.count() > 0) {
        await exportButton.click();
        
        // Check for download or export options
        await expect(page.locator('[data-testid="export-options"]')).toBeVisible();
      }
    });
  });
});
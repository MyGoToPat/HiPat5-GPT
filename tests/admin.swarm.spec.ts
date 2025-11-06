import { test, expect } from '@playwright/test';
import path from 'path';

/**
 * Admin Swarm UI Tests
 * 
 * Prerequisites:
 * 1. Install Playwright: npm install -D @playwright/test
 * 2. Install browsers: npx playwright install
 * 3. Set ADMIN_EMAIL and ADMIN_PASSWORD in .env or environment
 * 4. Ensure dev server is running or update baseURL in playwright.config.ts
 */

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@example.com';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'password';
const BASE_URL = process.env.BASE_URL || 'http://localhost:5173';

test.describe('Admin Swarm Management', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to login page
    await page.goto(`${BASE_URL}/auth/login`);
    
    // Login as admin (adjust selectors based on your login form)
    await page.fill('input[type="email"]', ADMIN_EMAIL);
    await page.fill('input[type="password"]', ADMIN_PASSWORD);
    await page.click('button[type="submit"]');
    
    // Wait for navigation to admin area
    await page.waitForURL(/\/admin/);
  });

  test('PERSONALITY_ROUTER row is visible in Personality Swarm table', async ({ page }) => {
    // Navigate to Swarms page
    await page.goto(`${BASE_URL}/admin/swarms`);
    
    // Wait for Personality Swarm section to load
    await page.waitForSelector('[data-testid="agent-PERSONALITY_ROUTER"]', { timeout: 10000 });
    
    // Assert router row exists
    const routerRow = page.locator('[data-testid="agent-PERSONALITY_ROUTER"]');
    await expect(routerRow).toBeVisible();
    
    // Assert it shows "Intelligent Router" name
    await expect(routerRow.locator('text=Intelligent Router')).toBeVisible();
    
    // Assert phase is PRE
    await expect(routerRow.locator('text=PRE')).toBeVisible();
    
    // Assert order is 15 (between Voice=10 and Audience=20)
    const orderCell = routerRow.locator('td').nth(4); // Order column
    await expect(orderCell).toContainText('15');
  });

  test('Edit PERSONALITY_CORE_RESPONDER prompt and persist changes', async ({ page }) => {
    await page.goto(`${BASE_URL}/admin/swarms`);
    
    // Wait for table to load
    await page.waitForSelector('[data-testid="agent-PERSONALITY_CORE_RESPONDER"]', { timeout: 10000 });
    
    // Click Edit button for PERSONALITY_CORE_RESPONDER
    const editButton = page.locator('[data-testid="edit-PERSONALITY_CORE_RESPONDER"]');
    await editButton.click();
    
    // Wait for modal to open
    await page.waitForSelector('[data-testid="prompt-editor"]');
    
    // Get current content
    const editor = page.locator('[data-testid="prompt-editor"]');
    const currentContent = await editor.inputValue();
    
    // Change "1–2" to "1–3" (or append if not present)
    const newContent = currentContent.includes('1–2') 
      ? currentContent.replace('1–2', '1–3')
      : currentContent + '\n# 1–3';
    await editor.fill(newContent);
    
    // Save using data-testid
    await page.click('[data-testid="prompt-save"]');
    
    // Wait for success toast
    await page.waitForSelector('text=Prompt updated', { timeout: 5000 });
    
    // Wait for toast to disappear and UI to settle
    await page.waitForTimeout(1000);
    
    // Reload page to verify persistence
    await page.reload();
    await page.waitForLoadState('networkidle');
    
    // Wait for table to reload
    await page.waitForSelector('[data-testid="agent-PERSONALITY_CORE_RESPONDER"]', { timeout: 10000 });
    
    // Reopen edit modal
    await page.click('[data-testid="edit-PERSONALITY_CORE_RESPONDER"]');
    await page.waitForSelector('[data-testid="prompt-editor"]');
    
    // Assert change persisted
    const savedContent = await page.locator('[data-testid="prompt-editor"]').inputValue();
    expect(savedContent).toContain('1–3');
    
    // Close modal
    await page.click('button:has-text("Cancel")');
  });

  test('Add Agent button creates new agent and appears in table', async ({ page }) => {
    await page.goto(`${BASE_URL}/admin/swarms`);
    
    // Click Add Agent button
    await page.click('[data-testid="add-agent"]');
    
    // Wait for modal
    await page.waitForSelector('text=Add New Agent');
    
    // Fill form
    await page.fill('input[placeholder="PERSONALITY_ROUTER"]', 'PERSONALITY_DUMMY_TEST');
    await page.fill('input[placeholder="Intelligent Router"]', 'Test Dummy Agent');
    await page.selectOption('select', 'pre');
    await page.fill('input[type="number"]', '99');
    await page.check('input[type="checkbox"]');
    await page.fill('textarea', 'This is a test agent prompt for Playwright testing.');
    
    // Submit
    await page.click('button:has-text("Add Agent")');
    
    // Wait for success toast
    await page.waitForSelector('text=Agent added successfully', { timeout: 5000 });
    
    // Verify row appears
    const newRow = page.locator('[data-testid="agent-PERSONALITY_DUMMY_TEST"]');
    await expect(newRow).toBeVisible({ timeout: 5000 });
    
    // Verify order is 99
    await expect(newRow.locator('td').nth(4)).toContainText('99');
    
    // Cleanup: Disable and remove from config
    // Note: This requires a DELETE endpoint or manual DB cleanup
    // For now, we'll just disable it
    const toggleButton = newRow.locator('button').first();
    await toggleButton.click();
    await page.waitForSelector('text=Agent disabled');
  });

  test('Router presence verified in console logs', async ({ page }) => {
    // Enable console log capture
    const logs: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'info' && msg.text().includes('swarm-loader')) {
        logs.push(msg.text());
      }
    });
    
    // Navigate to chat page to trigger swarm loader
    await page.goto(`${BASE_URL}/chat`);
    
    // Wait for any swarm-loader log
    await page.waitForTimeout(2000);
    
    // Check logs contain router presence info
    const routerLog = logs.find(log => log.includes('hasRouter'));
    expect(routerLog).toBeDefined();
    expect(routerLog).toContain('hasRouter=true');
  });

  test('Screenshot: Personality Swarm with Router highlighted', async ({ page }) => {
    await page.goto(`${BASE_URL}/admin/swarms`);
    
    // Wait for router row
    await page.waitForSelector('[data-testid="agent-PERSONALITY_ROUTER"]');
    
    // Highlight router row
    await page.locator('[data-testid="agent-PERSONALITY_ROUTER"]').evaluate(el => {
      (el as HTMLElement).style.border = '3px solid red';
      (el as HTMLElement).style.backgroundColor = '#fff3cd';
    });
    
    // Take screenshot
    const screenshotPath = path.join(process.cwd(), 'playwright-report', 'admin-swarm-router.png');
    await page.screenshot({ 
      path: screenshotPath,
      fullPage: true 
    });
    
    console.log(`Screenshot saved to: ${screenshotPath}`);
  });
});


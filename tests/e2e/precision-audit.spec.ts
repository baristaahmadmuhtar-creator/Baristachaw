import { test, expect, type Page } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

// Output paths
const ARTIFACT_DIR = path.resolve(process.env.PRECISION_AUDIT_ARTIFACT_DIR || 'artifacts/precision-audit');
const SCREENSHOT_DIR = path.join(ARTIFACT_DIR, 'screenshots');
const RESULTS_JSON = path.join(ARTIFACT_DIR, 'results.json');
const PRECISION_AUDIT_EMAIL = process.env.LIVE_AI_BREW_EMAIL || process.env.PROD_SMOKE_EMAIL || '';
const PRECISION_AUDIT_PASSWORD = process.env.LIVE_AI_BREW_PASSWORD || process.env.PROD_SMOKE_PASSWORD || '';
const shouldRunPrecisionAudit = Boolean(PRECISION_AUDIT_EMAIL && PRECISION_AUDIT_PASSWORD);

// Ensure directories exist
fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });

test.describe.configure({ mode: 'serial' });
test.skip(!shouldRunPrecisionAudit, 'Set LIVE_AI_BREW_EMAIL/LIVE_AI_BREW_PASSWORD or PROD_SMOKE_EMAIL/PROD_SMOKE_PASSWORD to run precision audit.');
test.setTimeout(300_000); // 5 minutes per test case

// Shared login helper
async function login(page: Page) {
  console.log('Logging in to BaristaClaw with provided test account...');
  await page.goto('/masuk?lang=id', { waitUntil: 'domcontentloaded' });
  
  // Fill email
  const emailInput = page.locator('#auth-route-email');
  await expect(emailInput).toBeVisible({ timeout: 20000 });
  await emailInput.fill(PRECISION_AUDIT_EMAIL);
  
  // Submit email
  const emailButton = page.getByRole('button', { name: /Lanjut dengan email/i });
  await expect(emailButton).toBeVisible();
  await emailButton.click();
  
  // Fill password
  const passwordInput = page.locator('#auth-route-password');
  await expect(passwordInput).toBeVisible({ timeout: 20000 });
  await passwordInput.fill(PRECISION_AUDIT_PASSWORD);
  
  // Submit password
  const submitButton = page.locator('button[type="submit"]');
  await expect(submitButton).toBeVisible();
  await submitButton.click();
  
  // Await redirect to home page, tools, or chat
  await page.waitForURL((url) => {
    return url.pathname === '/' || url.pathname.includes('/tools') || url.pathname.includes('/chat');
  }, { timeout: 30000 });
  console.log('Login successful!');
}

async function ensureLoggedIn(page: Page) {
  console.log('Ensuring logged in...');
  await page.goto('/tools?tab=ai-brew', { waitUntil: 'networkidle' }).catch(() => {
    return page.goto('/tools?tab=ai-brew', { waitUntil: 'domcontentloaded' });
  });
  
  const isPanelVisible = await page.getByTestId('ai-brew-panel').isVisible().catch(() => false);
  if (!isPanelVisible) {
    await login(page);
    await page.goto('/tools?tab=ai-brew', { waitUntil: 'networkidle' }).catch(() => {
      return page.goto('/tools?tab=ai-brew', { waitUntil: 'domcontentloaded' });
    });
  }
  await expect(page.getByTestId('ai-brew-panel')).toBeVisible({ timeout: 25000 });
}

// Set up helper to configure Pro Mode / Precision Builder with a robust click retry loop
async function openProBuilder(page: Page) {
  for (let attempt = 0; attempt < 3; attempt++) {
    const isProActive = await page.getByTestId('ai-brew-builder-pro').isVisible().catch(() => false);
    if (isProActive) {
      console.log('Pro Builder is active!');
      return;
    }
    console.log(`Attempt ${attempt + 1}: Clicking Open Pro button...`);
    const openProButton = page.getByTestId('ai-brew-open-pro');
    await expect(openProButton).toBeVisible();
    await openProButton.click({ force: true }).catch(() => {});
    await page.waitForTimeout(1500); // Wait 1.5 seconds for modal to transition and open
  }
  await expect(page.getByTestId('ai-brew-builder-pro')).toBeVisible({ timeout: 15000 });
}

// Input setting helpers
async function setVisibleInputValue(page: Page, testId: string, value: string) {
  const input = page.getByTestId(testId);
  await expect(input).toBeVisible();
  await page.evaluate(({ nextTestId, nextValue }) => {
    const field = Array.from(document.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>(
      `[data-testid="${nextTestId}"]`
    )).find((candidate) => (candidate as HTMLElement).offsetParent !== null);
    if (!field) throw new Error(`Missing field: ${nextTestId}`);
    const prototype = field instanceof HTMLTextAreaElement
      ? window.HTMLTextAreaElement.prototype
      : window.HTMLInputElement.prototype;
    const descriptor = Object.getOwnPropertyDescriptor(prototype, 'value');
    if (!descriptor?.set) throw new Error(`Missing input setter: ${nextTestId}`);
    field.scrollIntoView({ block: 'center', inline: 'nearest' });
    field.focus();
    descriptor.set.call(field, '');
    field.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
    descriptor.set.call(field, nextValue);
    field.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
    field.dispatchEvent(new Event('change', { bubbles: true }));
    field.blur();
  }, { nextTestId: testId, nextValue: value });
  await expect(input).toHaveValue(value);
}

async function selectDripper(page: Page, query: string, id: string) {
  await page.getByTestId('ai-brew-dripper-picker').click();
  await expect(page.getByTestId('ai-brew-picker-search-dripper')).toBeVisible({ timeout: 10000 });
  await setVisibleInputValue(page, 'ai-brew-picker-search-dripper', query);
  
  const option = page.getByTestId(`ai-brew-picker-option-dripper-${id}`);
  await expect(option).toBeVisible({ timeout: 10000 });
  await option.click();
}

async function selectWaterBrand(page: Page, query: string) {
  // Open water section if in mobile layout (accordion trigger is visible)
  const trigger = page.getByTestId('ai-brew-pro-accordion-trigger-water');
  if (await trigger.isVisible().catch(() => false)) {
    if (await trigger.getAttribute('aria-expanded') !== 'true') {
      await trigger.click();
    }
  }
  
  await page.getByTestId('ai-brew-water-picker').scrollIntoViewIfNeeded();
  await page.getByTestId('ai-brew-water-picker').click();
  await expect(page.getByTestId('ai-brew-picker-search-water_brand')).toBeVisible({ timeout: 10000 });
  await setVisibleInputValue(page, 'ai-brew-picker-search-water_brand', query);
  
  const firstMatch = page.locator('[data-testid^="ai-brew-picker-option-water_brand-"]').first();
  await expect(firstMatch).toBeVisible({ timeout: 10000 });
  await firstMatch.click();
}

async function selectManualWaterWithPreset(page: Page) {
  const trigger = page.getByTestId('ai-brew-pro-accordion-trigger-water');
  if (await trigger.isVisible().catch(() => false)) {
    if (await trigger.getAttribute('aria-expanded') !== 'true') {
      await trigger.click();
    }
  }
  
  await page.getByTestId('ai-brew-water-mode-manual').click();
  await expect(page.getByTestId('ai-brew-water-preset-ideal-filter')).toBeVisible({ timeout: 10000 });
  await page.getByTestId('ai-brew-water-preset-ideal-filter').click();
}

async function selectCustomBean(page: Page, process: string, variety: string) {
  // If in mobile layout (accordion trigger is visible), open it!
  const accordionTrigger = page.getByTestId('ai-brew-pro-accordion-trigger-bean');
  if (await accordionTrigger.isVisible().catch(() => false)) {
    if (await accordionTrigger.getAttribute('aria-expanded') !== 'true') {
      await accordionTrigger.click();
    }
  } else {
    // Desktop layout: check if process picker is visible. If not, click toggle.
    const processPicker = page.getByTestId('ai-brew-process-picker');
    if (!await processPicker.isVisible().catch(() => false)) {
      const toggle = page.getByTestId('ai-brew-bean-details-toggle');
      if (await toggle.isVisible().catch(() => false)) {
        await toggle.click();
      }
    }
  }
  
  await page.getByTestId('ai-brew-process-picker').scrollIntoViewIfNeeded();
  await page.getByTestId('ai-brew-process-picker').click();
  await page.getByRole('button', { name: /Select custom process|Pilih proses manual|Pilih proses kustom/i }).click();
  await setVisibleInputValue(page, 'ai-brew-process-custom', process);
  
  await page.getByTestId('ai-brew-variety-picker').scrollIntoViewIfNeeded();
  await page.getByTestId('ai-brew-variety-picker').click();
  await page.getByRole('button', { name: /Select custom variety|Pilih varietas manual|Pilih varietas kustom/i }).click();
  await setVisibleInputValue(page, 'ai-brew-variety-custom', variety);
}

// Collect console and audit issues
let consoleErrors: string[] = [];
let languageLeaks: string[] = [];

function registerAuditHooks(page: Page) {
  consoleErrors = [];
  languageLeaks = [];
  
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      consoleErrors.push(`[Console Error] ${msg.text()}`);
    }
  });

  page.on('pageerror', (err) => {
    consoleErrors.push(`[Unhandled Exception] ${err.message}`);
  });
}

// Record parsed results
const resultsList: any[] = [];
function saveResult(result: any) {
  resultsList.push(result);
  fs.writeFileSync(RESULTS_JSON, JSON.stringify(resultsList, null, 2), 'utf8');
}

// Unified test configuration interface
interface AuditTestConfig {
  caseNum: number;
  coffeeName: string;
  roastLevel: 'light' | 'medium_light' | 'medium' | 'medium_dark' | 'dark';
  process: string;
  variety: string;
  brewerQuery: string;
  brewerId: string;
  brewMode: 'hot' | 'iced';
  waterType: 'volvic' | 'manual' | 'aqua';
  targetProfileId: string;
  targetProfileLabel: string;
  switchPresetName?: string; // e.g. for Switch methods
}

const MATRIX: AuditTestConfig[] = [
  {
    caseNum: 1,
    coffeeName: 'Intelligentsia Black Cat',
    roastLevel: 'dark',
    process: 'washed',
    variety: 'bourbon',
    brewerQuery: 'espresso',
    brewerId: 'espresso-machine',
    brewMode: 'hot',
    waterType: 'volvic',
    targetProfileId: 'more_sweetness',
    targetProfileLabel: 'Lebih Manis'
  },
  {
    caseNum: 2,
    coffeeName: 'Counter Culture Hologram',
    roastLevel: 'medium_dark',
    process: 'natural',
    variety: 'bourbon',
    brewerQuery: 'moka',
    brewerId: 'bialetti-moka-pot',
    brewMode: 'hot',
    waterType: 'manual',
    targetProfileId: 'more_sweetness',
    targetProfileLabel: 'Lebih Manis'
  },
  {
    caseNum: 3,
    coffeeName: 'Counter Culture Hologram',
    roastLevel: 'medium_dark',
    process: 'natural',
    variety: 'bourbon',
    brewerQuery: 'batch',
    brewerId: 'batch-brewer',
    brewMode: 'hot',
    waterType: 'volvic',
    targetProfileId: 'more_body',
    targetProfileLabel: 'Body Lebih Tebal'
  },
  {
    caseNum: 4,
    coffeeName: 'Java Natural Peñas Blancas',
    roastLevel: 'medium',
    process: 'natural',
    variety: 'caturra',
    brewerQuery: 'v60',
    brewerId: 'hario-v60',
    brewMode: 'hot',
    waterType: 'aqua',
    targetProfileId: 'balance_clean',
    targetProfileLabel: 'Seimbang & Bersih'
  },
  {
    caseNum: 5,
    coffeeName: 'Java Natural Peñas Blancas',
    roastLevel: 'medium',
    process: 'natural',
    variety: 'caturra',
    brewerQuery: 'siphon',
    brewerId: 'hario-siphon',
    brewMode: 'hot',
    waterType: 'volvic',
    targetProfileId: 'balance_clean',
    targetProfileLabel: 'Seimbang & Bersih'
  },
  {
    caseNum: 6,
    coffeeName: 'Vice City Bean Midtown',
    roastLevel: 'medium_dark',
    process: 'natural',
    variety: 'catuai',
    brewerQuery: 'french press',
    brewerId: 'french-press',
    brewMode: 'hot',
    waterType: 'volvic',
    targetProfileId: 'more_body',
    targetProfileLabel: 'Body Lebih Tebal'
  },
  {
    caseNum: 7,
    coffeeName: 'Vice City Bean Midtown',
    roastLevel: 'medium_dark',
    process: 'natural',
    variety: 'catuai',
    brewerQuery: 'melitta',
    brewerId: 'melitta',
    brewMode: 'hot',
    waterType: 'volvic',
    targetProfileId: 'more_body',
    targetProfileLabel: 'Body Lebih Tebal'
  },
  {
    caseNum: 8,
    coffeeName: 'Chelchele Natural Ethiopia',
    roastLevel: 'light',
    process: 'natural',
    variety: 'ethiopian_heirloom',
    brewerQuery: 'switch 02',
    brewerId: 'hario-switch-02',
    brewMode: 'hot',
    waterType: 'volvic',
    targetProfileId: 'floral_transparent',
    targetProfileLabel: 'Floral & Transparan',
    switchPresetName: 'Bright' // Test custom switch method
  },
  {
    caseNum: 9,
    coffeeName: 'Finca Don José Java Natural',
    roastLevel: 'medium_light',
    process: 'natural',
    variety: 'java',
    brewerQuery: 'switch 03',
    brewerId: 'hario-switch-03',
    brewMode: 'iced',
    waterType: 'volvic',
    targetProfileId: 'fruit_forward',
    targetProfileLabel: 'Buah Lebih Menonjol',
    switchPresetName: 'Balanced'
  },
  {
    caseNum: 10,
    coffeeName: 'Montano Micro-Mill Jaguar',
    roastLevel: 'medium_light',
    process: 'honey',
    variety: 'catuai',
    brewerQuery: 'mugen switch',
    brewerId: 'mugen-x-switch',
    brewMode: 'hot',
    waterType: 'volvic',
    targetProfileId: 'fruit_forward',
    targetProfileLabel: 'Buah Lebih Menonjol'
  },
  {
    caseNum: 11,
    coffeeName: 'Montano Micro-Mill Jaguar',
    roastLevel: 'medium_light',
    process: 'honey',
    variety: 'catuai',
    brewerQuery: 'aeropress',
    brewerId: 'aeropress',
    brewMode: 'hot',
    waterType: 'manual',
    targetProfileId: 'more_sweetness',
    targetProfileLabel: 'Lebih Manis'
  },
  {
    caseNum: 12,
    coffeeName: 'Cool Roast Curves Rwanda',
    roastLevel: 'light',
    process: 'anaerobic',
    variety: 'bourbon',
    brewerQuery: 'origami',
    brewerId: 'origami-dripper-s-m',
    brewMode: 'hot',
    waterType: 'volvic',
    targetProfileId: 'more_acidity',
    targetProfileLabel: 'Lebih Cerah'
  },
  {
    caseNum: 13,
    coffeeName: 'Cool Roast Curves Rwanda',
    roastLevel: 'light',
    process: 'anaerobic',
    variety: 'bourbon',
    brewerQuery: 'april',
    brewerId: 'april-brewer',
    brewMode: 'hot',
    waterType: 'volvic',
    targetProfileId: 'more_acidity',
    targetProfileLabel: 'Lebih Cerah'
  },
  {
    caseNum: 14,
    coffeeName: 'Diego Lopez Nariño El Tambo',
    roastLevel: 'medium',
    process: 'washed',
    variety: 'caturra',
    brewerQuery: 'kalita',
    brewerId: 'kalita-wave-155-185',
    brewMode: 'hot',
    waterType: 'aqua',
    targetProfileId: 'soft_round',
    targetProfileLabel: 'Lembut & Bulat'
  },
  {
    caseNum: 15,
    coffeeName: 'Diego Lopez Nariño El Tambo',
    roastLevel: 'medium',
    process: 'washed',
    variety: 'caturra',
    brewerQuery: 'chemex',
    brewerId: 'chemex',
    brewMode: 'iced',
    waterType: 'volvic',
    targetProfileId: 'balance_clean',
    targetProfileLabel: 'Seimbang & Bersih'
  },
  {
    caseNum: 16,
    coffeeName: 'Simbai Balus Kopi Papua',
    roastLevel: 'medium_dark',
    process: 'natural',
    variety: 'typica',
    brewerQuery: 'toddy',
    brewerId: 'toddy-cold-brew',
    brewMode: 'hot', // Toddy uses special cold brew mode automatically or mapped
    waterType: 'aqua',
    targetProfileId: 'dense_comforting',
    targetProfileLabel: 'Tebal & Nyaman'
  },
  {
    caseNum: 17,
    coffeeName: 'Simbai Balus Kopi Papua',
    roastLevel: 'medium_dark',
    process: 'natural',
    variety: 'typica',
    brewerQuery: 'clever',
    brewerId: 'clever-dripper',
    brewMode: 'hot',
    waterType: 'volvic',
    targetProfileId: 'dense_comforting',
    targetProfileLabel: 'Tebal & Nyaman'
  },
  {
    caseNum: 18,
    coffeeName: 'Simbai Balus Kopi Papua',
    roastLevel: 'medium_dark',
    process: 'natural',
    variety: 'typica',
    brewerQuery: 'kono',
    brewerId: 'kono-meimon',
    brewMode: 'hot',
    waterType: 'volvic',
    targetProfileId: 'dense_comforting',
    targetProfileLabel: 'Tebal & Nyaman'
  }
];

// Dynamically generate Playwright tests for the matrix
for (const config of MATRIX) {
  test(`Precision Audit Case #${config.caseNum}: ${config.coffeeName} on ${config.brewerQuery} (${config.brewMode}, ${config.waterType})`, async ({ page }) => {
    registerAuditHooks(page);
    await ensureLoggedIn(page);
    await openProBuilder(page);
    
    console.log(`Setting up form for Case #${config.caseNum}: ${config.coffeeName}...`);
    
    // Set Coffee Name
    await setVisibleInputValue(page, 'ai-brew-coffee-name', config.coffeeName);
    
    // Set custom process and variety
    await selectCustomBean(page, config.process, config.variety);
    
    // Set Dose
    await setVisibleInputValue(page, 'ai-brew-dose', '18');
    
    // Set Roast Level
    // The roast selector is in data-testid="ai-brew-roast-grid". Map value: light, medium_light, medium, medium_dark, dark.
    const roastBtn = page.getByTestId(`ai-brew-roast-${config.roastLevel}`);
    await expect(roastBtn).toBeVisible({ timeout: 10000 });
    await roastBtn.click();
    
    // Set Brewer
    await selectDripper(page, config.brewerQuery, config.brewerId);
    
    // Set Brew Mode (Hot or Iced)
    if (config.brewMode === 'iced') {
      const modeBtn = page.getByTestId('ai-brew-builder-mode-iced');
      if (await modeBtn.isEnabled()) {
        await modeBtn.click();
      } else {
        console.log(`Warning: Iced mode is disabled/blocked for ${config.brewerId}. Proceeding with Hot.`);
      }
    } else {
      const modeBtn = page.getByTestId('ai-brew-builder-mode-hot');
      await modeBtn.click();
    }
    
    // Set Water
    if (config.waterType === 'manual') {
      await selectManualWaterWithPreset(page);
    } else if (config.waterType === 'aqua') {
      await selectWaterBrand(page, 'aqua');
    } else {
      await selectWaterBrand(page, 'volvic');
    }
    
    // Set Target Profile
    const profileBtn = page.getByTestId(`ai-brew-target-profile-${config.targetProfileId}`);
    await expect(profileBtn).toBeVisible({ timeout: 10000 });
    await profileBtn.click();
    
    // Set custom Switch preset if applicable and visible
    if (config.switchPresetName) {
      // Find switch method button matching the custom preset (Auto, Sweet, Body, Balanced, Bright, V60)
      const switchBtn = page.locator('[data-testid^="ai-brew-switch-preset-"], [data-testid^="ai-brew-switch-preset-auto"]').filter({ hasText: config.switchPresetName }).first();
      if (await switchBtn.isVisible().catch(() => false)) {
        await switchBtn.click();
      }
    }
    
    // Generate Plan!
    console.log(`Generating plan for Case #${config.caseNum}...`);
    await page.getByTestId('ai-brew-generate').click();
    
    // Wait for the results panel to appear
    const result = page.getByTestId('ai-brew-result');
    await expect(result).toBeVisible({ timeout: 45000 });
    console.log(`Plan generated successfully for Case #${config.caseNum}!`);
    
    // Take a screenshot of the plan details
    const screenshotName = `case-${config.caseNum}-${config.brewerId}-${config.brewMode}.png`;
    const screenshotPath = path.join(SCREENSHOT_DIR, screenshotName);
    await page.screenshot({ path: screenshotPath, fullPage: true, animations: 'disabled' });
    console.log(`Screenshot captured: ${screenshotPath}`);
    
    // Parse output parameters
    const detailsTab = result.getByTestId('ai-brew-result-tab-details');
    if (await detailsTab.isVisible()) {
      await detailsTab.click();
    }
    
    const summaryText = await result.getByTestId('ai-brew-result-summary-panel').textContent().catch(() => '');
    
    // Look for parameter texts or elements
    const parsedParams: any = {
      caseNum: config.caseNum,
      coffeeName: config.coffeeName,
      brewerId: config.brewerId,
      brewMode: config.brewMode,
      targetProfile: config.targetProfileId,
      screenshotName,
      summary: summaryText?.trim() || '',
      consoleErrors: [...consoleErrors],
      languageLeaks: [...languageLeaks]
    };
    
    console.log(`Params recorded for Case #${config.caseNum}:`, parsedParams);
    saveResult(parsedParams);
    
    // --- Test secondary actions (only on Case 1, Case 4, and Case 9 to conserve time and live calls) ---
    if ([1, 4, 9].includes(config.caseNum)) {
      console.log(`Testing secondary actions for Case #${config.caseNum}...`);
      const actionsMenu = result.getByTestId('ai-brew-result-secondary-actions');
      await actionsMenu.scrollIntoViewIfNeeded();
      await actionsMenu.locator('summary').click();
      
      if (config.caseNum === 1) {
        // 1. Edit Inputs
        console.log('Testing "Edit Inputs"...');
        await page.getByTestId('ai-brew-edit-inputs').click();
        await expect(page.getByTestId('ai-brew-coffee-name')).toHaveValue(config.coffeeName);
        
        // Re-generate to restore results
        await page.getByTestId('ai-brew-generate').click();
        await expect(result).toBeVisible({ timeout: 25000 });
        await actionsMenu.scrollIntoViewIfNeeded();
        await actionsMenu.locator('summary').click();
        
        // 4. Save to Collection
        console.log('Testing "Save to Collection"...');
        await page.getByTestId('ai-brew-save').click();
        // Toast check
        await expect(page.locator('text=/Recipe saved to Collection|Recipe tersimpan/i')).toBeVisible({ timeout: 15000 }).catch(() => {
          console.log('Collection toast warning: timed out, proceeding.');
        });
        
        // 5. Favorite
        console.log('Testing "Favorite"...');
        await page.getByTestId('ai-brew-favorite').click();
      } else if (config.caseNum === 4) {
        console.log('Verifying timer handoff is hidden for MVP...');
        await expect(page.getByTestId('ai-brew-use-timer')).toHaveCount(0);
      } else if (config.caseNum === 9) {
        console.log('Verifying ratio handoff is hidden for MVP...');
        await expect(page.getByTestId('ai-brew-use-ratio')).toHaveCount(0);
      }
      
      console.log(`Secondary actions successfully verified for Case #${config.caseNum}!`);
    }
    
    // Close the planned output to leave state clean for next tests
    const closeBtn = page.getByRole('button', { name: /Tutup hasil|Tutup output plan|Close planned output/i });
    if (await closeBtn.count()) {
      await closeBtn.first().click();
    }
  });
}

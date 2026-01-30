import { test, expect } from '../fixtures/test-fixtures';

test.describe('Police Dashboard', () => {
  test.describe('Page Load', () => {
    test('loads without server errors', async ({ page }) => {
      const errors: string[] = [];
      page.on('pageerror', (err) => errors.push(err.message));

      const response = await page.goto('/police-dashboard', { waitUntil: 'domcontentloaded' });

      expect(response?.status()).toBeLessThan(500);
    });

    test('has the correct page title', async ({ page }) => {
      await page.goto('/police-dashboard', { waitUntil: 'domcontentloaded' });

      await expect(page).toHaveTitle(/Police Dashboard/);
    });

    test('renders the body with content', async ({ page }) => {
      await page.goto('/police-dashboard', { waitUntil: 'domcontentloaded' });

      const body = page.locator('body');
      await expect(body).not.toBeEmpty();
    });
  });

  test.describe('Navigation', () => {
    test('displays the sidebar navigation', async ({ page }) => {
      await page.goto('/police-dashboard', { waitUntil: 'domcontentloaded' });

      const sidebar = page.locator('#sidebar');
      await expect(sidebar).toBeAttached();
    });

    test('displays the top navigation bar', async ({ page }) => {
      await page.goto('/police-dashboard', { waitUntil: 'domcontentloaded' });

      const topNav = page.locator('#topNav');
      await expect(topNav).toBeAttached();
    });

    test('displays Police Operations header', async ({ page }) => {
      await page.goto('/police-dashboard', { waitUntil: 'domcontentloaded' });

      const header = page.locator('a[href="/police-dashboard"]').first();
      await expect(header).toBeAttached();
      await expect(header).toContainText('Police Operations');
    });

    test('has a sidebar collapse button', async ({ page }) => {
      await page.goto('/police-dashboard', { waitUntil: 'domcontentloaded' });

      const collapseBtn = page.locator('#sidebarCollapse');
      await expect(collapseBtn).toBeAttached();
    });

    test('community dashboard link is present in header', async ({ page }) => {
      await page.goto('/police-dashboard', { waitUntil: 'domcontentloaded' });

      const communityLink = page.locator('a[href="/community-dashboard"]').first();
      await expect(communityLink).toBeAttached();
    });

    test('community name is displayed', async ({ page }) => {
      await page.goto('/police-dashboard', { waitUntil: 'domcontentloaded' });

      const communityName = page.locator('#community-name');
      await expect(communityName).toBeAttached();
    });
  });

  test.describe('Search Section', () => {
    test('sidebar has a search section', async ({ page }) => {
      await page.goto('/police-dashboard', { waitUntil: 'domcontentloaded' });

      const searchToggle = page.locator('#toggleSearch');
      await expect(searchToggle).toBeAttached();
    });

    test('has a hidden search type input', async ({ page }) => {
      await page.goto('/police-dashboard', { waitUntil: 'domcontentloaded' });

      const searchType = page.locator('#searchType');
      await expect(searchType).toBeAttached();
      await expect(searchType).toHaveValue('Civilian');
    });

    test('has Name Database link in sidebar', async ({ page }) => {
      await page.goto('/police-dashboard', { waitUntil: 'domcontentloaded' });

      const nameDbLink = page.locator('#sidebar').getByText('Name Database');
      await expect(nameDbLink).toBeAttached();
    });

    test('has Plate Database link in sidebar', async ({ page }) => {
      await page.goto('/police-dashboard', { waitUntil: 'domcontentloaded' });

      const plateDbLink = page.locator('#sidebar').getByText('Plate Database');
      await expect(plateDbLink).toBeAttached();
    });

    test('has Firearm Database link in sidebar', async ({ page }) => {
      await page.goto('/police-dashboard', { waitUntil: 'domcontentloaded' });

      const firearmDbLink = page.locator('#sidebar').getByText('Firearm Database');
      await expect(firearmDbLink).toBeAttached();
    });
  });

  test.describe('Utilities Section', () => {
    test('sidebar has a utilities section', async ({ page }) => {
      await page.goto('/police-dashboard', { waitUntil: 'domcontentloaded' });

      const utilitiesToggle = page.locator('#toggleUtilities');
      await expect(utilitiesToggle).toBeAttached();
    });

    test('has Create BOLO link in sidebar', async ({ page }) => {
      await page.goto('/police-dashboard', { waitUntil: 'domcontentloaded' });

      const boloLink = page.locator('#sidebar').getByText('Create BOLO').first();
      await expect(boloLink).toBeAttached();
    });

    test('has Notepad link in sidebar', async ({ page }) => {
      await page.goto('/police-dashboard', { waitUntil: 'domcontentloaded' });

      const notepadLink = page.locator('#sidebar').getByText('Notepad');
      await expect(notepadLink).toBeAttached();
    });
  });

  test.describe('Status Panel', () => {
    test('displays the status panel', async ({ page }) => {
      await page.goto('/police-dashboard', { waitUntil: 'domcontentloaded' });

      const statusPanel = page.locator('#statusPanel');
      await expect(statusPanel).toBeAttached();
    });

    test('shows the current status badge', async ({ page }) => {
      await page.goto('/police-dashboard', { waitUntil: 'domcontentloaded' });

      const statusBadge = page.locator('#currentStatusBadge');
      await expect(statusBadge).toBeAttached();
    });

    test('has a status code display', async ({ page }) => {
      await page.goto('/police-dashboard', { waitUntil: 'domcontentloaded' });

      const statusCode = page.locator('#currentStatusCode');
      await expect(statusCode).toBeAttached();
      await expect(statusCode).toHaveText('--');
    });

    test('has a quick status grid', async ({ page }) => {
      await page.goto('/police-dashboard', { waitUntil: 'domcontentloaded' });

      const quickGrid = page.locator('#quickStatusGrid');
      await expect(quickGrid).toBeAttached();
    });

    test('has a view all codes button', async ({ page }) => {
      await page.goto('/police-dashboard', { waitUntil: 'domcontentloaded' });

      const viewAllBtn = page.locator('#viewAllCodesBtn');
      await expect(viewAllBtn).toBeAttached();
    });

    test('all codes section is initially hidden', async ({ page }) => {
      await page.goto('/police-dashboard', { waitUntil: 'domcontentloaded' });

      const allCodes = page.locator('#allCodesSection');
      await expect(allCodes).toBeAttached();
      await expect(allCodes).not.toBeVisible();
    });

    test('has a 10-code search input', async ({ page }) => {
      await page.goto('/police-dashboard', { waitUntil: 'domcontentloaded' });

      const search = page.locator('#tenCodeSearch');
      await expect(search).toBeAttached();
    });
  });

  test.describe('BOLO Section', () => {
    test('has an active BOLO container', async ({ page }) => {
      await page.goto('/police-dashboard', { waitUntil: 'domcontentloaded' });

      const boloContainer = page.locator('#active-bolo-container');
      await expect(boloContainer).toBeAttached();
    });
  });

  test.describe('Active Calls Section', () => {
    test('has an assigned call container', async ({ page }) => {
      await page.goto('/police-dashboard', { waitUntil: 'domcontentloaded' });

      const callContainer = page.locator('#assigned-call-container');
      await expect(callContainer).toBeAttached();
    });
  });

  test.describe('Modals', () => {
    test('ticket modal is present but hidden', async ({ page }) => {
      await page.goto('/police-dashboard', { waitUntil: 'domcontentloaded' });

      const ticketModal = page.locator('#ticketModal');
      await expect(ticketModal).toBeAttached();
      await expect(ticketModal).not.toBeVisible();
    });

    test('warning modal is present but hidden', async ({ page }) => {
      await page.goto('/police-dashboard', { waitUntil: 'domcontentloaded' });

      const warningModal = page.locator('#warningModal');
      await expect(warningModal).toBeAttached();
      await expect(warningModal).not.toBeVisible();
    });

    test('create warrant modal is present but hidden', async ({ page }) => {
      await page.goto('/police-dashboard', { waitUntil: 'domcontentloaded' });

      const warrantModal = page.locator('#createWarrantModal');
      await expect(warrantModal).toBeAttached();
      await expect(warrantModal).not.toBeVisible();
    });

    test('view warrant modal is present but hidden', async ({ page }) => {
      await page.goto('/police-dashboard', { waitUntil: 'domcontentloaded' });

      const viewWarrant = page.locator('#viewWarrant');
      await expect(viewWarrant).toBeAttached();
      await expect(viewWarrant).not.toBeVisible();
    });

    test('BOLO detail modal is present but hidden', async ({ page }) => {
      await page.goto('/police-dashboard', { waitUntil: 'domcontentloaded' });

      const boloModal = page.locator('#boloDetailModal');
      await expect(boloModal).toBeAttached();
      await expect(boloModal).not.toBeVisible();
    });

    test('view vehicle modal is present but hidden', async ({ page }) => {
      await page.goto('/police-dashboard', { waitUntil: 'domcontentloaded' });

      const vehModal = page.locator('#viewVeh');
      await expect(vehModal).toBeAttached();
      await expect(vehModal).not.toBeVisible();
    });

    test('view license modal is present but hidden', async ({ page }) => {
      await page.goto('/police-dashboard', { waitUntil: 'domcontentloaded' });

      const licenseModal = page.locator('#viewLicense');
      await expect(licenseModal).toBeAttached();
      await expect(licenseModal).not.toBeVisible();
    });

    test('gallery modal is present but hidden', async ({ page }) => {
      await page.goto('/police-dashboard', { waitUntil: 'domcontentloaded' });

      const galleryModal = page.locator('#galleryModal');
      await expect(galleryModal).toBeAttached();
      await expect(galleryModal).not.toBeVisible();
    });
  });

  test.describe('Signal 100 Banner', () => {
    test('signal 100 banner element exists', async ({ page }) => {
      await page.goto('/police-dashboard', { waitUntil: 'domcontentloaded' });

      const banner = page.locator('#signal-100-banner');
      await expect(banner).toBeAttached();
    });

    test('signal 100 banner is initially hidden', async ({ page }) => {
      await page.goto('/police-dashboard', { waitUntil: 'domcontentloaded' });

      const banner = page.locator('#signal-100-banner');
      await expect(banner).toHaveClass(/hide/);
    });

    test('clear signal 100 modal exists', async ({ page }) => {
      await page.goto('/police-dashboard', { waitUntil: 'domcontentloaded' });

      const clearModal = page.locator('#clear-signal-100-modal');
      await expect(clearModal).toBeAttached();
    });
  });

  test.describe('Footer', () => {
    test('page includes a footer', async ({ page }) => {
      await page.goto('/police-dashboard', { waitUntil: 'domcontentloaded' });

      const footer = page.locator('footer').first();
      await expect(footer).toBeAttached();
    });
  });
});

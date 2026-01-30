import { test, expect } from '../fixtures/test-fixtures';

test.describe('Dispatch Dashboard', () => {
  test.describe('Page Load', () => {
    test('loads without server errors', async ({ page }) => {
      const errors: string[] = [];
      page.on('pageerror', (err) => errors.push(err.message));

      const response = await page.goto('/dispatch-dashboard', { waitUntil: 'domcontentloaded' });

      expect(response?.status()).toBeLessThan(500);
    });

    test('has the correct page title', async ({ page }) => {
      await page.goto('/dispatch-dashboard', { waitUntil: 'domcontentloaded' });

      await expect(page).toHaveTitle(/Dispatch Dashboard/);
    });

    test('renders the body with content', async ({ page }) => {
      await page.goto('/dispatch-dashboard', { waitUntil: 'domcontentloaded' });

      const body = page.locator('body');
      await expect(body).not.toBeEmpty();
    });
  });

  test.describe('Navigation', () => {
    test('displays the sidebar navigation', async ({ page }) => {
      await page.goto('/dispatch-dashboard', { waitUntil: 'domcontentloaded' });

      const sidebar = page.locator('#sidebar');
      await expect(sidebar).toBeAttached();
    });

    test('displays the top navigation bar', async ({ page }) => {
      await page.goto('/dispatch-dashboard', { waitUntil: 'domcontentloaded' });

      const topNav = page.locator('#topNav');
      await expect(topNav).toBeAttached();
    });

    test('displays Dispatch Operations header', async ({ page }) => {
      await page.goto('/dispatch-dashboard', { waitUntil: 'domcontentloaded' });

      const header = page.locator('a[href="/dispatch-dashboard"]').first();
      await expect(header).toBeAttached();
      await expect(header).toContainText('Dispatch Operations');
    });

    test('has a sidebar collapse button', async ({ page }) => {
      await page.goto('/dispatch-dashboard', { waitUntil: 'domcontentloaded' });

      const collapseBtn = page.locator('#sidebarCollapse');
      await expect(collapseBtn).toBeAttached();
    });

    test('community name is displayed in header', async ({ page }) => {
      await page.goto('/dispatch-dashboard', { waitUntil: 'domcontentloaded' });

      const communityName = page.locator('#community-name');
      await expect(communityName).toBeAttached();
    });
  });

  test.describe('Search Section', () => {
    test('sidebar has a search section', async ({ page }) => {
      await page.goto('/dispatch-dashboard', { waitUntil: 'domcontentloaded' });

      const searchToggle = page.locator('#toggleSearch');
      await expect(searchToggle).toBeAttached();
    });

    test('has a hidden search type input', async ({ page }) => {
      await page.goto('/dispatch-dashboard', { waitUntil: 'domcontentloaded' });

      const searchType = page.locator('#searchType');
      await expect(searchType).toBeAttached();
    });

    test('has Name/Civilian Database link', async ({ page }) => {
      await page.goto('/dispatch-dashboard', { waitUntil: 'domcontentloaded' });

      const civDbLink = page.locator('#sidebar a').filter({ hasText: /Civilian|Name/ }).first();
      await expect(civDbLink).toBeAttached();
    });

    test('has Vehicle/Plate Database link', async ({ page }) => {
      await page.goto('/dispatch-dashboard', { waitUntil: 'domcontentloaded' });

      const plateDbLink = page.locator('#sidebar a').filter({ hasText: /Vehicle|Plate/ }).first();
      await expect(plateDbLink).toBeAttached();
    });

    test('has Firearm Database link', async ({ page }) => {
      await page.goto('/dispatch-dashboard', { waitUntil: 'domcontentloaded' });

      const firearmDbLink = page.locator('#sidebar').getByText('Firearm Database');
      await expect(firearmDbLink).toBeAttached();
    });
  });

  test.describe('Utilities Section', () => {
    test('sidebar has a utilities section', async ({ page }) => {
      await page.goto('/dispatch-dashboard', { waitUntil: 'domcontentloaded' });

      const utilitiesToggle = page.locator('#toggleUtilities');
      await expect(utilitiesToggle).toBeAttached();
    });

    test('has Create BOLO link', async ({ page }) => {
      await page.goto('/dispatch-dashboard', { waitUntil: 'domcontentloaded' });

      const boloLink = page.locator('#sidebar').getByText('Create BOLO').first();
      await expect(boloLink).toBeAttached();
    });

    test('has Create Call link', async ({ page }) => {
      await page.goto('/dispatch-dashboard', { waitUntil: 'domcontentloaded' });

      const callLink = page.locator('#sidebar').getByText('Create Call').first();
      await expect(callLink).toBeAttached();
    });
  });

  test.describe('Unit Status Panel', () => {
    test('displays the unit status panel', async ({ page }) => {
      await page.goto('/dispatch-dashboard', { waitUntil: 'domcontentloaded' });

      const statusPanel = page.locator('#unitStatusPanel');
      await expect(statusPanel).toBeAttached();
    });

    test('shows online/offline/total counters', async ({ page }) => {
      await page.goto('/dispatch-dashboard', { waitUntil: 'domcontentloaded' });

      const onlineCount = page.locator('#onlineCount');
      const offlineCount = page.locator('#offlineCount');
      const totalCount = page.locator('#totalCount');

      await expect(onlineCount).toBeAttached();
      await expect(offlineCount).toBeAttached();
      await expect(totalCount).toBeAttached();
    });

    test('has a unit search input', async ({ page }) => {
      await page.goto('/dispatch-dashboard', { waitUntil: 'domcontentloaded' });

      const unitSearch = page.locator('#unitSearch');
      await expect(unitSearch).toBeAttached();
      await expect(unitSearch).toHaveAttribute('placeholder', /Search units/);
    });

    test('has a department filter dropdown', async ({ page }) => {
      await page.goto('/dispatch-dashboard', { waitUntil: 'domcontentloaded' });

      const deptFilter = page.locator('#departmentFilter');
      await expect(deptFilter).toBeAttached();
    });

    test('has unit filter buttons (All, Online, Offline)', async ({ page }) => {
      await page.goto('/dispatch-dashboard', { waitUntil: 'domcontentloaded' });

      const allBtn = page.locator('.filter-btn[data-filter="all"]');
      const onlineBtn = page.locator('.filter-btn[data-filter="online"]');
      const offlineBtn = page.locator('.filter-btn[data-filter="offline"]');

      await expect(allBtn).toBeAttached();
      await expect(onlineBtn).toBeAttached();
      await expect(offlineBtn).toBeAttached();
    });

    test('has a unit grid container', async ({ page }) => {
      await page.goto('/dispatch-dashboard', { waitUntil: 'domcontentloaded' });

      const unitGrid = page.locator('#unitGrid');
      await expect(unitGrid).toBeAttached();
    });

    test('has unit pagination', async ({ page }) => {
      await page.goto('/dispatch-dashboard', { waitUntil: 'domcontentloaded' });

      const pagination = page.locator('#unitPagination');
      await expect(pagination).toBeAttached();
    });
  });

  // Note: Fire/EMS list table (#fireEmsListTable) is currently commented out in the template

  test.describe('BOLO Section', () => {
    test('has an active BOLO container', async ({ page }) => {
      await page.goto('/dispatch-dashboard', { waitUntil: 'domcontentloaded' });

      const boloContainer = page.locator('#active-bolo-container');
      await expect(boloContainer).toBeAttached();
    });

    test('has a BOLO table', async ({ page }) => {
      await page.goto('/dispatch-dashboard', { waitUntil: 'domcontentloaded' });

      const boloTable = page.locator('#boloTable');
      await expect(boloTable).toBeAttached();
    });

    test('shows Active BOLOs label', async ({ page }) => {
      await page.goto('/dispatch-dashboard', { waitUntil: 'domcontentloaded' });

      const bolosLabel = page.getByText('Active BOLOs:');
      await expect(bolosLabel).toBeAttached();
    });
  });

  test.describe('Active Calls Section', () => {
    test('has a call table', async ({ page }) => {
      await page.goto('/dispatch-dashboard', { waitUntil: 'domcontentloaded' });

      const callTable = page.locator('#callTable');
      await expect(callTable).toBeAttached();
    });

    test('shows Active Calls label', async ({ page }) => {
      await page.goto('/dispatch-dashboard', { waitUntil: 'domcontentloaded' });

      const callsLabel = page.getByText('Active Calls:');
      await expect(callsLabel).toBeAttached();
    });
  });

  test.describe('Modals', () => {
    test('BOLO detail modal is present but hidden', async ({ page }) => {
      await page.goto('/dispatch-dashboard', { waitUntil: 'domcontentloaded' });

      const boloModal = page.locator('#boloDetailModal');
      await expect(boloModal).toBeAttached();
      await expect(boloModal).not.toBeVisible();
    });

    test('view warrant modal is present but hidden', async ({ page }) => {
      await page.goto('/dispatch-dashboard', { waitUntil: 'domcontentloaded' });

      const warrantModal = page.locator('#viewWarrant');
      await expect(warrantModal).toBeAttached();
      await expect(warrantModal).not.toBeVisible();
    });

    test('create warrant modal is present but hidden', async ({ page }) => {
      await page.goto('/dispatch-dashboard', { waitUntil: 'domcontentloaded' });

      const createWarrant = page.locator('#createWarrantModal');
      await expect(createWarrant).toBeAttached();
      await expect(createWarrant).not.toBeVisible();
    });

    test('view vehicle modal is present but hidden', async ({ page }) => {
      await page.goto('/dispatch-dashboard', { waitUntil: 'domcontentloaded' });

      const vehModal = page.locator('#viewVeh');
      await expect(vehModal).toBeAttached();
      await expect(vehModal).not.toBeVisible();
    });

    test('view license modal is present but hidden', async ({ page }) => {
      await page.goto('/dispatch-dashboard', { waitUntil: 'domcontentloaded' });

      const licenseModal = page.locator('#viewLicense');
      await expect(licenseModal).toBeAttached();
      await expect(licenseModal).not.toBeVisible();
    });

    test('gallery modal is present but hidden', async ({ page }) => {
      await page.goto('/dispatch-dashboard', { waitUntil: 'domcontentloaded' });

      const galleryModal = page.locator('#galleryModal');
      await expect(galleryModal).toBeAttached();
      await expect(galleryModal).not.toBeVisible();
    });
  });

  test.describe('Signal 100 Banner', () => {
    test('signal 100 banner element exists', async ({ page }) => {
      await page.goto('/dispatch-dashboard', { waitUntil: 'domcontentloaded' });

      const banner = page.locator('#signal-100-banner');
      await expect(banner).toBeAttached();
    });

    test('signal 100 banner is initially hidden', async ({ page }) => {
      await page.goto('/dispatch-dashboard', { waitUntil: 'domcontentloaded' });

      const banner = page.locator('#signal-100-banner');
      await expect(banner).toHaveClass(/hide/);
    });

    test('clear signal 100 modal exists', async ({ page }) => {
      await page.goto('/dispatch-dashboard', { waitUntil: 'domcontentloaded' });

      const clearModal = page.locator('#clear-signal-100-modal');
      await expect(clearModal).toBeAttached();
    });
  });

  test.describe('Footer', () => {
    test('page includes a footer', async ({ page }) => {
      await page.goto('/dispatch-dashboard', { waitUntil: 'domcontentloaded' });

      const footer = page.locator('.footer1-wrapper').first();
      await expect(footer).toBeAttached();
    });
  });
});

import { test, expect } from '../fixtures/test-fixtures';

test.describe('EMS Dashboard', () => {
  test.describe('Page Load', () => {
    test('loads without server errors', async ({ page }) => {
      const errors: string[] = [];
      page.on('pageerror', (err) => errors.push(err.message));

      const response = await page.goto('/ems-dashboard', { waitUntil: 'domcontentloaded' });

      expect(response?.status()).toBeLessThan(500);
    });

    test('has the correct page title', async ({ page }) => {
      await page.goto('/ems-dashboard', { waitUntil: 'domcontentloaded' });

      await expect(page).toHaveTitle(/Fire\/EMS Dashboard/);
    });

    test('renders the body with content', async ({ page }) => {
      await page.goto('/ems-dashboard', { waitUntil: 'domcontentloaded' });

      const body = page.locator('body');
      await expect(body).not.toBeEmpty();
    });
  });

  test.describe('Navigation', () => {
    test('displays the sidebar navigation', async ({ page }) => {
      await page.goto('/ems-dashboard', { waitUntil: 'domcontentloaded' });

      const sidebar = page.locator('#sidebar');
      await expect(sidebar).toBeAttached();
    });

    test('displays the top navigation bar', async ({ page }) => {
      await page.goto('/ems-dashboard', { waitUntil: 'domcontentloaded' });

      const topNav = page.locator('#topNav');
      await expect(topNav).toBeAttached();
    });

    test('has a sidebar collapse button', async ({ page }) => {
      await page.goto('/ems-dashboard', { waitUntil: 'domcontentloaded' });

      const collapseBtn = page.locator('#sidebarCollapse');
      await expect(collapseBtn).toBeAttached();
    });

    test('displays EMS in the header', async ({ page }) => {
      await page.goto('/ems-dashboard', { waitUntil: 'domcontentloaded' });

      const emsLink = page.locator('#ems-nav-link');
      await expect(emsLink).toBeAttached();
      await expect(emsLink).toContainText('EMS');
    });

    test('sidebar shows logged in as Fire/EMS', async ({ page }) => {
      await page.goto('/ems-dashboard', { waitUntil: 'domcontentloaded' });

      const loggedInText = page.locator('#sidebar').getByText('Logged in as: Fire/EMS');
      await expect(loggedInText).toBeAttached();
    });
  });

  test.describe('Search Section', () => {
    test('sidebar has a search section', async ({ page }) => {
      await page.goto('/ems-dashboard', { waitUntil: 'domcontentloaded' });

      const searchToggle = page.locator('#toggleSearch');
      await expect(searchToggle).toBeAttached();
    });

    test('has Medical Database link', async ({ page }) => {
      await page.goto('/ems-dashboard', { waitUntil: 'domcontentloaded' });

      const medicalDbLink = page.locator('#sidebar').getByText('Medical').first();
      await expect(medicalDbLink).toBeAttached();
    });

    test('has Add New Persona link in sidebar', async ({ page }) => {
      await page.goto('/ems-dashboard', { waitUntil: 'domcontentloaded' });

      const personaLink = page.locator('#sidebar').getByText('Add New Persona');
      await expect(personaLink).toBeAttached();
    });

    test('has Add New Vehicle link in sidebar', async ({ page }) => {
      await page.goto('/ems-dashboard', { waitUntil: 'domcontentloaded' });

      const vehicleLink = page.locator('#sidebar').getByText('Add New Vehicle');
      await expect(vehicleLink).toBeAttached();
    });
  });

  test.describe('Status Panel', () => {
    test('displays the status panel', async ({ page }) => {
      await page.goto('/ems-dashboard', { waitUntil: 'domcontentloaded' });

      const statusPanel = page.locator('#statusPanel');
      await expect(statusPanel).toBeAttached();
    });

    test('shows the current status badge', async ({ page }) => {
      await page.goto('/ems-dashboard', { waitUntil: 'domcontentloaded' });

      const statusBadge = page.locator('#currentStatusBadge');
      await expect(statusBadge).toBeAttached();
    });

    test('has a status code display', async ({ page }) => {
      await page.goto('/ems-dashboard', { waitUntil: 'domcontentloaded' });

      const statusCode = page.locator('#currentStatusCode');
      await expect(statusCode).toBeAttached();
      await expect(statusCode).toHaveText('--');
    });

    test('displays EMS STATUS CODES label', async ({ page }) => {
      await page.goto('/ems-dashboard', { waitUntil: 'domcontentloaded' });

      const label = page.getByText('EMS STATUS CODES');
      await expect(label).toBeAttached();
    });

    test('has a quick status grid', async ({ page }) => {
      await page.goto('/ems-dashboard', { waitUntil: 'domcontentloaded' });

      const quickGrid = page.locator('#quickStatusGrid');
      await expect(quickGrid).toBeAttached();
    });

    test('has a view all codes button', async ({ page }) => {
      await page.goto('/ems-dashboard', { waitUntil: 'domcontentloaded' });

      const viewAllBtn = page.locator('#viewAllCodesBtn');
      await expect(viewAllBtn).toBeAttached();
    });

    test('all codes section is initially hidden', async ({ page }) => {
      await page.goto('/ems-dashboard', { waitUntil: 'domcontentloaded' });

      const allCodes = page.locator('#allCodesSection');
      await expect(allCodes).toBeAttached();
      await expect(allCodes).not.toBeVisible();
    });

    test('has a 10-code search input', async ({ page }) => {
      await page.goto('/ems-dashboard', { waitUntil: 'domcontentloaded' });

      const search = page.locator('#tenCodeSearch');
      await expect(search).toBeAttached();
    });
  });

  test.describe('Personnel Section', () => {
    test('displays a personnel section', async ({ page }) => {
      await page.goto('/ems-dashboard', { waitUntil: 'domcontentloaded' });

      const personnelLabel = page.getByText('Personnel:');
      await expect(personnelLabel).toBeAttached();
    });

    test('has Add New Persona button', async ({ page }) => {
      await page.goto('/ems-dashboard', { waitUntil: 'domcontentloaded' });

      const addPersonaBtn = page.locator('button').filter({ hasText: 'Add New Persona' }).first();
      await expect(addPersonaBtn).toBeAttached();
    });

    test('has a persona table', async ({ page }) => {
      await page.goto('/ems-dashboard', { waitUntil: 'domcontentloaded' });

      const personaTable = page.locator('#persona-table');
      await expect(personaTable).toBeAttached();
    });

    test('persona table has a body', async ({ page }) => {
      await page.goto('/ems-dashboard', { waitUntil: 'domcontentloaded' });

      const personaBody = page.locator('#persona-body');
      await expect(personaBody).toBeAttached();
    });
  });

  test.describe('Vehicles Section', () => {
    test('displays a vehicles section', async ({ page }) => {
      await page.goto('/ems-dashboard', { waitUntil: 'domcontentloaded' });

      const vehiclesLabel = page.getByText('Vehicles:').first();
      await expect(vehiclesLabel).toBeAttached();
    });

    test('has Add New Vehicle button', async ({ page }) => {
      await page.goto('/ems-dashboard', { waitUntil: 'domcontentloaded' });

      const addVehicleBtn = page.locator('button').filter({ hasText: /Add.*New.*Vehicle/ }).first();
      await expect(addVehicleBtn).toBeAttached();
    });

    test('has a vehicle table', async ({ page }) => {
      await page.goto('/ems-dashboard', { waitUntil: 'domcontentloaded' });

      const vehicleTable = page.locator('#vehicle-table');
      await expect(vehicleTable).toBeAttached();
    });

    test('vehicle table has a body', async ({ page }) => {
      await page.goto('/ems-dashboard', { waitUntil: 'domcontentloaded' });

      const vehicleBody = page.locator('#vehicle-body');
      await expect(vehicleBody).toBeAttached();
    });
  });

  test.describe('Active Calls Section', () => {
    test('has an assigned call container', async ({ page }) => {
      await page.goto('/ems-dashboard', { waitUntil: 'domcontentloaded' });

      const callContainer = page.locator('#assigned-call-container');
      await expect(callContainer).toBeAttached();
    });
  });

  test.describe('Header Action Buttons', () => {
    test('has Medical Database button in header', async ({ page }) => {
      await page.goto('/ems-dashboard', { waitUntil: 'domcontentloaded' });

      const medicalBtn = page.locator('button').filter({ hasText: 'Medical' }).first();
      await expect(medicalBtn).toBeAttached();
    });

    test('has Add New Persona button in header', async ({ page }) => {
      await page.goto('/ems-dashboard', { waitUntil: 'domcontentloaded' });

      const personaBtn = page.locator('header button').filter({ hasText: /Add New.*Persona/ }).first();
      await expect(personaBtn).toBeAttached();
    });

    test('has Add New Vehicle button in header', async ({ page }) => {
      await page.goto('/ems-dashboard', { waitUntil: 'domcontentloaded' });

      const vehicleBtn = page.locator('header button').filter({ hasText: /Add New.*Vehicle/ }).first();
      await expect(vehicleBtn).toBeAttached();
    });
  });

  test.describe('Modals', () => {
    test('medical database modal is present but hidden', async ({ page }) => {
      await page.goto('/ems-dashboard', { waitUntil: 'domcontentloaded' });

      const modal = page.locator('#medicalDatabaseModal');
      await expect(modal).toBeAttached();
      await expect(modal).not.toBeVisible();
    });

    test('new persona modal is present but hidden', async ({ page }) => {
      await page.goto('/ems-dashboard', { waitUntil: 'domcontentloaded' });

      const modal = page.locator('#newCivModal');
      await expect(modal).toBeAttached();
      await expect(modal).not.toBeVisible();
    });

    test('new vehicle modal is present but hidden', async ({ page }) => {
      await page.goto('/ems-dashboard', { waitUntil: 'domcontentloaded' });

      const modal = page.locator('#newVehicleModal');
      await expect(modal).toBeAttached();
      await expect(modal).not.toBeVisible();
    });

    test('delete confirm modal is present but hidden', async ({ page }) => {
      await page.goto('/ems-dashboard', { waitUntil: 'domcontentloaded' });

      const modal = page.locator('#deleteConfirmModal');
      await expect(modal).toBeAttached();
      await expect(modal).not.toBeVisible();
    });

    test('delete medication confirm modal is present but hidden', async ({ page }) => {
      await page.goto('/ems-dashboard', { waitUntil: 'domcontentloaded' });

      const modal = page.locator('#deleteMedicationConfirmModal');
      await expect(modal).toBeAttached();
      await expect(modal).not.toBeVisible();
    });

    test('pronounce dead confirm modal is present but hidden', async ({ page }) => {
      await page.goto('/ems-dashboard', { waitUntil: 'domcontentloaded' });

      const modal = page.locator('#pronounceDeadConfirmModal');
      await expect(modal).toBeAttached();
      await expect(modal).not.toBeVisible();
    });

    test('declare alive confirm modal is present but hidden', async ({ page }) => {
      await page.goto('/ems-dashboard', { waitUntil: 'domcontentloaded' });

      const modal = page.locator('#declareAliveConfirmModal');
      await expect(modal).toBeAttached();
      await expect(modal).not.toBeVisible();
    });

    test('call detail modal is present but hidden', async ({ page }) => {
      await page.goto('/ems-dashboard', { waitUntil: 'domcontentloaded' });

      const modal = page.locator('#callDetailModal');
      await expect(modal).toBeAttached();
      await expect(modal).not.toBeVisible();
    });

    test('gallery modal is present but hidden', async ({ page }) => {
      await page.goto('/ems-dashboard', { waitUntil: 'domcontentloaded' });

      const modal = page.locator('#galleryModal');
      await expect(modal).toBeAttached();
      await expect(modal).not.toBeVisible();
    });
  });

  test.describe('Medical Database Modal Structure', () => {
    test('medical database modal has search view', async ({ page }) => {
      await page.goto('/ems-dashboard', { waitUntil: 'domcontentloaded' });

      const searchView = page.locator('#searchView');
      await expect(searchView).toBeAttached();
    });

    test('medical database modal has search input', async ({ page }) => {
      await page.goto('/ems-dashboard', { waitUntil: 'domcontentloaded' });

      const searchInput = page.locator('#medical-search-name');
      await expect(searchInput).toBeAttached();
    });

    test('medical database modal has search results area', async ({ page }) => {
      await page.goto('/ems-dashboard', { waitUntil: 'domcontentloaded' });

      const results = page.locator('#medicalSearchResults');
      await expect(results).toBeAttached();
    });

    test('medical database modal has create report view', async ({ page }) => {
      await page.goto('/ems-dashboard', { waitUntil: 'domcontentloaded' });

      const createView = page.locator('#createReportView');
      await expect(createView).toBeAttached();
    });
  });

  test.describe('Signal 100 Banner', () => {
    test('signal 100 banner element exists', async ({ page }) => {
      await page.goto('/ems-dashboard', { waitUntil: 'domcontentloaded' });

      const banner = page.locator('#signal-100-banner');
      await expect(banner).toBeAttached();
    });

    test('signal 100 banner is initially hidden', async ({ page }) => {
      await page.goto('/ems-dashboard', { waitUntil: 'domcontentloaded' });

      const banner = page.locator('#signal-100-banner');
      await expect(banner).toHaveClass(/hide/);
    });
  });
});

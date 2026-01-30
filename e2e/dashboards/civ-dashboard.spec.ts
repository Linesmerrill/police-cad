import { test, expect } from '../fixtures/test-fixtures';

test.describe('Civilian Dashboard', () => {
  test.describe('Page Load', () => {
    test('loads without server errors', async ({ page }) => {
      const errors: string[] = [];
      page.on('pageerror', (err) => errors.push(err.message));

      const response = await page.goto('/civ-dashboard', { waitUntil: 'domcontentloaded' });

      expect(response?.status()).toBeLessThan(500);
    });

    test('has the correct page title', async ({ page }) => {
      await page.goto('/civ-dashboard', { waitUntil: 'domcontentloaded' });

      await expect(page).toHaveTitle(/Civilian Dashboard/);
    });

    test('renders the body with content', async ({ page }) => {
      await page.goto('/civ-dashboard', { waitUntil: 'domcontentloaded' });

      const body = page.locator('body');
      await expect(body).not.toBeEmpty();
    });
  });

  test.describe('Navigation', () => {
    test('displays the sidebar navigation', async ({ page }) => {
      await page.goto('/civ-dashboard', { waitUntil: 'domcontentloaded' });

      const sidebar = page.locator('#herouiSidebar');
      await expect(sidebar).toBeAttached();
    });

    test('displays the top navigation bar', async ({ page }) => {
      await page.goto('/civ-dashboard', { waitUntil: 'domcontentloaded' });

      const topNav = page.locator('.top-nav');
      await expect(topNav).toBeAttached();
    });

    test('sidebar contains Add New Civilian link', async ({ page }) => {
      await page.goto('/civ-dashboard', { waitUntil: 'domcontentloaded' });

      const addCivLink = page.locator('#navAddCivilian');
      await expect(addCivLink).toBeAttached();
    });

    test('sidebar contains Add New Vehicle link', async ({ page }) => {
      await page.goto('/civ-dashboard', { waitUntil: 'domcontentloaded' });

      const addVehicleLink = page.locator('#navAddVehicle');
      await expect(addVehicleLink).toBeAttached();
    });

    test('sidebar contains Add New Firearm link', async ({ page }) => {
      await page.goto('/civ-dashboard', { waitUntil: 'domcontentloaded' });

      const addFirearmLink = page.locator('#navAddFirearm');
      await expect(addFirearmLink).toBeAttached();
    });

    test('dashboard title links back to civilian dashboard', async ({ page }) => {
      await page.goto('/civ-dashboard', { waitUntil: 'domcontentloaded' });

      const dashLink = page.locator('a[href="/civ-dashboard"]').first();
      await expect(dashLink).toBeAttached();
    });

    test('community dashboard link is present', async ({ page }) => {
      await page.goto('/civ-dashboard', { waitUntil: 'domcontentloaded' });

      const communityLink = page.locator('a[href="/community-dashboard"]').first();
      await expect(communityLink).toBeAttached();
    });
  });

  test.describe('Civilians Section', () => {
    test('displays the civilians section', async ({ page }) => {
      await page.goto('/civ-dashboard', { waitUntil: 'domcontentloaded' });

      const civSection = page.locator('#civiliansSection');
      await expect(civSection).toBeAttached();
    });

    test('shows the Civilians section title', async ({ page }) => {
      await page.goto('/civ-dashboard', { waitUntil: 'domcontentloaded' });

      const sectionTitle = page.locator('#civiliansSection .section-title');
      await expect(sectionTitle).toHaveText('Civilians');
    });

    test('has an Add New Civilian button', async ({ page }) => {
      await page.goto('/civ-dashboard', { waitUntil: 'domcontentloaded' });

      const addBtn = page.locator('#btnAddCivilian');
      await expect(addBtn).toBeAttached();
      await expect(addBtn).toContainText('Add New Civilian');
    });

    test('has a loading spinner for civilians', async ({ page }) => {
      await page.goto('/civ-dashboard', { waitUntil: 'domcontentloaded' });

      const spinner = page.locator('#civilians-loading');
      await expect(spinner).toBeAttached();
    });

    test('has a civilians grid container', async ({ page }) => {
      await page.goto('/civ-dashboard', { waitUntil: 'domcontentloaded' });

      const grid = page.locator('#personas-thumbnail');
      await expect(grid).toBeAttached();
    });

    test('has pagination controls for civilians', async ({ page }) => {
      await page.goto('/civ-dashboard', { waitUntil: 'domcontentloaded' });

      const prevBtn = page.locator('#prev-civ-page-btn');
      const nextBtn = page.locator('#next-civ-page-btn');
      await expect(prevBtn).toBeAttached();
      await expect(nextBtn).toBeAttached();
    });
  });

  test.describe('Vehicles Section', () => {
    test('displays the vehicles section', async ({ page }) => {
      await page.goto('/civ-dashboard', { waitUntil: 'domcontentloaded' });

      const vehSection = page.locator('#vehiclesSection');
      await expect(vehSection).toBeAttached();
    });

    test('shows the Vehicles section title', async ({ page }) => {
      await page.goto('/civ-dashboard', { waitUntil: 'domcontentloaded' });

      const sectionTitle = page.locator('#vehiclesSection .section-title');
      await expect(sectionTitle).toHaveText('Vehicles');
    });

    test('has an Add New Vehicle button', async ({ page }) => {
      await page.goto('/civ-dashboard', { waitUntil: 'domcontentloaded' });

      const addBtn = page.locator('#btnAddVehicle');
      await expect(addBtn).toBeAttached();
      await expect(addBtn).toContainText('Add New Vehicle');
    });

    test('has a vehicles grid container', async ({ page }) => {
      await page.goto('/civ-dashboard', { waitUntil: 'domcontentloaded' });

      const grid = page.locator('#vehicles-thumbnail');
      await expect(grid).toBeAttached();
    });

    test('has pagination controls for vehicles', async ({ page }) => {
      await page.goto('/civ-dashboard', { waitUntil: 'domcontentloaded' });

      const prevBtn = page.locator('#prev-veh-page-btn');
      const nextBtn = page.locator('#next-veh-page-btn');
      await expect(prevBtn).toBeAttached();
      await expect(nextBtn).toBeAttached();
    });
  });

  test.describe('Firearms Section', () => {
    test('displays the firearms section', async ({ page }) => {
      await page.goto('/civ-dashboard', { waitUntil: 'domcontentloaded' });

      const firearmsSection = page.locator('#firearmsSection');
      await expect(firearmsSection).toBeAttached();
    });

    test('shows the Firearms section title', async ({ page }) => {
      await page.goto('/civ-dashboard', { waitUntil: 'domcontentloaded' });

      const sectionTitle = page.locator('#firearmsSection .section-title');
      await expect(sectionTitle).toHaveText('Firearms');
    });

    test('has an Add New Firearm button', async ({ page }) => {
      await page.goto('/civ-dashboard', { waitUntil: 'domcontentloaded' });

      const addBtn = page.locator('#btnAddFirearm');
      await expect(addBtn).toBeAttached();
      await expect(addBtn).toContainText('Add New Firearm');
    });

    test('has a firearms grid container', async ({ page }) => {
      await page.goto('/civ-dashboard', { waitUntil: 'domcontentloaded' });

      const grid = page.locator('#firearms-thumbnail');
      await expect(grid).toBeAttached();
    });

    test('has pagination controls for firearms', async ({ page }) => {
      await page.goto('/civ-dashboard', { waitUntil: 'domcontentloaded' });

      const prevBtn = page.locator('#prev-gun-page-btn');
      const nextBtn = page.locator('#next-gun-page-btn');
      await expect(prevBtn).toBeAttached();
      await expect(nextBtn).toBeAttached();
    });
  });

  test.describe('Modals', () => {
    test('civilian details modal is present but hidden', async ({ page }) => {
      await page.goto('/civ-dashboard', { waitUntil: 'domcontentloaded' });

      const modal = page.locator('#civDetailsModal');
      await expect(modal).toBeAttached();
      await expect(modal).not.toBeVisible();
    });

    test('civilian details modal has edit form', async ({ page }) => {
      await page.goto('/civ-dashboard', { waitUntil: 'domcontentloaded' });

      const editForm = page.locator('#editCivilianForm');
      await expect(editForm).toBeAttached();
    });

    test('civilian details modal has tab buttons', async ({ page }) => {
      await page.goto('/civ-dashboard', { waitUntil: 'domcontentloaded' });

      const editTab = page.locator('.heroui-tab[data-tab="edit"]');
      const vehiclesTab = page.locator('.heroui-tab[data-tab="vehicles"]');
      const firearmsTab = page.locator('.heroui-tab[data-tab="firearms"]');
      const licensesTab = page.locator('.heroui-tab[data-tab="licenses"]');
      const medicalTab = page.locator('.heroui-tab[data-tab="medical"]');
      const recordsTab = page.locator('.heroui-tab[data-tab="records"]');

      await expect(editTab).toBeAttached();
      await expect(vehiclesTab).toBeAttached();
      await expect(firearmsTab).toBeAttached();
      await expect(licensesTab).toBeAttached();
      await expect(medicalTab).toBeAttached();
      await expect(recordsTab).toBeAttached();
    });

    test('gallery modal is present but hidden', async ({ page }) => {
      await page.goto('/civ-dashboard', { waitUntil: 'domcontentloaded' });

      const modal = page.locator('#galleryModal');
      await expect(modal).toBeAttached();
      await expect(modal).not.toBeVisible();
    });
  });

  test.describe('Interactive Elements', () => {
    test('main content area is present', async ({ page }) => {
      await page.goto('/civ-dashboard', { waitUntil: 'domcontentloaded' });

      const mainContent = page.locator('#mainContent');
      await expect(mainContent).toBeAttached();
    });

    test('toast container is present for notifications', async ({ page }) => {
      await page.goto('/civ-dashboard', { waitUntil: 'domcontentloaded' });

      const toastContainer = page.locator('#toast-container');
      await expect(toastContainer).toBeAttached();
    });

    test('sidebar has user avatar section', async ({ page }) => {
      await page.goto('/civ-dashboard', { waitUntil: 'domcontentloaded' });

      const avatar = page.locator('#sidebarUserAvatar');
      await expect(avatar).toBeAttached();
    });

    test('mobile toggle button is present', async ({ page }) => {
      await page.goto('/civ-dashboard', { waitUntil: 'domcontentloaded' });

      const toggle = page.locator('#mobileToggle');
      await expect(toggle).toBeAttached();
    });
  });
});

import { test, expect } from '../fixtures/test-fixtures';

test.describe('Admin Console', () => {
  test.describe('Page Load', () => {
    test('loads without server errors', async ({ page }) => {
      const errors: string[] = [];
      page.on('pageerror', (err) => errors.push(err.message));

      const response = await page.goto('/admin/console', { waitUntil: 'domcontentloaded' });

      expect(response?.status()).toBeLessThan(500);
    });

    test('has the correct page title', async ({ page }) => {
      await page.goto('/admin/console', { waitUntil: 'domcontentloaded' });

      await expect(page).toHaveTitle(/Admin Console/);
    });

    test('renders the body with content', async ({ page }) => {
      await page.goto('/admin/console', { waitUntil: 'domcontentloaded' });

      const body = page.locator('body');
      await expect(body).not.toBeEmpty();
    });
  });

  test.describe('Admin Navbar', () => {
    test('displays the admin navigation bar', async ({ page }) => {
      await page.goto('/admin/console', { waitUntil: 'domcontentloaded' });

      const navbar = page.locator('.admin-navbar');
      await expect(navbar).toBeVisible();
    });

    test('navbar has LPC Admin Console brand', async ({ page }) => {
      await page.goto('/admin/console', { waitUntil: 'domcontentloaded' });

      const brand = page.locator('.navbar-brand');
      await expect(brand).toBeAttached();
      await expect(brand).toContainText('LPC Admin Console');
    });

    test('navbar brand links to admin console', async ({ page }) => {
      await page.goto('/admin/console', { waitUntil: 'domcontentloaded' });

      const brand = page.locator('.navbar-brand');
      await expect(brand).toHaveAttribute('href', '/admin/console');
    });

    test('navbar has admin profile dropdown', async ({ page }) => {
      await page.goto('/admin/console', { waitUntil: 'domcontentloaded' });

      const dropdown = page.locator('.admin-navbar .dropdown');
      await expect(dropdown).toBeAttached();
    });

    test('dropdown contains Edit Profile link', async ({ page }) => {
      await page.goto('/admin/console', { waitUntil: 'domcontentloaded' });

      const editProfileLink = page.locator('a[href="/admin/profile"]');
      await expect(editProfileLink).toBeAttached();
      await expect(editProfileLink).toContainText('Edit Profile');
    });

    test('dropdown contains Logout link', async ({ page }) => {
      await page.goto('/admin/console', { waitUntil: 'domcontentloaded' });

      const logoutLink = page.locator('.admin-navbar').getByText('Logout');
      await expect(logoutLink).toBeAttached();
    });
  });

  test.describe('Search & Management Section', () => {
    test('displays the search card', async ({ page }) => {
      await page.goto('/admin/console', { waitUntil: 'domcontentloaded' });

      const searchCard = page.locator('.search-card');
      await expect(searchCard).toBeVisible();
    });

    test('displays Admin Search & Management heading', async ({ page }) => {
      await page.goto('/admin/console', { waitUntil: 'domcontentloaded' });

      const heading = page.getByText('Admin Search & Management');
      await expect(heading).toBeVisible();
    });

    test('has an admin container section', async ({ page }) => {
      await page.goto('/admin/console', { waitUntil: 'domcontentloaded' });

      const adminContainer = page.locator('.admin-container');
      await expect(adminContainer).toBeAttached();
    });
  });

  test.describe('Tab Navigation', () => {
    test('has Users tab', async ({ page }) => {
      await page.goto('/admin/console', { waitUntil: 'domcontentloaded' });

      const usersTab = page.locator('a[href="#users-tab"]');
      await expect(usersTab).toBeAttached();
      await expect(usersTab).toContainText('Users');
    });

    test('has Pending Users tab', async ({ page }) => {
      await page.goto('/admin/console', { waitUntil: 'domcontentloaded' });

      const pendingTab = page.locator('a[href="#pending-users-tab"]');
      await expect(pendingTab).toBeAttached();
      await expect(pendingTab).toContainText('Pending Users');
    });

    test('has Communities tab', async ({ page }) => {
      await page.goto('/admin/console', { waitUntil: 'domcontentloaded' });

      const communitiesTab = page.locator('a[href="#communities-tab"]');
      await expect(communitiesTab).toBeAttached();
      await expect(communitiesTab).toContainText('Communities');
    });

    test('Users tab is active by default', async ({ page }) => {
      await page.goto('/admin/console', { waitUntil: 'domcontentloaded' });

      const usersPane = page.locator('#users-tab');
      await expect(usersPane).toHaveClass(/active/);
    });

    test('Content Creators tab exists but is hidden by default', async ({ page }) => {
      await page.goto('/admin/console', { waitUntil: 'domcontentloaded' });

      const ccTab = page.locator('#content-creators-tab');
      await expect(ccTab).toBeAttached();
      await expect(ccTab).not.toBeVisible();
    });

    test('Admin Management tab exists but is hidden by default', async ({ page }) => {
      await page.goto('/admin/console', { waitUntil: 'domcontentloaded' });

      const adminTab = page.locator('#admin-management-tab');
      await expect(adminTab).toBeAttached();
      await expect(adminTab).not.toBeVisible();
    });
  });

  test.describe('Users Tab', () => {
    test('has a user search input', async ({ page }) => {
      await page.goto('/admin/console', { waitUntil: 'domcontentloaded' });

      const searchInput = page.locator('#userSearch');
      await expect(searchInput).toBeAttached();
      await expect(searchInput).toHaveAttribute('placeholder', /Search users/);
    });

    test('has a Search Users button', async ({ page }) => {
      await page.goto('/admin/console', { waitUntil: 'domcontentloaded' });

      const searchBtn = page.locator('#searchUsersBtn');
      await expect(searchBtn).toBeAttached();
      await expect(searchBtn).toContainText('Search Users');
    });

    test('has a user results container', async ({ page }) => {
      await page.goto('/admin/console', { waitUntil: 'domcontentloaded' });

      const results = page.locator('#userResults');
      await expect(results).toBeAttached();
    });

    test('has a recent searches section', async ({ page }) => {
      await page.goto('/admin/console', { waitUntil: 'domcontentloaded' });

      const recentSearches = page.locator('#recentSearchesSection');
      await expect(recentSearches).toBeAttached();
    });

    test('has a recent searches list', async ({ page }) => {
      await page.goto('/admin/console', { waitUntil: 'domcontentloaded' });

      const recentList = page.locator('#recentSearchesList');
      await expect(recentList).toBeAttached();
    });
  });

  test.describe('Pending Users Tab', () => {
    test('has a pending user search input', async ({ page }) => {
      await page.goto('/admin/console', { waitUntil: 'domcontentloaded' });

      const searchInput = page.locator('#pendingUserSearch');
      await expect(searchInput).toBeAttached();
      await expect(searchInput).toHaveAttribute('placeholder', /Search pending users/);
    });

    test('has a Search Pending Users button', async ({ page }) => {
      await page.goto('/admin/console', { waitUntil: 'domcontentloaded' });

      const searchBtn = page.locator('#searchPendingUsersBtn');
      await expect(searchBtn).toBeAttached();
      await expect(searchBtn).toContainText('Search Pending Users');
    });

    test('has a pending user results container', async ({ page }) => {
      await page.goto('/admin/console', { waitUntil: 'domcontentloaded' });

      const results = page.locator('#pendingUserResults');
      await expect(results).toBeAttached();
    });
  });

  test.describe('Communities Tab', () => {
    test('has a community search input', async ({ page }) => {
      await page.goto('/admin/console', { waitUntil: 'domcontentloaded' });

      const searchInput = page.locator('#communitySearch');
      await expect(searchInput).toBeAttached();
      await expect(searchInput).toHaveAttribute('placeholder', /Search/);
    });

    test('has a Search Communities button', async ({ page }) => {
      await page.goto('/admin/console', { waitUntil: 'domcontentloaded' });

      const searchBtn = page.locator('#searchCommunitiesBtn');
      await expect(searchBtn).toBeAttached();
    });

    test('has a community results container', async ({ page }) => {
      await page.goto('/admin/console', { waitUntil: 'domcontentloaded' });

      const results = page.locator('#communityResults');
      await expect(results).toBeAttached();
    });
  });

  test.describe('Modals', () => {
    test('user details modal is present but hidden', async ({ page }) => {
      await page.goto('/admin/console', { waitUntil: 'domcontentloaded' });

      const modal = page.locator('#userModal');
      await expect(modal).toBeAttached();
      await expect(modal).not.toBeVisible();
    });

    test('user modal has title element', async ({ page }) => {
      await page.goto('/admin/console', { waitUntil: 'domcontentloaded' });

      const title = page.locator('#userModalTitle');
      await expect(title).toBeAttached();
      await expect(title).toHaveText('User Details');
    });

    test('user modal has body element', async ({ page }) => {
      await page.goto('/admin/console', { waitUntil: 'domcontentloaded' });

      const body = page.locator('#userModalBody');
      await expect(body).toBeAttached();
    });

    test('community details modal is present but hidden', async ({ page }) => {
      await page.goto('/admin/console', { waitUntil: 'domcontentloaded' });

      const modal = page.locator('#communityModal');
      await expect(modal).toBeAttached();
      await expect(modal).not.toBeVisible();
    });

    test('community modal has title element', async ({ page }) => {
      await page.goto('/admin/console', { waitUntil: 'domcontentloaded' });

      const title = page.locator('#communityModalTitle');
      await expect(title).toBeAttached();
      await expect(title).toHaveText('Community Details');
    });

    test('confirm action modal is present but hidden', async ({ page }) => {
      await page.goto('/admin/console', { waitUntil: 'domcontentloaded' });

      const modal = page.locator('#confirmModal');
      await expect(modal).toBeAttached();
      await expect(modal).not.toBeVisible();
    });

    test('confirm modal has a Confirm button', async ({ page }) => {
      await page.goto('/admin/console', { waitUntil: 'domcontentloaded' });

      const confirmBtn = page.locator('#confirmModalBtn');
      await expect(confirmBtn).toBeAttached();
      await expect(confirmBtn).toHaveText('Confirm');
    });

    test('info modal is present but hidden', async ({ page }) => {
      await page.goto('/admin/console', { waitUntil: 'domcontentloaded' });

      const modal = page.locator('#infoModal');
      await expect(modal).toBeAttached();
      await expect(modal).not.toBeVisible();
    });

    test('content creator application modal is present but hidden', async ({ page }) => {
      await page.goto('/admin/console', { waitUntil: 'domcontentloaded' });

      const modal = page.locator('#ccApplicationModal');
      await expect(modal).toBeAttached();
      await expect(modal).not.toBeVisible();
    });

    test('content creator reject modal is present but hidden', async ({ page }) => {
      await page.goto('/admin/console', { waitUntil: 'domcontentloaded' });

      const modal = page.locator('#ccRejectModal');
      await expect(modal).toBeAttached();
      await expect(modal).not.toBeVisible();
    });

    test('content creator remove modal is present but hidden', async ({ page }) => {
      await page.goto('/admin/console', { waitUntil: 'domcontentloaded' });

      const modal = page.locator('#ccRemoveModal');
      await expect(modal).toBeAttached();
      await expect(modal).not.toBeVisible();
    });

    test('add admin modal is present but hidden', async ({ page }) => {
      await page.goto('/admin/console', { waitUntil: 'domcontentloaded' });

      const modal = page.locator('#addAdminModal');
      await expect(modal).toBeAttached();
      await expect(modal).not.toBeVisible();
    });

    test('admin reset link modal is present but hidden', async ({ page }) => {
      await page.goto('/admin/console', { waitUntil: 'domcontentloaded' });

      const modal = page.locator('#adminResetLinkModal');
      await expect(modal).toBeAttached();
      await expect(modal).not.toBeVisible();
    });

    test('admin details modal is present but hidden', async ({ page }) => {
      await page.goto('/admin/console', { waitUntil: 'domcontentloaded' });

      const modal = page.locator('#adminDetailsModal');
      await expect(modal).toBeAttached();
      await expect(modal).not.toBeVisible();
    });

    test('role management modal is present but hidden', async ({ page }) => {
      await page.goto('/admin/console', { waitUntil: 'domcontentloaded' });

      const modal = page.locator('#roleManagementModal');
      await expect(modal).toBeAttached();
      await expect(modal).not.toBeVisible();
    });
  });

  test.describe('Content Creators Tab Structure', () => {
    test('content creators tab content panel exists', async ({ page }) => {
      await page.goto('/admin/console', { waitUntil: 'domcontentloaded' });

      const tabContent = page.locator('#content-creators-tab-content');
      await expect(tabContent).toBeAttached();
    });

    test('content creators has status filter buttons', async ({ page }) => {
      await page.goto('/admin/console', { waitUntil: 'domcontentloaded' });

      const filterGroup = page.locator('#ccStatusFilter');
      await expect(filterGroup).toBeAttached();
    });

    test('content creators has search input', async ({ page }) => {
      await page.goto('/admin/console', { waitUntil: 'domcontentloaded' });

      const ccSearch = page.locator('#ccSearch');
      await expect(ccSearch).toBeAttached();
    });

    test('content creators has results container', async ({ page }) => {
      await page.goto('/admin/console', { waitUntil: 'domcontentloaded' });

      const ccResults = page.locator('#ccApplicationResults');
      await expect(ccResults).toBeAttached();
    });

    test('content creators has stats row', async ({ page }) => {
      await page.goto('/admin/console', { waitUntil: 'domcontentloaded' });

      const statsRow = page.locator('#ccStatsRow');
      await expect(statsRow).toBeAttached();
    });
  });

  test.describe('Admin Management Tab Structure', () => {
    test('admin management tab content panel exists', async ({ page }) => {
      await page.goto('/admin/console', { waitUntil: 'domcontentloaded' });

      const tabContent = page.locator('#admin-management-tab-content');
      await expect(tabContent).toBeAttached();
    });

    test('admin management has search input', async ({ page }) => {
      await page.goto('/admin/console', { waitUntil: 'domcontentloaded' });

      const adminSearch = page.locator('#adminSearch');
      await expect(adminSearch).toBeAttached();
    });

    test('admin management has search button', async ({ page }) => {
      await page.goto('/admin/console', { waitUntil: 'domcontentloaded' });

      const searchBtn = page.locator('#searchAdminsBtn');
      await expect(searchBtn).toBeAttached();
    });

    test('admin management has results container', async ({ page }) => {
      await page.goto('/admin/console', { waitUntil: 'domcontentloaded' });

      const adminResults = page.locator('#adminResults');
      await expect(adminResults).toBeAttached();
    });
  });
});

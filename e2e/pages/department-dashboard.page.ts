import { Page, expect } from '@playwright/test';
import { encodeIdForUrl } from '../helpers/db';

/**
 * Page object for the new department dashboard (views/department-dashboard.ejs),
 * scoped to the Firearms component (public/js/dd-firearms.js). Extend as more
 * department-dashboard coverage is added.
 */
export class DepartmentDashboardPage {
  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  /** Navigate to the dashboard for a given department and wait for it to build. */
  async goto(deptName: string, deptId: string) {
    const d = encodeIdForUrl(deptId);
    await this.page.goto(
      `/department-dashboard?dept=${encodeURIComponent(deptName)}&d=${d}`
    );
    await expect(this.page).not.toHaveURL(/\/login/);
    // The SPA swaps a loading state for #dd-panels once the template resolves.
    await expect(this.page.locator('#dd-panels')).toBeVisible({ timeout: 20_000 });
  }

  /** Open the Firearms component from the sidebar nav. */
  async openFirearms() {
    await this.page
      .locator('#dd-nav-components .dd-nav-item[data-panel="createFirearms"]')
      .click();
    await expect(this.page.locator('#dd-fa-add-btn')).toBeVisible({ timeout: 15_000 });
  }

  async openNewFirearmModal() {
    await this.page.locator('#dd-fa-add-btn').click();
    await expect(this.page.locator('#dd-fa-new-submit')).toBeVisible({ timeout: 5_000 });
  }

  /** Fill the create-firearm modal. `stolen` toggles the "Reported Stolen" box. */
  async fillNewFirearm(opts: {
    serial: string;
    name: string;
    type?: string;
    stolen?: boolean;
  }) {
    await this.page.locator('#dd-fa-new-serial').fill(opts.serial);
    await this.page.locator('#dd-fa-new-name').fill(opts.name);
    await this.page.locator('#dd-fa-new-type').fill(opts.type ?? 'Pistol');
    const stolen = this.page.locator('#dd-fa-new-stolen');
    if (opts.stolen) {
      await stolen.check();
    } else {
      await stolen.uncheck();
    }
  }

  async submitNewFirearm() {
    await this.page.locator('#dd-fa-new-submit').click();
  }
}

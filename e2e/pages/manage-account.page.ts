import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from './base.page';

export class ProfilePage extends BasePage {
  readonly accountOverview: Locator;
  readonly changeEmailButton: Locator;
  readonly deactivateButton: Locator;
  readonly confirmDeactivateButton: Locator;

  constructor(page: Page) {
    super(page);
    this.accountOverview = page.getByText('Account Overview');
    this.changeEmailButton = page.getByRole('button', { name: /Change Email/i });
    this.deactivateButton = page.getByRole('button', { name: /Deactivate Account/i });
    this.confirmDeactivateButton = page.getByRole('button', {
      name: /yes.*deactivate|confirm.*deactivate|deactivate.*account/i,
    });
  }

  async goto() {
    await this.page.goto('/profile');
    await expect(this.accountOverview).toBeVisible({ timeout: 15_000 });
  }
}

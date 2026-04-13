import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from './base.page';

export class LandingPage extends BasePage {
  readonly heroSection: Locator;
  readonly statsSection: Locator;
  readonly featuresSection: Locator;

  constructor(page: Page) {
    super(page);
    this.heroSection = page.locator('text=Lines Police CAD').first();
    this.statsSection = page.locator('text=Communities').first();
    this.featuresSection = page.locator('text=Features').first();
  }

  async goto() {
    await this.page.goto('/', { waitUntil: 'domcontentloaded' });
  }

  async expectLoaded() {
    await expect(this.heroSection).toBeVisible({ timeout: 15_000 });
    await this.expectNavbarVisible();
    await this.expectFooterVisible();
  }
}

import { Page, Locator, expect } from '@playwright/test';

export class BasePage {
  readonly page: Page;
  readonly navbar: Locator;
  readonly footer: Locator;

  constructor(page: Page) {
    this.page = page;
    this.navbar = page.locator('nav').first();
    this.footer = page.locator('footer').first();
  }

  async expectNavbarVisible() {
    await expect(this.navbar).toBeVisible();
  }

  async expectFooterVisible() {
    await expect(this.footer).toBeVisible();
  }

  async expectPageLoaded() {
    await this.expectNavbarVisible();
    await this.expectFooterVisible();
  }
}

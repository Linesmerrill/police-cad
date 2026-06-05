import { Page, Locator, expect } from '@playwright/test';
import { encodeIdForUrl } from '../helpers/db';

export type FormsTab = 'forms' | 'archived' | 'all';

/** Shape the community-forms list view reads off each template. */
export interface StubTemplate {
  _id: string;
  name: string;
  slug: string;
  isArchived?: boolean;
  isHidden?: boolean;
  isDefault?: boolean;
  sections?: unknown[];
  currentVersion?: number;
}

/**
 * Page object for the community Forms page (views/community-forms.ejs,
 * served at /community/:hash/forms). The list is rendered client-side from
 * the form-templates API, so tests stub that endpoint for deterministic data.
 */
export class CommunityFormsPage {
  readonly page: Page;
  readonly listView: Locator;
  readonly tabs: Locator;
  readonly cards: Locator;
  readonly cardTitles: Locator;

  constructor(page: Page) {
    this.page = page;
    this.listView = page.locator('#rp-list-view');
    this.tabs = page.locator('#rp-list-view .rp-tabs');
    this.cards = page.locator('#rp-list-view .rp-card');
    this.cardTitles = page.locator('#rp-list-view .rp-card-title');
  }

  /**
   * Intercept the form-templates list call so the page renders a known set.
   * Must be registered before goto() — the list loads on page init.
   */
  async stubTemplates(templates: StubTemplate[]) {
    await this.page.route('**/api/v2/form-templates/community/**', async (route) => {
      // Only the GET list call drives the list view; let anything else pass.
      if (route.request().method() !== 'GET') return route.continue();
      const data = templates.map((t) => ({
        isHidden: false,
        isDefault: false,
        isArchived: false,
        sections: [],
        currentVersion: 1,
        ...t,
      }));
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data }),
      });
    });
  }

  async goto(communityIdHex: string, tab?: FormsTab) {
    const hash = encodeIdForUrl(communityIdHex);
    const q = tab ? `?tab=${tab}` : '';
    await this.page.goto(`/community/${hash}/forms${q}`);
    await expect(this.page).not.toHaveURL(/\/login/);
  }

  tab(key: FormsTab): Locator {
    return this.page.locator(`#rp-list-view .rp-tab[data-tab="${key}"]`);
  }

  tabCount(key: FormsTab): Locator {
    return this.tab(key).locator('.rp-tab-count');
  }

  async expectLoaded() {
    await expect(this.tabs).toBeVisible({ timeout: 15_000 });
  }

  async clickTab(key: FormsTab) {
    await this.tab(key).click();
    await expect(this.tab(key)).toHaveClass(/is-active/);
  }
}

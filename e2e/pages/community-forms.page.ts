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

  /** Department shape the builder reads off the community endpoint. */
  async stubCommunityDepartments(
    departments: Array<{ id: string; name: string; ranks: Array<{ id: string; name: string; displayOrder: number }> }>,
  ) {
    await this.page.route('**/api/v1/community/**', async (route) => {
      if (route.request().method() !== 'GET') return route.continue();
      const url = route.request().url();
      // Only intercept the plain community fetch, not sub-resources
      // (e.g. /roles, /departments) the page may also call.
      if (/\/api\/v1\/community\/[^/]+(\?|$)/.test(url) === false) return route.continue();
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          community: {
            departments: departments.map((d) => ({
              _id: d.id,
              name: d.name,
              ranks: d.ranks.map((r) => ({ _id: r.id, name: r.name, displayOrder: r.displayOrder })),
            })),
          },
        }),
      });
    });
  }

  /**
   * Capture the create (POST) form-template payload. Returns a getter for the
   * parsed request body once Save has fired. Registers a fulfilling route so
   * the save resolves without a real backend.
   */
  async captureCreatePayload(): Promise<() => any> {
    let captured: any = null;
    await this.page.route('**/api/v1/form-template', async (route) => {
      if (route.request().method() !== 'POST') return route.continue();
      try {
        captured = JSON.parse(route.request().postData() || '{}');
      } catch {
        captured = {};
      }
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({ message: 'Form template created', id: 'newid1234', version: 1 }),
      });
    });
    return () => captured;
  }

  async openNewForm() {
    await this.page.locator('#rp-new-btn').click();
    await expect(this.page.locator('#bf-name')).toBeVisible({ timeout: 10_000 });
  }

  /** Add a department rank-gate card by the department's display name. */
  async addDepartmentGate(deptName: string) {
    await this.page.locator('#bf-add-dept').selectOption({ label: deptName });
  }

  gateCard(index: number): Locator {
    return this.page.locator(`[data-gate-card="${index}"]`);
  }

  async setGateMode(gateIndex: number, scope: 'visible' | 'editable', mode: string) {
    await this.page.locator(`select[data-gate="${gateIndex}"][data-rank-mode="${scope}"]`).selectOption(mode);
  }

  async checkGateRank(gateIndex: number, scope: 'visible' | 'editable', rankId: string) {
    await this.page.locator(`input[data-gate="${gateIndex}"][data-rank-anchor="${scope}"][data-rank-id="${rankId}"]`).check();
  }

  async save() {
    await this.page.locator('#rp-save-btn').click();
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

import { Page, Locator, expect } from '@playwright/test';

/**
 * Page object for the Dispatch Command Bridge layout that activates inside
 * /command-dashboard when the active department's template.name === 'dispatch'.
 */
export class DispatchBridgePage {
  readonly page: Page;
  readonly bridge: Locator;
  readonly topbarClock: Locator;
  readonly signal100Btn: Locator;
  readonly panicBtn: Locator;

  readonly rosterZone: Locator;
  readonly rosterList: Locator;
  readonly rosterSearch: Locator;
  readonly rosterPillsDept: Locator;
  readonly rosterPillsStatus: Locator;

  readonly boardZone: Locator;
  readonly boardLanes: Locator;
  readonly newCallBtn: Locator;

  readonly detailZone: Locator;

  readonly bolosZone: Locator;
  readonly tonesZone: Locator;

  constructor(page: Page) {
    this.page = page;

    this.bridge       = page.locator('#cd-dispatch-bridge');
    this.topbarClock  = page.locator('#cd-dispatch-clock');
    this.signal100Btn = page.locator('#cd-dispatch-btn-signal100');
    this.panicBtn     = page.locator('#cd-dispatch-btn-panic');

    this.rosterZone       = page.locator('[data-zone="roster"]');
    this.rosterList       = page.locator('#cd-dispatch-roster-list');
    this.rosterSearch     = page.locator('#cd-roster-search-input');
    this.rosterPillsDept  = page.locator('.cd-roster-pills-dept');
    this.rosterPillsStatus = page.locator('.cd-roster-controls .cd-roster-pills').nth(1);

    this.boardZone    = page.locator('[data-zone="board"]');
    this.boardLanes   = page.locator('#cd-board-lanes');
    this.newCallBtn   = page.locator('#cd-dispatch-new-call');

    this.detailZone   = page.locator('#cd-dispatch-detail-zone');

    this.bolosZone    = page.locator('#cd-dispatch-bolos');
    this.tonesZone    = page.locator('#cd-dispatch-tones');
  }

  async expectLoaded() {
    await expect(this.bridge).toBeVisible({ timeout: 15_000 });
    await expect(this.rosterZone).toBeVisible();
    await expect(this.boardZone).toBeVisible();
  }

  async filterRosterByDept(key: 'all' | 'police' | 'fire' | 'ems') {
    await this.rosterPillsDept.locator(`[data-filter="${key}"]`).click();
  }

  async openIntake() {
    await this.newCallBtn.click();
  }

  unitChipByUserId(userId: string) {
    return this.page.locator(`.cd-unit-chip[data-user-id="${userId}"]`);
  }
  callCardByCallId(callId: string) {
    return this.page.locator(`.cd-call-card[data-call-id="${callId}"]`);
  }
}

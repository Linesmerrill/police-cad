import { Page, Locator, expect } from '@playwright/test';

// Department ID from seed.ts — encoded as URL-safe base64 for the `d` query param.
const TEST_DEPT_ID = 'ffffffffffffffffffffffff';
const TEST_DEPT_NAME = 'Test PD';
function encodeId(id: string): string {
  return Buffer.from(id, 'utf8')
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

export class CivDashboardPage {
  readonly page: Page;
  readonly civSection: Locator;
  readonly vehSection: Locator;
  readonly firearmSection: Locator;

  constructor(page: Page) {
    this.page = page;
    this.civSection = page.locator('#civiliansSection');
    this.vehSection = page.locator('#vehiclesSection');
    this.firearmSection = page.locator('#firearmsSection');
  }

  async goto() {
    const d = encodeId(TEST_DEPT_ID);
    await this.page.goto(`/civ-dashboard?dept=${encodeURIComponent(TEST_DEPT_NAME)}&d=${d}`);
    await expect(this.civSection).toBeVisible({ timeout: 20_000 });
  }

  async waitForCivsLoaded() {
    // Either civilians grid or "no civilians found" — both mean loading finished.
    await expect(
      this.page.locator('#personas-thumbnail, #no-civilians-found-alert').first()
    ).toBeVisible({ timeout: 15_000 });
  }

  async waitForVehiclesLoaded() {
    await expect(
      this.page.locator('#vehicles-thumbnail, #no-vehicles-found-alert').first()
    ).toBeVisible({ timeout: 15_000 });
  }

  async waitForFirearmsLoaded() {
    await expect(
      this.page.locator('#firearms-thumbnail, #no-firearms-found-alert').first()
    ).toBeVisible({ timeout: 15_000 });
  }

  /** True if at least one civilian card is rendered. */
  async hasCivilians(): Promise<boolean> {
    return this.page.locator('#personas-thumbnail').isVisible();
  }

  // ── Create civilian ──────────────────────────────────────────────
  async openNewCivModal() {
    await this.page.locator('#btnAddCivilian').click();
    await expect(this.page.locator('#newCivModal')).toBeVisible({ timeout: 5_000 });
  }

  async fillNewCivForm(opts: { name: string; birthday: string }) {
    await this.page.locator('#civ-first-name').fill(opts.name);
    await this.page.locator('#birthday').fill(opts.birthday);
  }

  async submitNewCiv() {
    await this.page.locator('#submitNewCiv').click();
  }

  async expectToast(text: string | RegExp) {
    await expect(
      this.page.locator('#toast-container .toast').filter({ hasText: text }).first()
    ).toBeVisible({ timeout: 10_000 });
  }

  // ── Civilian card interaction ────────────────────────────────────
  civCard(nameSubstring: string) {
    return this.page
      .locator('#personas-thumbnail .civ-card')
      .filter({ hasText: new RegExp(nameSubstring, 'i') })
      .first();
  }

  async openCivDetails(nameSubstring: string) {
    await this.civCard(nameSubstring).click();
    await expect(this.page.locator('#civDetailsModal')).toBeVisible({ timeout: 5_000 });
  }

  async editCivName(newName: string) {
    await this.page.locator('#civName').clear();
    await this.page.locator('#civName').fill(newName);
  }

  async saveCivEdit() {
    await this.page.locator('#civDetailsEditBtn').click();
  }

  async deleteCivFromModal() {
    this.page.once('dialog', (d) => d.accept());
    await this.page.locator('#civDetailsDeleteBtn').click();
  }

  // ── Vehicles ─────────────────────────────────────────────────────
  async openNewVehicleModal() {
    await this.page.locator('#btnAddVehicle').click();
    await expect(this.page.locator('#newVehicleModal')).toBeVisible({ timeout: 5_000 });
  }

  async fillNewVehicleForm(opts: { plate: string; vin: string; type?: string }) {
    await this.page.locator('#newVehPlate').fill(opts.plate);
    await this.page.locator('#newVehVin').fill(opts.vin);
    await this.page.locator('#newVehType').fill(opts.type ?? 'Sedan');
  }

  async submitNewVehicle() {
    await this.page.locator('#createVehicleBtn').click();
  }

  vehCard(plateSubstring: string) {
    return this.page
      .locator('#vehicles-thumbnail .veh-card')
      .filter({ hasText: new RegExp(plateSubstring, 'i') })
      .first();
  }

  async openVehDetails(plateSubstring: string) {
    await this.vehCard(plateSubstring).click();
    await expect(this.page.locator('#vehDetailsModal')).toBeVisible({ timeout: 5_000 });
  }

  async editVehPlate(newPlate: string) {
    await this.page.locator('#vehPlate').clear();
    await this.page.locator('#vehPlate').fill(newPlate);
  }

  async saveVehEdit() {
    await this.page.locator('#vehDetailsEditBtn').click();
  }

  async deleteVehFromModal() {
    this.page.once('dialog', (d) => d.accept());
    await this.page.locator('#vehDetailsDeleteBtn').click();
  }

  // ── Firearms ─────────────────────────────────────────────────────
  async openNewFirearmModal() {
    await this.page.locator('#btnAddFirearm').click();
    await expect(this.page.locator('#newFirearmModal')).toBeVisible({ timeout: 5_000 });
  }

  async fillNewFirearmForm(opts: { serial: string; name: string; type?: string }) {
    await this.page.locator('#newFirearmSerial').fill(opts.serial);
    await this.page.locator('#newFirearmName').fill(opts.name);
    await this.page.locator('#newFirearmType').fill(opts.type ?? 'Pistol');
  }

  async submitNewFirearm() {
    await this.page.locator('#createFirearmBtn').click();
  }

  firearmCard(nameSubstring: string) {
    return this.page
      .locator('#firearms-thumbnail .firearm-card')
      .filter({ hasText: new RegExp(nameSubstring, 'i') })
      .first();
  }

  async openFirearmDetails(nameSubstring: string) {
    await this.firearmCard(nameSubstring).click();
    await expect(this.page.locator('#firearmDetailsModal')).toBeVisible({ timeout: 5_000 });
  }

  async editFirearmName(newName: string) {
    await this.page.locator('#firearmName').clear();
    await this.page.locator('#firearmName').fill(newName);
  }

  async saveFirearmEdit() {
    await this.page.locator('#firearmDetailsEditBtn').click();
  }

  async deleteFirearmFromModal() {
    await this.page.locator('#firearmDetailsDeleteBtn').click();
    await expect(this.page.locator('#heroui-confirm-overlay')).toBeVisible({ timeout: 5_000 });
    await this.page.locator('#heroui-confirm-delete').click();
  }

  // ── Licenses (inside civilian details modal) ─────────────────────
  async openNewLicenseModal() {
    await this.page.locator('button:has-text("Add License")').first().click();
    await expect(this.page.locator('#newLicenseModal')).toBeVisible({ timeout: 5_000 });
  }

  async fillNewLicenseForm(opts: { type: string; status: string; expiry: string }) {
    await this.page.locator('#newLicenseType').fill(opts.type);
    await this.page.locator('#newLicenseStatus').selectOption(opts.status);
    await this.page.locator('#newLicenseExpiry').fill(opts.expiry);
  }

  async submitNewLicense() {
    await this.page.locator('#newLicenseModal button:has-text("Create License")').click();
  }

  licenseCard(typeSubstring: string) {
    return this.page
      .locator('.license-card')
      .filter({ hasText: new RegExp(typeSubstring, 'i') })
      .first();
  }
}

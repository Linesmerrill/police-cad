import { test, expect } from '@playwright/test';
import { CommunityFormsPage } from '../../pages/community-forms.page';
import { TEST_COMMUNITY_ID } from '../../helpers/seed';

const COMMUNITY = TEST_COMMUNITY_ID.toHexString();

// Two departments, each with two ranks (lower displayOrder = higher rank).
const POLICE = {
  id: 'a1a1a1a1a1a1a1a1a1a1a1a1',
  name: 'Police',
  ranks: [
    { id: 'b1b1b1b1b1b1b1b1b1b1b1b1', name: 'Sergeant', displayOrder: 1 },
    { id: 'b2b2b2b2b2b2b2b2b2b2b2b2', name: 'Officer', displayOrder: 2 },
  ],
};
const FIRE = {
  id: 'c1c1c1c1c1c1c1c1c1c1c1c1',
  name: 'Fire',
  ranks: [
    { id: 'd1d1d1d1d1d1d1d1d1d1d1d1', name: 'Captain', displayOrder: 1 },
    { id: 'd2d2d2d2d2d2d2d2d2d2d2d2', name: 'Firefighter', displayOrder: 2 },
  ],
};

test.describe('Community Forms — per-department rank gates', { tag: '@auth' }, () => {
  let forms: CommunityFormsPage;

  test.beforeEach(async ({ page }) => {
    forms = new CommunityFormsPage(page);
    await forms.stubTemplates([]);
    await forms.stubCommunityDepartments([POLICE, FIRE]);
  });

  test('lets you add rank gates for two departments and saves them both', async ({ page }) => {
    const getPayload = await forms.captureCreatePayload();

    await forms.goto(COMMUNITY);
    await forms.expectLoaded();

    await forms.openNewForm();
    await page.locator('#bf-name').fill('Use of Force Report');

    // Add a Police gate: visible to Sergeant and above.
    await forms.addDepartmentGate('Police');
    await expect(forms.gateCard(0)).toBeVisible();
    await forms.setGateMode(0, 'visible', 'atOrAbove');
    await forms.checkGateRank(0, 'visible', POLICE.ranks[0].id); // Sergeant

    // Add a Fire gate too — the core capability that was previously impossible.
    await forms.addDepartmentGate('Fire');
    await expect(forms.gateCard(1)).toBeVisible();
    await forms.setGateMode(1, 'editable', 'exact');
    await forms.checkGateRank(1, 'editable', FIRE.ranks[0].id); // Captain

    await forms.save();

    await expect.poll(() => getPayload(), { timeout: 10_000 }).not.toBeNull();
    const body = getPayload();
    expect(Array.isArray(body.rankGates)).toBe(true);
    expect(body.rankGates).toHaveLength(2);

    const police = body.rankGates.find((g: any) => g.departmentId === POLICE.id);
    const fire = body.rankGates.find((g: any) => g.departmentId === FIRE.id);

    expect(police).toBeTruthy();
    expect(police.visibleToRankRule).toMatchObject({ mode: 'atOrAbove', anchorRankIDs: [POLICE.ranks[0].id] });

    expect(fire).toBeTruthy();
    expect(fire.editableByRankRule).toMatchObject({ mode: 'exact', anchorRankIDs: [FIRE.ranks[0].id] });

    // No legacy single-department fields should be sent anymore.
    expect(body.departmentId).toBeUndefined();
  });

  test('removing a department gate drops it from the saved payload', async ({ page }) => {
    const getPayload = await forms.captureCreatePayload();

    await forms.goto(COMMUNITY);
    await forms.expectLoaded();

    await forms.openNewForm();
    await page.locator('#bf-name').fill('Pursuit Report');

    await forms.addDepartmentGate('Police');
    await forms.addDepartmentGate('Fire');
    await expect(forms.gateCard(1)).toBeVisible();

    // Remove the Police gate (index 0).
    await forms.gateCard(0).locator('[data-remove-gate="0"]').click();
    await expect(page.locator('[data-gate-card]')).toHaveCount(1);

    await forms.save();

    await expect.poll(() => getPayload(), { timeout: 10_000 }).not.toBeNull();
    const body = getPayload();
    expect(body.rankGates).toHaveLength(1);
    expect(body.rankGates[0].departmentId).toBe(FIRE.id);
  });
});

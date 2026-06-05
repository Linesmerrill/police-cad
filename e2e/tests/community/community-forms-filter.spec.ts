import { test, expect } from '@playwright/test';
import { CommunityFormsPage, StubTemplate } from '../../pages/community-forms.page';
import { TEST_COMMUNITY_ID } from '../../helpers/seed';

// A deterministic mix: 3 active (one of them a default) + 1 archived.
//   Forms tab    → 3 (active + default, non-archived)
//   Archived tab → 1
//   All tab      → 4
const TEMPLATES: StubTemplate[] = [
  { _id: 'aaaa1111', name: 'Active Alpha', slug: 'active-alpha' },
  { _id: 'bbbb2222', name: 'Active Bravo', slug: 'active-bravo' },
  { _id: 'cccc3333', name: 'Archived Charlie', slug: 'archived-charlie', isArchived: true },
  { _id: 'dddd4444', name: 'Default Delta', slug: 'default-delta', isDefault: true },
];

const COMMUNITY = TEST_COMMUNITY_ID.toHexString();

test.describe('Community Forms — filter tabs', { tag: '@auth' }, () => {
  let forms: CommunityFormsPage;

  test.beforeEach(async ({ page }) => {
    forms = new CommunityFormsPage(page);
    await forms.stubTemplates(TEMPLATES);
  });

  test('defaults to the Forms tab and hides archived templates', async () => {
    await forms.goto(COMMUNITY);
    await forms.expectLoaded();

    await expect(forms.tab('forms')).toHaveClass(/is-active/);
    await expect(forms.cards).toHaveCount(3);
    await expect(forms.listView.getByText('Archived Charlie')).toHaveCount(0);

    // Live counts on each tab.
    await expect(forms.tabCount('forms')).toHaveText('3');
    await expect(forms.tabCount('archived')).toHaveText('1');
    await expect(forms.tabCount('all')).toHaveText('4');
  });

  test('Archived tab shows only archived forms and syncs ?tab=archived', async () => {
    await forms.goto(COMMUNITY);
    await forms.expectLoaded();

    await forms.clickTab('archived');

    await expect(forms.cards).toHaveCount(1);
    await expect(forms.listView.getByText('Archived Charlie')).toBeVisible();
    await expect(forms.listView.getByText('Active Alpha')).toHaveCount(0);
    await expect(forms.page).toHaveURL(/[?&]tab=archived/);
  });

  test('All tab shows every form and syncs ?tab=all', async () => {
    await forms.goto(COMMUNITY);
    await forms.expectLoaded();

    await forms.clickTab('all');

    await expect(forms.cards).toHaveCount(4);
    await expect(forms.listView.getByText('Archived Charlie')).toBeVisible();
    await expect(forms.page).toHaveURL(/[?&]tab=all/);
  });

  test('?tab=archived deep-link opens the Archived tab on load', async () => {
    await forms.goto(COMMUNITY, 'archived');
    await forms.expectLoaded();

    await expect(forms.tab('archived')).toHaveClass(/is-active/);
    await expect(forms.cards).toHaveCount(1);
    await expect(forms.listView.getByText('Archived Charlie')).toBeVisible();
  });

  test('switching back to Forms restores the active-only view', async () => {
    await forms.goto(COMMUNITY, 'all');
    await forms.expectLoaded();
    await expect(forms.cards).toHaveCount(4);

    await forms.clickTab('forms');

    await expect(forms.cards).toHaveCount(3);
    await expect(forms.listView.getByText('Archived Charlie')).toHaveCount(0);
    await expect(forms.page).toHaveURL(/[?&]tab=forms/);
  });
});

/**
 * The first-run wizard on /communities.
 *
 * It replaced a three-step tour that described Elite Communities, Discover and
 * Filter by Platform and then closed, leaving a new player to go find them.
 * About 28.5% of new accounts never join any community and the drop is at the
 * top of the funnel, so the wizard asks two questions and puts real servers on
 * screen instead of explaining where to look.
 */
import { test, expect, Page } from '@playwright/test';
import { clearWelcomeWizardDismissal } from '../../helpers/onboarding-seed';

const RECOMMENDED = {
  data: [
    {
      _id: '68704eab33ccdbeec0d8166c', name: 'Florida State Role Play',
      imageLink: '', description: 'Serious RP', membersCount: 244,
      tags: ['PC'], promotionalText: '', promotionalDescription: '',
      subscription: { active: true, plan: 'elite' },
    },
    {
      _id: '69dbfc87fef5e8c9327ccf2a', name: 'Oregon RP',
      imageLink: '', description: 'Chill server', membersCount: 695,
      tags: ['PC'], promotionalText: '', promotionalDescription: '',
      subscription: { active: false, plan: '' },
    },
  ],
  totalCount: 2, page: 0, limit: 5,
};

// Everything is scoped to the wizard panel. /communities renders its own
// PC / Xbox / PlayStation filter chips behind the modal, so a bare
// getByRole('button', { name: 'PC' }) resolves to the chip the overlay is
// covering and the click times out -- which is exactly what happened.
const wizard = (page: Page) => page.getByTestId('welcome-wizard');

// The wizard opens 500ms after load; wait for it rather than sleeping.
async function openWizard(page: Page) {
  await page.goto('/communities');
  await expect(wizard(page).getByText('What would you like to do?')).toBeVisible({ timeout: 15_000 });
}

async function chooseJoin(page: Page) {
  await wizard(page).getByRole('button', { name: /join a server/i }).click();
  await expect(wizard(page).getByText('What do you play on?')).toBeVisible();
}

async function choosePlatform(page: Page, tag: string) {
  await wizard(page).getByTestId(`wizard-platform-${tag}`).click();
}

async function mockRecommended(page: Page, body: unknown = RECOMMENDED, status = 200) {
  await page.route('**/api/v2/communities/recommended**', async (route) => {
    await route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });
  });
}

test.describe('New-user wizard', { tag: '@auth' }, () => {
  test.beforeEach(async () => {
    await clearWelcomeWizardDismissal();
  });

  test('opens on the intent question with an escape hatch', async ({ page }) => {
    await openWizard(page);

    await expect(wizard(page).getByRole('button', { name: /join a server/i })).toBeVisible();
    await expect(wizard(page).getByRole('button', { name: /start my own/i })).toBeVisible();
    // A wizard nobody can get out of is worse than no wizard.
    await expect(wizard(page).getByRole('button', { name: /just let me look around/i })).toBeVisible();
  });

  test('asks which platform, and offers a way past it', async ({ page }) => {
    await openWizard(page);
    await chooseJoin(page);

    for (const platform of ['Xbox', 'PlayStation', 'PC']) {
      await expect(wizard(page).getByTestId(`wizard-platform-${platform}`)).toBeVisible();
    }
    await expect(wizard(page).getByRole('button', { name: /show me everything/i })).toBeVisible();
  });

  test('shows real servers for the chosen platform', async ({ page }) => {
    await mockRecommended(page);
    await openWizard(page);
    await chooseJoin(page);
    await choosePlatform(page, 'PC');

    await expect(wizard(page).getByText('Florida State Role Play')).toBeVisible();
    await expect(wizard(page).getByText('Oregon RP')).toBeVisible();
    // Member counts are the signal a new player actually cares about.
    await expect(wizard(page).getByText(/244 members/)).toBeVisible();
  });

  test('asks the endpoint for the chosen tag and excludes the caller', async ({ page }) => {
    const urls: string[] = [];
    await page.route('**/api/v2/communities/recommended**', async (route) => {
      urls.push(route.request().url());
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(RECOMMENDED) });
    });

    await openWizard(page);
    await chooseJoin(page);
    await choosePlatform(page, 'Xbox');

    await expect.poll(() => urls.length).toBeGreaterThan(0);
    expect(urls[0]).toContain('tag=Xbox');
    // Without userId the wizard would recommend servers they already asked to join.
    expect(urls[0]).toContain('userId=');
  });

  test('an empty result offers a way forward rather than a dead end', async ({ page }) => {
    await mockRecommended(page, { data: [], totalCount: 0, page: 0, limit: 5 });
    await openWizard(page);
    await chooseJoin(page);
    await choosePlatform(page, 'PC');

    await expect(wizard(page).getByText(/no open servers/i)).toBeVisible();
    await expect(wizard(page).getByRole('button', { name: /show every platform/i })).toBeVisible();
  });

  test('a failed lookup can be retried', async ({ page }) => {
    await mockRecommended(page, { error: 'nope' }, 500);
    await openWizard(page);
    await chooseJoin(page);
    await choosePlatform(page, 'PC');

    await expect(wizard(page).getByText(/could not load servers/i)).toBeVisible();
    await expect(wizard(page).getByRole('button', { name: /try again/i })).toBeVisible();
  });

  test('dismissal is recorded server-side, not just in localStorage', async ({ page }) => {
    const dismissals: string[] = [];
    await page.route('**/dismiss-tutorial', async (route) => {
      dismissals.push(route.request().postData() || '');
      await route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
    });

    await openWizard(page);
    await wizard(page).getByRole('button', { name: /just let me look around/i }).click();

    await expect(page.getByTestId('welcome-wizard')).toHaveCount(0);
    await expect.poll(() => dismissals.length).toBeGreaterThan(0);
    // localStorage alone re-fires the wizard on every new browser and forgets it
    // on a cache clear, which on a shared machine means seeing it repeatedly.
    expect(dismissals[0]).toContain('welcome_wizard');
  });

  test('does not reappear after being dismissed', async ({ page }) => {
    await openWizard(page);
    await wizard(page).getByRole('button', { name: /just let me look around/i }).click();
    await expect(page.getByTestId('welcome-wizard')).toHaveCount(0);

    await page.goto('/communities');
    // Give it well past the 500ms it waits before opening.
    await page.waitForTimeout(2_000);
    await expect(page.getByTestId('welcome-wizard')).toHaveCount(0);
  });

  test('the standing banner stays hidden for someone already in a server', async ({ page }) => {
    await openWizard(page);
    await wizard(page).getByRole('button', { name: /just let me look around/i }).click();

    // The seeded test user is an approved member, so the prompt must not show.
    await expect(page.getByText(/not in a server yet/i)).toHaveCount(0);
  });
});

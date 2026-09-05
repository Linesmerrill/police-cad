import { test, expect, Page } from '@playwright/test';

// Regression tests for the /communities page sections.
//
// The page makes browser-direct calls to the API for each section (Elite,
// Discover/recommended, Browse/all, Your Communities). We mock those endpoints
// with page.route so the test is deterministic and doesn't depend on seeded
// data — and so we can inject a deliberately malformed community.
//
// Background: the list code used to do response.data.data.map(...).sort(...)
// inside a .catch(() => set([])) with no logging, so a single malformed
// community (null/odd name, unexpected shape) threw and blanked the whole
// page. These tests lock in that (a) every section populates from a normal
// response and (b) one malformed community no longer wipes out the rest.

interface Comm {
  _id: string;
  name: unknown;
  promotionalText?: string;
  promotionalDescription?: string;
  tags?: unknown;
  imageLink?: unknown;
  membersCount?: number;
  subscription?: unknown;
}

function comm(name: string): Comm {
  return {
    _id: name.replace(/\s+/g, '-').toLowerCase(),
    name,
    promotionalText: `${name} — promo text`,
    tags: ['roleplay'],
    imageLink: '',
    membersCount: 7,
    subscription: { active: false, plan: 'free' },
  };
}

async function jsonList(route: import('@playwright/test').Route, data: unknown[]) {
  await route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ data, totalCount: data.length }),
  });
}

interface SectionData {
  elite: unknown[];
  discover: unknown[];
  browse: unknown[];
  joined: unknown[];
}

async function mockCommunityApis(page: Page, data: SectionData) {
  // Owned communities and the create modal's owned count. Registered FIRST on
  // purpose: Playwright gives precedence to the most recently registered
  // matching route, so the narrower elite/tag/recommended stubs below win over
  // this broader one. Envelope shape, since the owned list reads totalCount to
  // decide whether a next page exists.
  await page.route('**/api/v2/communities/*', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ data: [], totalCount: 0, page: 1, limit: 6 }),
    }),
  );
  // Elite carousel
  await page.route('**/api/v2/communities/elite**', (route) => jsonList(route, data.elite));
  // Browse / "All" (tag/all and tag/{tag})
  await page.route('**/api/v2/communities/tag/**', (route) => jsonList(route, data.browse));
  // Discover (prioritized recommendations)
  await page.route('**/api/v2/user/*/prioritized-communities**', (route) =>
    jsonList(route, data.discover),
  );
  // Your Communities (joined/pending) — initial load uses the "joined" filter
  await page.route('**/api/v2/user/*/communities**', (route) => jsonList(route, data.joined));
  // v1 owned list: still the fallback path when v2 is unavailable, and a bare
  // array rather than an envelope. Keep it empty & harmless.
  await page.route('**/api/v1/communities/**', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: '[]' }),
  );
}

test.describe('Community card density', () => {
  // Guards the fix for "the cards take up more than a third of the screen and
  // you only ever see about three". The numbers here are the grid contract:
  // two up on a phone, four up on a wide screen, banner at 2:1.
  const cardGrid = (page: Page) => page.locator('#your-communities .grid').first();

  async function columnCount(page: Page) {
    return page.evaluate(() => {
      const grid = document.querySelector('#your-communities .grid');
      if (!grid) return 0;
      const kids = [...grid.children];
      if (!kids.length) return 0;
      const top = Math.round(kids[0].getBoundingClientRect().top);
      return kids.filter((k) => Math.round(k.getBoundingClientRect().top) === top).length;
    });
  }

  test('is two up on a phone and four up on a wide screen', { tag: '@auth' }, async ({ page }) => {
    await mockCommunityApis(page, {
      elite: [], discover: [], browse: [],
      joined: Array.from({ length: 6 }, (_, i) => comm(`QA Density ${i + 1}`)),
    });

    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/communities');
    await expect(cardGrid(page).locator('> *').first()).toBeVisible({ timeout: 15_000 });
    expect(await columnCount(page)).toBe(2);

    await page.setViewportSize({ width: 1600, height: 1000 });
    await expect.poll(() => columnCount(page), { timeout: 10_000 }).toBe(4);
  });

  test('renders the banner at 2:1 and never ships a full-size image', { tag: '@auth' }, async ({ page }) => {
    await mockCommunityApis(page, {
      elite: [], discover: [], browse: [],
      joined: [comm('QA Banner')],
    });

    await page.goto('/communities');
    const img = cardGrid(page).locator('img').first();
    await expect(img).toBeVisible({ timeout: 15_000 });

    // The banner frame matches the "Add Banner" preview in the create modal.
    const box = await img.locator('xpath=..').boundingBox();
    expect(box).not.toBeNull();
    expect(box!.width / box!.height).toBeCloseTo(2, 1);

    // A Cloudinary-hosted banner must ask for a bounded width, never the
    // original. Local defaults carry no srcset, which is also correct.
    const srcset = await img.getAttribute('srcset');
    if (srcset) {
      for (const candidate of srcset.split(', ')) {
        expect(candidate).toMatch(/\/image\/upload\/[^/]*w_\d{2,3},/);
      }
    }
  });
});

test.describe('Communities page sections', () => {
  test('every section populates from a normal response', { tag: '@auth' }, async ({ page }) => {
    await mockCommunityApis(page, {
      elite: [comm('QA Elite One')],
      discover: [comm('QA Discover One')],
      browse: [comm('QA Browse One')],
      joined: [comm('QA Joined One')],
    });

    await page.goto('/communities');

    // Page shell rendered (not redirected to login, React mounted).
    await expect(page).not.toHaveURL(/\/login/);
    await expect(page.locator('#elite-communities')).toBeVisible({ timeout: 15_000 });

    // Each section shows its community.
    await expect(page.getByText('QA Elite One').first()).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText('QA Browse One').first()).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText('QA Discover One').first()).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText('QA Joined One').first()).toBeVisible({ timeout: 15_000 });

    // Section containers are present.
    await expect(page.locator('#discover-communities')).toBeVisible();
    await expect(page.locator('#browse-communities')).toBeVisible();
  });

  test('a malformed community does not blank the page', { tag: '@auth' }, async ({ page }) => {
    // Capture any uncaught page exception — a malformed community must not
    // produce one.
    const pageErrors: string[] = [];
    page.on('pageerror', (err) => pageErrors.push(err.message));

    // Each list mixes a valid community with malformed entries: null, missing
    // name, non-string name, and a bad tags/imageLink shape.
    const malformed: unknown[] = [
      null,
      { _id: 'no-name' },
      { _id: 'numeric-name', name: 12345 },
      { _id: 'bad-shape', name: { nested: true }, tags: 'not-an-array', imageLink: 99 },
    ];

    await mockCommunityApis(page, {
      elite: [comm('QA Elite Survivor'), ...malformed],
      discover: [comm('QA Discover Survivor'), ...malformed],
      browse: [comm('QA Browse Survivor'), ...malformed],
      joined: [comm('QA Joined Survivor'), ...malformed],
    });

    await page.goto('/communities');

    // The page still renders and the valid communities in each section survive.
    await expect(page).not.toHaveURL(/\/login/);
    // Elite is a single-card carousel sorted by name, so which card shows isn't
    // deterministic with junk-named entries mixed in — asserting the section
    // rendered (didn't blank) is the meaningful check there.
    await expect(page.locator('#elite-communities')).toBeVisible({ timeout: 15_000 });
    // The grid sections render every (valid) community, so the survivors must
    // appear even with malformed siblings present.
    await expect(page.getByText('QA Browse Survivor').first()).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText('QA Discover Survivor').first()).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText('QA Joined Survivor').first()).toBeVisible({ timeout: 15_000 });

    // No uncaught exception matching the malformed-parse crash signatures
    // (e.g. "...localeCompare", "Cannot read properties of undefined",
    // ".map is not a function"). We don't assert zero errors so unrelated
    // third-party script noise in the environment can't flake this.
    const parseCrashes = pageErrors.filter((m) =>
      /localecompare|cannot read propert|is not a function|is not iterable/i.test(m),
    );
    expect(parseCrashes, `parse-related page errors: ${parseCrashes.join(' | ')}`).toEqual([]);
  });
});

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

  test('asks for a whole number of rows and leaves none ragged', { tag: '@auth' }, async ({ page }) => {
    // The page size used to be a hardcoded 6 against a responsive grid, so four
    // columns gave a full row of four and a stranded row of two — which reads
    // as "that is everything" when there are more pages behind it.
    await mockCommunityApis(page, { elite: [], discover: [], browse: [], joined: [] });

    // Registered after mockCommunityApis so this handler wins: it honours the
    // limit the client asked for, which is the thing under test.
    const requestedLimits: number[] = [];
    await page.route('**/api/v2/user/*/communities**', (route) => {
      const limit = Number(new URL(route.request().url()).searchParams.get('limit') || 0);
      requestedLimits.push(limit);
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: Array.from({ length: limit }, (_, i) => comm(`QA Row ${i + 1}`)),
          totalCount: 40,
        }),
      });
    });

    await page.setViewportSize({ width: 1600, height: 1000 });
    await page.goto('/communities');
    await cardsSettled(page, '#your-communities');

    // Columns and card count read together in one evaluate: taken separately
    // the grid can re-render between the two calls, which made this flaky.
    const layout = await page.evaluate(() => {
      const grid = document.querySelector('#your-communities .grid');
      if (!grid) return { cols: 0, cards: 0 };
      const cards = [...grid.children];
      const top = Math.round(cards[0].getBoundingClientRect().top);
      return {
        cols: cards.filter((c) => Math.round(c.getBoundingClientRect().top) === top).length,
        cards: cards.length,
      };
    });

    // Four columns at this width, so a page must be a multiple of four.
    expect(layout.cols).toBe(4);
    expect(layout.cards).toBeGreaterThan(0);
    expect(layout.cards % layout.cols).toBe(0);

    // And the client must have asked the API for exactly that, not a fixed 6.
    expect(requestedLimits.length).toBeGreaterThan(0);
    for (const limit of requestedLimits) expect(limit % 4).toBe(0);
  });

  test('renders the banner at 2:1 and never ships a full-size image', { tag: '@auth' }, async ({ page }) => {
    await mockCommunityApis(page, {
      elite: [], discover: [], browse: [],
      joined: [comm('QA Banner')],
    });

    await page.goto('/communities');
    await cardsSettled(page, '#your-communities');
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

// Skeletons render into the same grid as real cards and carry no <h3>, so an
// assertion that runs while they are up either races a re-render or passes
// vacuously. Every check below waits for real cards first.
async function cardsSettled(page: Page, section: string) {
  // Reports what it actually saw, so a timeout says which state the section
  // was stuck in rather than just "0".
  await expect
    .poll(
      () =>
        page.evaluate((sel) => {
          const root = document.querySelector(sel);
          if (!root) return `no ${sel} on the page`;
          const grid = root.querySelector('.grid');
          if (!grid) return `${sel}: no .grid (empty state or login prompt: ${root.textContent?.trim().slice(0, 60)})`;
          const kids = [...grid.children];
          const withH3 = kids.filter((c) => !!c.querySelector('h3')).length;
          if (kids.length > 0 && withH3 === kids.length) return 'ready';
          return `${sel}: ${kids.length} children, ${withH3} are cards (rest still skeletons)`;
        }, section),
      { timeout: 15_000 }
    )
    .toBe('ready');
}

// comm() gives every fixture promotionalText, which means a grid built only
// from it has a promo panel on every card. The alignment checks need cards
// without one too, or they never exercise the case that broke.
function plainComm(name: string): Comm {
  const c = comm(name);
  delete (c as { promotionalText?: string }).promotionalText;
  return c;
}

test.describe('Community card consistency', () => {
  // Both of these shipped broken once. CommunitySection carried its own
  // `py-6 px-4` while YourCommunities and BrowseCommunities already supplied
  // theirs, so those two sections inset twice and their cards came out 157px
  // wide against Discover's 173px. And the card had optional blocks — a title
  // that ran to one or two lines, a tag row that might not be there — so no
  // two cards agreed on where the name, the member count or the button sat.

  const sections = ['#your-communities', '#discover-communities', '#browse-communities'];

  async function firstCardWidths(page: Page) {
    return page.evaluate((ids) => {
      const out: Record<string, number> = {};
      for (const id of ids) {
        const card = document.querySelector(`${id} .grid > *`);
        if (card) out[id] = Math.round(card.getBoundingClientRect().width);
      }
      return out;
    }, sections);
  }

  test('cards are the same width in every section', { tag: '@auth' }, async ({ page }) => {
    const many = (label: string) => Array.from({ length: 6 }, (_, i) => comm(`${label} ${i + 1}`));
    await mockCommunityApis(page, {
      elite: [], discover: many('QA Discover'), browse: many('QA Browse'), joined: many('QA Joined'),
    });

    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/communities');
    for (const section of sections) await cardsSettled(page, section);

    const widths = await firstCardWidths(page);
    const values = Object.values(widths);
    expect(values.length).toBeGreaterThan(1);
    for (const w of values) expect(w).toBe(values[0]);
  });

  test('name, meta and action sit at the same place on every card', { tag: '@auth' }, async ({ page }) => {
    // Mixed on purpose: with and without a tag, short and wrapping names.
    await mockCommunityApis(page, {
      elite: [], discover: [], browse: [],
      // Mixed on every axis that used to shift things: tag or no tag, name
      // that wraps or does not, promo panel or none.
      joined: [
        plainComm('QA Short'),
        { ...comm('QA A Much Longer Community Name That Wraps'), tags: ['Xbox'] },
        plainComm('QA Another'),
        { ...comm('QA Tagged'), tags: ['PC'] },
      ],
    });

    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/communities');
    await cardsSettled(page, '#your-communities');

    const offsets = await page.evaluate(() => {
      const cards = [...document.querySelectorAll('#your-communities .grid > *')];
      return cards.map((c) => {
        const top = c.getBoundingClientRect().top;
        const at = (sel: string) => {
          const el = c.querySelector(sel);
          return el ? Math.round(el.getBoundingClientRect().top - top) : -1;
        };
        const h3 = c.querySelector('h3');
        return {
          height: Math.round(c.getBoundingClientRect().height),
          title: at('h3'),
          // The title box must be a fixed two lines. When it was only a
          // minimum it grew on wrapping names and pushed everything below it
          // down, which surfaced as a drifting action and nothing else.
          titleHeight: h3 ? Math.round(h3.getBoundingClientRect().height) : -1,
          meta: at('.h-6'),
          action: at('button'),
        };
      });
    });

    expect(offsets.length).toBeGreaterThan(1);
    for (const o of offsets) {
      expect(o.height).toBe(offsets[0].height);
      expect(o.title).toBe(offsets[0].title);
      expect(o.titleHeight).toBe(offsets[0].titleHeight);
      expect(o.meta).toBe(offsets[0].meta);
      expect(o.action).toBe(offsets[0].action);
    }
  });
});

test.describe('Plan badge over the cover photo', () => {
  test('is translucent, so it does not black out the banner', { tag: '@auth' }, async ({ page }) => {
    await mockCommunityApis(page, {
      elite: [], discover: [], browse: [],
      joined: [{ ...comm('QA Elite'), subscription: { active: true, plan: 'elite' } }],
    });

    await page.goto('/communities');
    await cardsSettled(page, '#your-communities');

    const badge = page.locator('#your-communities .grid .absolute span').first();
    await expect(badge).toBeVisible();

    const bg = await badge.evaluate((el) => getComputedStyle(el).backgroundColor);
    // A solid gradient pill used to cover a third of the banner at 173px. Any
    // opaque fill here is a regression: rgb() with no alpha, or alpha of 1.
    const alpha = Number(bg.match(/[\d.]+/g)?.[3] ?? 1);
    expect(alpha).toBeLessThan(1);
    expect(alpha).toBeGreaterThan(0.3); // still dark enough to read against a light photo
  });
});

// The first-run welcome wizard renders as a fixed inset-0 overlay on
// /communities and swallows pointer events. Tests that only read the DOM are
// unaffected, which is why every other spec here passes with it up; a test that
// clicks is not. Suppressed by its own localStorage flag rather than by closing
// it, so the test exercises the promo panel and nothing else. The user id is
// part of the key and is not known here, hence the prefix match.
async function suppressWelcomeWizard(page: Page) {
  await page.addInitScript(() => {
    const real = Storage.prototype.getItem;
    Storage.prototype.getItem = function (key: string) {
      if (typeof key === 'string' && key.startsWith('lpc_welcome_modal_seen')) return 'true';
      return real.call(this, key);
    };
  });
}

test.describe('Elite promo panel', () => {
  const PROMO = 'QA Promo Community — promo text';
  const DETAIL = 'Three whitelisted servers and a full court system.';

  test('expands in place, and tapping it does not navigate away', { tag: '@auth' }, async ({ page }) => {
    const pageErrors: string[] = [];
    page.on('pageerror', (err) => pageErrors.push(err.message));

    await suppressWelcomeWizard(page);
    await mockCommunityApis(page, {
      elite: [], discover: [], browse: [],
      joined: [
        { ...comm('QA Promo Community'), promotionalDescription: DETAIL },
        plainComm('QA Plain Community'),
      ],
    });

    await page.goto('/communities');
    // A render crash here would empty the section, which reads identically to
    // a slow load; name it instead.
    await expect.poll(() => pageErrors.join(' | '), { timeout: 5_000 }).toBe('');
    await cardsSettled(page, '#your-communities');

    // Nothing should be covering the grid; a timeout inside click() names the
    // overlay only in the call log, which is easy to misread as a slow render.
    await expect(page.locator('.fixed.inset-0.z-50')).toHaveCount(0);

    // Only the community with promo copy gets a panel.
    const panels = page.locator('#your-communities .grid button[aria-expanded]');
    await expect(panels).toHaveCount(1);

    const detail = page.getByText(DETAIL);
    await expect(panels.first()).toHaveAttribute('aria-expanded', 'false');
    await expect(detail).not.toBeVisible();

    const urlBefore = page.url();
    await panels.first().click();

    await expect(panels.first()).toHaveAttribute('aria-expanded', 'true');
    await expect(detail).toBeVisible();
    // The whole card navigates on click; the panel must not.
    expect(page.url()).toBe(urlBefore);

    await panels.first().click();
    await expect(panels.first()).toHaveAttribute('aria-expanded', 'false');
  });

  test('promo copy without a description is not a control', { tag: '@auth' }, async ({ page }) => {
    await mockCommunityApis(page, {
      elite: [], discover: [], browse: [],
      joined: [comm('QA Promo Community')],
    });

    await page.goto('/communities');
    await cardsSettled(page, '#your-communities');

    // The line still shows, but there is nothing behind it to open.
    await expect(page.getByText(PROMO).first()).toBeVisible();
    await expect(page.locator('#your-communities .grid button[aria-expanded]')).toHaveCount(0);
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

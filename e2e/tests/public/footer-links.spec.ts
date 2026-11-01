/**
 * The footer's developer links, on every page that renders a footer.
 *
 * This exists because a previous change was reported as done after checking
 * `views/` alone. The pages people actually land on are served by Next and get
 * their footer from `components/Footer.tsx`, which still said "Developers" and
 * pointed at a personal site, with no link to the API at all. Checking one
 * template is not checking the footer; checking the rendered pages is.
 *
 * So these assertions run against the served HTML of each page rather than
 * against any source file, and they name the pages rather than the component,
 * because the component is an implementation detail that has already moved
 * once.
 */
import { test, expect } from '../../fixtures/test-fixtures';

const PAGES = ['/', '/faq', '/login', '/about-us', '/api-docs'];

const CREATOR_URL = 'https://linesmerrill.github.io/MerrillLines/';

test.describe('Footer developer links', () => {
  for (const path of PAGES) {
    test(`${path} links to the Developer API and to About the Creator`, async ({
      unauthPage: page,
    }) => {
      const response = await page.goto(path, { waitUntil: 'domcontentloaded' });
      expect(response?.status()).toBe(200);

      const footer = page.locator('footer');
      await expect(footer).toBeVisible({ timeout: 15_000 });

      // The API has its own entry, which it did not before.
      const api = footer.getByRole('link', { name: 'Developer API' });
      await expect(api).toBeVisible();
      await expect(api).toHaveAttribute('href', '/api-docs');

      // The personal site is still linked, but labelled as what it is. A
      // developer looking for the API should not land on someone's homepage
      // because the link said "Developers".
      const creator = footer.getByRole('link', { name: 'About the Creator' });
      await expect(creator).toBeVisible();
      await expect(creator).toHaveAttribute('href', CREATOR_URL);
      await expect(creator).toHaveAttribute('target', '_blank');
      // Opening a third-party site in a new tab without this hands it a
      // reference back to ours.
      await expect(creator).toHaveAttribute('rel', /noopener/);

      // The old label is gone, not merely joined by a new one.
      await expect(footer.getByRole('link', { name: 'Developers', exact: true })).toHaveCount(0);
    });
  }
});

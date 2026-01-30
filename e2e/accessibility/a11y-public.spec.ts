import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const PUBLIC_PAGES_FOR_A11Y = [
  '/',
  '/login',
  '/signup',
  '/about-us',
  '/pricing',
  '/faq',
  '/contact-us',
  '/privacy-policy',
  '/terms-and-conditions',
  '/discord-bot',
  '/forgot-password',
];

test.describe('Accessibility - Public Pages', () => {
  for (const pagePath of PUBLIC_PAGES_FOR_A11Y) {
    test(`${pagePath} has no critical accessibility violations`, async ({ page }) => {
      await page.goto(pagePath, { waitUntil: 'domcontentloaded' });

      // Allow page JS to settle
      await page.waitForTimeout(1000);

      const results = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa'])
        .disableRules(['color-contrast']) // Disable color-contrast due to dark theme
        .analyze();

      // Filter to only critical and serious violations
      const criticalViolations = results.violations.filter(
        (v) => v.impact === 'critical' || v.impact === 'serious'
      );

      if (criticalViolations.length > 0) {
        const summary = criticalViolations
          .map((v) => `[${v.impact}] ${v.id}: ${v.description} (${v.nodes.length} instances)`)
          .join('\n');
        console.log(`Accessibility violations on ${pagePath}:\n${summary}`);
      }

      expect(criticalViolations).toEqual([]);
    });
  }
});

import { test, expect } from '../../fixtures/test-fixtures';
import * as path from 'path';

// Unit-tests the client sentence calculator that powers the arrest form's live
// "Total Fine" / "Total Jail Time" and the consecutive/concurrent toggle. It
// mirrors the authoritative Go implementation (models/arrest_sentence.go). We
// load the script on about:blank (no CSP) and exercise the exposed helpers.
test.describe('Arrest sentence calculator (cd-action-forms.js)', () => {
  test('parses, totals (consecutive/concurrent), and formats jail time', async ({ unauthPage: page }) => {
    await page.goto('about:blank');
    await page.addScriptTag({ path: path.resolve(__dirname, '../../../public/js/cd-action-forms.js') });

    const r = await page.evaluate(() => {
      const w = window as unknown as {
        cdParseJailTime: (s: string) => { seconds: number; isLife: boolean };
        cdTotalJailTime: (c: Array<{ jailTime: string }>, mode: string) => { seconds: number; label: string };
        cdFormatDuration: (s: number) => string;
      };
      const charges = [{ jailTime: '30 seconds' }, { jailTime: '2 minutes' }];
      return {
        sixMonths: w.cdParseJailTime('6 months').seconds,
        naZero: w.cdParseJailTime('N/A').seconds,
        life: w.cdParseJailTime('Life').isLife,
        consecutive: w.cdTotalJailTime(charges, 'consecutive').label,
        concurrent: w.cdTotalJailTime(charges, 'concurrent').label,
        lifeOverride: w.cdTotalJailTime(charges.concat([{ jailTime: 'Life' }]), 'consecutive').label,
        format: w.cdFormatDuration(2592045),
        empty: w.cdFormatDuration(0),
      };
    });

    expect(r.sixMonths).toBe(6 * 2592000);
    expect(r.naZero).toBe(0);
    expect(r.life).toBe(true);
    expect(r.consecutive).toBe('2 minutes 30 seconds');
    expect(r.concurrent).toBe('2 minutes');
    expect(r.lifeOverride).toBe('Life');
    expect(r.format).toBe('1 month 45 seconds');
    expect(r.empty).toBe('None');
  });
});

import { Page, Locator, expect } from '@playwright/test';

/**
 * The owner-only Finance tab in the admin console (views/admin-console.ejs).
 *
 * Locators use the panel's data-testid attributes, so they survive styling
 * changes. Opening the tab runs initFinancePanel(), which loads the summary
 * and the bank status through the /admin/api/finance/* proxies; specs mock
 * those with page.route before calling open().
 */
export class AdminFinancePage {
  readonly page: Page;

  readonly financeTab: Locator;
  readonly errorBox: Locator;

  // Monthly P&L (cash basis from the bank feed).
  readonly plTable: Locator;
  readonly plTableBody: Locator;
  readonly sources: Locator;
  readonly bankEmpty: Locator;

  // Earned-revenue complement (Stripe / app-store subscriptions).
  readonly earnedTable: Locator;
  readonly earnedTableBody: Locator;

  // Bank connection card.
  readonly plaidStatus: Locator;
  readonly plaidAccounts: Locator;
  readonly plaidLastSync: Locator;
  readonly plaidConnectBtn: Locator;
  readonly plaidSyncBtn: Locator;
  readonly plaidToken: Locator;

  // Transactions and tagging.
  readonly txRows: Locator;
  readonly tagPicker: Locator;

  constructor(page: Page) {
    this.page = page;

    this.financeTab = page.locator('#finance-tab');
    this.errorBox = page.getByTestId('finance-error');

    this.plTable = page.getByTestId('finance-table');
    this.plTableBody = page.locator('#finTableBody');
    this.sources = page.getByTestId('finance-sources');
    this.bankEmpty = page.getByTestId('finance-bank-empty');

    this.earnedTable = page.getByTestId('finance-earned-table');
    this.earnedTableBody = page.locator('#finEarnedTableBody');

    this.plaidStatus = page.getByTestId('finance-plaid-status');
    this.plaidAccounts = page.getByTestId('finance-plaid-accounts');
    this.plaidLastSync = page.getByTestId('finance-plaid-last-sync');
    this.plaidConnectBtn = page.getByTestId('finance-plaid-connect');
    this.plaidSyncBtn = page.getByTestId('finance-plaid-sync');
    this.plaidToken = page.getByTestId('finance-plaid-token');

    this.txRows = page.getByTestId('finance-tx-row');
    this.tagPicker = page.getByTestId('finance-tag-picker');
  }

  /** A quick-range chip: 'this-month', 'last-month', '3', '6', '12' or 'ytd'. */
  preset(name: string): Locator {
    return this.page.getByTestId(`finance-preset-${name}`);
  }

  /** The profit cell for one month of the P&L, e.g. profitCell('2026-09'). */
  profitCell(month: string): Locator {
    return this.page.getByTestId(`finance-profit-${month}`);
  }

  /**
   * Go to the console and open the Finance tab. The tab only appears for
   * owners, so this fails fast for anyone else.
   */
  async open(): Promise<void> {
    await this.page.goto('/admin/console');
    await expect(this.financeTab).toBeVisible({ timeout: 15_000 });
    await this.financeTab.click();
  }
}

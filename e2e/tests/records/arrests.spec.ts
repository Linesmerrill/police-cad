import { test, expect } from '@playwright/test';
import {
  createTestArrestReport,
  getArrestReportById,
  deleteArrestReportsByPrefix,
} from '../../helpers/db';

const API_URL = process.env.POLICE_CAD_API_URL || 'http://localhost:8081';
const TEST_CIVILIAN_ID = 'cccccccccccccccccccccccc';

test.describe('Arrest report records', { tag: '@auth' }, () => {
  const PREFIX = 'P10Arrest';

  test.afterEach(async () => {
    await deleteArrestReportsByPrefix(PREFIX);
  });

  test('seeded arrest report is returned by /api/v1/arrest-report/arrestee endpoint', async ({ request }) => {
    const reportNumber = `${PREFIX}-${Date.now().toString(36)}`;
    const id = await createTestArrestReport({ reportNumber });

    const res = await request.get(
      `${API_URL}/api/v1/arrest-report/arrestee/${TEST_CIVILIAN_ID}?limit=100&page=0`
    );
    expect(res.ok()).toBe(true);
    const body = await res.json();
    const reports = body.data || body || [];
    const match = reports.find((r: { _id: string }) => r._id === id);
    expect(match, `seeded arrest report ${id} should be in arrestee list`).toBeTruthy();

    const dbRow = await getArrestReportById(id);
    expect(dbRow).toBeTruthy();
    expect(
      (dbRow as { arrestReport: { reportNumber: string } }).arrestReport.reportNumber
    ).toBe(reportNumber);
  });
});

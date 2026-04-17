import { test, expect } from '@playwright/test';
import {
  createTestMedicalReport,
  getMedicalReportById,
  deleteMedicalReportsByDetailsPrefix,
} from '../../helpers/db';

const API_URL = process.env.POLICE_CAD_API_URL || 'http://localhost:8081';
const TEST_CIVILIAN_ID = 'cccccccccccccccccccccccc';
const TEST_COMMUNITY_ID = 'bbbbbbbbbbbbbbbbbbbbbbbb';

test.describe('Medical report records', { tag: '@auth' }, () => {
  const PREFIX = 'P10Medical';

  test.afterEach(async () => {
    await deleteMedicalReportsByDetailsPrefix(PREFIX);
  });

  test('seeded medical report is returned by /api/v1/medical-reports list endpoint', async ({ request }) => {
    const details = `${PREFIX}-${Date.now().toString(36)} patient stable`;
    const id = await createTestMedicalReport({ details, hospitalized: true });

    const res = await request.get(
      `${API_URL}/api/v1/medical-reports?civilian_id=${TEST_CIVILIAN_ID}&active_community_id=${TEST_COMMUNITY_ID}&limit=100&page=0`
    );
    expect(res.ok()).toBe(true);
    const body = await res.json();
    const reports = body.medicalReports || body.data || [];
    const match = reports.find((r: { _id: string }) => r._id === id);
    expect(match, `seeded medical report ${id} should be in list`).toBeTruthy();

    const dbRow = await getMedicalReportById(id);
    expect(dbRow).toBeTruthy();
    expect(
      (dbRow as { report: { details: string } }).report.details
    ).toContain(PREFIX);
  });
});

import { test, expect } from '@playwright/test';
import {
  createTestTicket,
  getTicketByCaseNumber,
  deleteTicketsByCaseNumberPrefix,
} from '../../helpers/db';

const TEST_CIVILIAN_ID = 'cccccccccccccccccccccccc';

test.describe('Warning records', { tag: '@auth' }, () => {
  // A warning is a ticket with isWarning=true — they share the 'tickets' collection.
  const PREFIX = 'P10Warning';

  test.afterEach(async () => {
    await deleteTicketsByCaseNumberPrefix(PREFIX);
  });

  test('seeded warning (isWarning=true) is returned by /tickets and flagged correctly', async ({
    request,
    baseURL,
  }) => {
    const caseNumber = `${PREFIX}-${Date.now().toString(36)}`;
    const id = await createTestTicket({ caseNumber, isWarning: true });

    const res = await request.get(
      `${baseURL || 'http://localhost:8080'}/tickets?civID=${TEST_CIVILIAN_ID}`
    );
    expect(res.ok()).toBe(true);
    const tickets = await res.json();
    const match = tickets.find((t: { _id: string }) => t._id === id);
    expect(match, `seeded warning ${id} should be in list`).toBeTruthy();
    expect(match.ticket.isWarning).toBe(true);

    const dbRow = await getTicketByCaseNumber(caseNumber);
    expect(dbRow).toBeTruthy();
  });
});

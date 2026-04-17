import { test, expect } from '@playwright/test';
import {
  createTestTicket,
  getTicketByCaseNumber,
  deleteTicketsByCaseNumberPrefix,
} from '../../helpers/db';

const TEST_CIVILIAN_ID = 'cccccccccccccccccccccccc';

test.describe('Ticket records', { tag: '@auth' }, () => {
  const PREFIX = 'P10Ticket';

  test.afterEach(async () => {
    await deleteTicketsByCaseNumberPrefix(PREFIX);
  });

  test('seeded ticket is returned by website /tickets endpoint', async ({ request, baseURL }) => {
    const caseNumber = `${PREFIX}-${Date.now().toString(36)}`;
    const id = await createTestTicket({ caseNumber, isWarning: false });

    // The /tickets endpoint is a Node.js-side auth-gated Mongoose find on ticket.civID.
    const res = await request.get(
      `${baseURL || 'http://localhost:8080'}/tickets?civID=${TEST_CIVILIAN_ID}`
    );
    expect(res.ok()).toBe(true);
    const tickets = await res.json();
    const match = tickets.find((t: { _id: string }) => t._id === id);
    expect(match, `seeded ticket ${id} should be in list`).toBeTruthy();
    expect(match.ticket.caseNumber).toBe(caseNumber);
    expect(match.ticket.isWarning).toBe(false);

    const dbRow = await getTicketByCaseNumber(caseNumber);
    expect(dbRow).toBeTruthy();
  });
});

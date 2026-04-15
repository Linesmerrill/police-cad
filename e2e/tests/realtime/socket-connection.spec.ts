import { test, expect } from '../../fixtures/socket-fixture';
import { TEST_COMMUNITY_ID } from '../../helpers/seed';

test.describe('Socket.IO Connection', { tag: '@auth' }, () => {
  test('connects to the server via websocket', async ({ socket }) => {
    expect(socket.connected).toBe(true);
  });

  test('joins a community room and receives confirmation', async ({ socket }) => {
    const communityId = TEST_COMMUNITY_ID.toHexString();

    const joined = await new Promise<{ room: string; communityId: string }>((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('join_community_room timed out')), 5_000);

      socket.on('joined_room', (data: { room: string; communityId: string }) => {
        clearTimeout(timeout);
        resolve(data);
      });
      socket.on('room_error', (data: { error: string }) => {
        clearTimeout(timeout);
        reject(new Error(data.error));
      });

      socket.emit('join_community_room', { communityId });
    });

    expect(joined.room).toBe(`community:${communityId}`);
    expect(joined.communityId).toBe(communityId);
  });

  test('receives room_error when communityId is missing', async ({ socket }) => {
    const error = await new Promise<{ error: string }>((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('room_error timed out')), 5_000);

      socket.on('room_error', (data: { error: string }) => {
        clearTimeout(timeout);
        resolve(data);
      });

      socket.emit('join_community_room', {});
    });

    expect(error.error).toBe('Missing communityId');
  });
});

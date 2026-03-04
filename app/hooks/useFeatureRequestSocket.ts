'use client';

import { useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';

// Module-level singleton with reference counting
let sharedSocket: Socket | null = null;
let refCount = 0;

function getSocket(): Socket {
  if (!sharedSocket) {
    sharedSocket = io({ transports: ['websocket'] });
  }
  refCount++;
  return sharedSocket;
}

function releaseSocket(): void {
  refCount--;
  if (refCount <= 0 && sharedSocket) {
    sharedSocket.disconnect();
    sharedSocket = null;
    refCount = 0;
  }
}

type EventHandler = (data: any) => void;

interface UseFeatureRequestSocketOptions {
  room: 'listing' | 'detail';
  featureRequestId?: string;
  events: Record<string, EventHandler>;
}

export function useFeatureRequestSocket({
  room,
  featureRequestId,
  events,
}: UseFeatureRequestSocketOptions): void {
  const eventsRef = useRef(events);
  eventsRef.current = events;

  useEffect(() => {
    const socket = getSocket();

    const joinRoom = () => {
      if (room === 'listing') {
        socket.emit('join_feature_requests');
      } else if (room === 'detail' && featureRequestId) {
        socket.emit('join_feature_request', { id: featureRequestId });
      }
    };

    if (socket.connected) joinRoom();
    socket.on('connect', joinRoom);

    // Bind event listeners via ref to avoid stale closures
    const boundListeners: Array<[string, EventHandler]> = [];
    for (const eventName of Object.keys(eventsRef.current)) {
      const wrapper: EventHandler = (data) => {
        eventsRef.current[eventName]?.(data);
      };
      socket.on(eventName, wrapper);
      boundListeners.push([eventName, wrapper]);
    }

    return () => {
      if (room === 'listing') {
        socket.emit('leave_feature_requests');
      } else if (room === 'detail' && featureRequestId) {
        socket.emit('leave_feature_request', { id: featureRequestId });
      }
      for (const [eventName, wrapper] of boundListeners) {
        socket.off(eventName, wrapper);
      }
      socket.off('connect', joinRoom);
      releaseSocket();
    };
  }, [room, featureRequestId]);
}

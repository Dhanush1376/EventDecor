import { io as socketIO } from 'socket.io-client';
import { getAccessToken } from '../../services/api';
import { getWebSocketUrl } from '../../config/apiConfig';

/**
 * Shared singleton for the authenticated `/admin` realtime socket.
 *
 * The backend enforces a single active `/admin` socket per user and disconnects
 * duplicates (see backend socket.ts `enforceSingleAdminSession`). If more than one
 * component opens its own connection, those connections disconnect each other in a
 * permanent reconnect loop — wasting bandwidth and thrashing JWT verification on
 * every cycle. This module guarantees exactly one connection, ref-counted across
 * every admin component that needs realtime updates.
 *
 * Usage:
 *   const socket = acquireAdminSocket();
 *   const onFoo = () => {...};
 *   socket.on('foo', onFoo);
 *   // cleanup:
 *   socket.off('foo', onFoo);
 *   releaseAdminSocket();
 *
 * Always pair every acquire with exactly one release, and remove only the
 * listeners you added (never `socket.off()` with no args — that would strip other
 * components' handlers from the shared connection).
 */
let socket = null;
let refCount = 0;

export function acquireAdminSocket() {
  refCount += 1;
  if (!socket) {
    // Connect directly to the backend origin so the transport can upgrade to a
    // real WebSocket instead of long-polling through the same-origin proxy.
    socket = socketIO(`${getWebSocketUrl()}/admin`, {
      // Re-read the token on every (re)connect so refreshed sessions stay valid.
      auth: (cb) => cb({ token: getAccessToken() }),
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 15,
      reconnectionDelay: 5000,
    });
  }
  return socket;
}

export function releaseAdminSocket() {
  refCount = Math.max(0, refCount - 1);
  if (refCount === 0 && socket) {
    socket.disconnect();
    socket = null;
  }
}

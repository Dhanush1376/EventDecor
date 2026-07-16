import './setup';
import { describe, it, expect } from 'vitest';

import SessionAuthService from '../../src/services/SessionAuthService';
import RefreshToken from '../../src/models/RefreshToken';
import UsedRefreshToken from '../../src/models/UsedRefreshToken';
import User from '../../src/models/User';

const seedUser = async () =>
  User.create({
    name: 'Session User',
    email: `session_${Date.now()}_${Math.random().toString(36).slice(2)}@example.com`,
    password: 'hashed_placeholder_value',
    isVerified: true,
  } as any);

describe('SessionAuthService refresh-token rotation (integration)', () => {
  it('issues an access + refresh token and persists a session', async () => {
    const user = await seedUser();
    const session = await SessionAuthService.createSession(user as any, 'vitest-agent');

    expect(session.accessToken).toBeTruthy();
    expect(session.refreshToken).toBeTruthy();

    const stored = await RefreshToken.findOne({
      tokenHash: SessionAuthService.hashRefreshToken(session.refreshToken),
    });
    expect(stored).toBeTruthy();
    expect(stored!.userId.toString()).toBe(user._id.toString());
  });

  it('rotates the refresh token: old token is retired, a new one is issued', async () => {
    const user = await seedUser();
    const { refreshToken: original } = await SessionAuthService.createSession(user as any);

    const rotated = await SessionAuthService.refreshSession(original, 'vitest-agent');

    expect(rotated.refreshToken).toBeTruthy();
    expect(rotated.refreshToken).not.toBe(original);

    // Old session document is gone; the old token is recorded as used.
    const oldHash = SessionAuthService.hashRefreshToken(original);
    expect(await RefreshToken.findOne({ tokenHash: oldHash })).toBeNull();
    expect(await UsedRefreshToken.findOne({ tokenHash: oldHash })).toBeTruthy();

    // The rotated token is active.
    const newHash = SessionAuthService.hashRefreshToken(rotated.refreshToken);
    expect(await RefreshToken.findOne({ tokenHash: newHash })).toBeTruthy();
  });

  it('detects reuse outside the grace period and revokes the entire token family', async () => {
    const user = await seedUser();
    const { refreshToken: original } = await SessionAuthService.createSession(user as any);

    // First rotation consumes `original` and creates a new session.
    const rotated = await SessionAuthService.refreshSession(original);
    expect(await RefreshToken.countDocuments({ userId: user._id })).toBe(1);

    // Simulate the grace window having elapsed by backdating the used-token
    // record. `createdAt` is immutable under Mongoose timestamps, so write via
    // the raw driver to bypass that guard.
    await UsedRefreshToken.collection.updateOne(
      { tokenHash: SessionAuthService.hashRefreshToken(original) },
      { $set: { createdAt: new Date(Date.now() - 60_000) } },
    );

    // Replaying the already-used `original` must be treated as theft.
    await expect(SessionAuthService.refreshSession(original)).rejects.toMatchObject({
      statusCode: 401,
    });

    // Entire family revoked — even the legitimately rotated session is gone.
    expect(await RefreshToken.countDocuments({ userId: user._id })).toBe(0);
    const rotatedHash = SessionAuthService.hashRefreshToken(rotated.refreshToken);
    expect(await RefreshToken.findOne({ tokenHash: rotatedHash })).toBeNull();
  });

  it('returns 409 (not revocation) when the same token is replayed within the grace window', async () => {
    const user = await seedUser();
    const { refreshToken: original } = await SessionAuthService.createSession(user as any);

    await SessionAuthService.refreshSession(original); // consumes original, within grace now

    // Immediate replay (used-token createdAt is fresh) → concurrent-tab 409.
    await expect(SessionAuthService.refreshSession(original)).rejects.toMatchObject({
      statusCode: 409,
    });

    // The legitimately rotated session survives (no family revocation).
    expect(await RefreshToken.countDocuments({ userId: user._id })).toBe(1);
  });

  it('rejects an unknown/never-issued refresh token', async () => {
    await expect(SessionAuthService.refreshSession('totally-made-up-token')).rejects.toMatchObject({
      statusCode: 401,
    });
  });

  it('revokeSession removes only the targeted session, leaving others intact', async () => {
    const user = await seedUser();
    const a = await SessionAuthService.createSession(user as any, 'device-a');
    const b = await SessionAuthService.createSession(user as any, 'device-b');
    expect(await RefreshToken.countDocuments({ userId: user._id })).toBe(2);

    await SessionAuthService.revokeSession(a.refreshToken);

    expect(
      await RefreshToken.findOne({
        tokenHash: SessionAuthService.hashRefreshToken(a.refreshToken),
      }),
    ).toBeNull();
    expect(
      await RefreshToken.findOne({
        tokenHash: SessionAuthService.hashRefreshToken(b.refreshToken),
      }),
    ).toBeTruthy();
  });

  it('caps active sessions at 10, evicting the oldest', async () => {
    const user = await seedUser();
    for (let i = 0; i < 12; i++) {
      await SessionAuthService.createSession(user as any, `device-${i}`);
    }
    expect(await RefreshToken.countDocuments({ userId: user._id })).toBe(10);
  });

  it('rejects an expired session token', async () => {
    const user = await seedUser();
    const { refreshToken } = await SessionAuthService.createSession(user as any);

    // Force the session to be expired.
    await RefreshToken.updateOne(
      { tokenHash: SessionAuthService.hashRefreshToken(refreshToken) },
      { $set: { expiresAt: new Date(Date.now() - 1000) } },
    );

    await expect(SessionAuthService.refreshSession(refreshToken)).rejects.toMatchObject({
      statusCode: 401,
    });
  });
});

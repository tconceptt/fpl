/**
 * Once-only claims for the bot's two scheduled messages (Phase 5.5). A
 * claim is a Redis `SET NX` with a TTL, so two overlapping ticks can never
 * both send the same reminder or recap. Falls back to an in-process map
 * without Redis, which is enough for local development and tests.
 */

import { getRedis } from "@/lib/fpl/cache";

const KEY_PREFIX = "bot:v1:";

const memClaims = new Map<string, number>();

/** True when this call won the claim; false when it was already taken. */
export async function claimOnce(key: string, ttlSeconds: number): Promise<boolean> {
  const fullKey = KEY_PREFIX + key;
  const redis = getRedis();

  if (redis) {
    const result = await redis.set(fullKey, "1", { nx: true, ex: ttlSeconds });
    return result === "OK";
  }

  const expiresAt = memClaims.get(fullKey);
  if (expiresAt !== undefined && expiresAt > Date.now()) return false;
  memClaims.set(fullKey, Date.now() + ttlSeconds * 1000);
  return true;
}

/** Give a claim back, e.g. when the send it guarded failed and should be retried next tick. */
export async function releaseClaim(key: string): Promise<void> {
  const fullKey = KEY_PREFIX + key;
  const redis = getRedis();
  if (redis) {
    await redis.del(fullKey);
    return;
  }
  memClaims.delete(fullKey);
}

/** Test hook: forget every in-memory claim. */
export function resetMemoryClaims(): void {
  memClaims.clear();
}

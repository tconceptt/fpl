/**
 * Vitest global setup. The cache falls back to an in-process Map when Redis
 * env vars are absent, so the test suite must never see real Upstash
 * credentials — even if the developer running `npm test` has a `.env.local`
 * with them for `next dev`.
 */
delete process.env.KV_REST_API_URL;
delete process.env.KV_REST_API_TOKEN;

import { connect, disconnect } from '@ethica/db';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { buildApp } from './app.js';

// OPS-03/04/05: GET /metrics exposes register.metrics() (prom-client) without
// validToken (same unauthenticated pattern as /health).
// dbReqResTime/reqResTime are already registered in the default `register` on import
// of db.metric.ts/responseTime.middleware.ts — no new metric is created.
//
// Test order matters here: the prom-client `register` is a singleton
// per file (Vitest module cache); the OPS-05 test (empty histograms)
// must be the FIRST request of the file to prove "before any
// request went through responseTime" — the following tests will
// find series populated by previous calls, which does not invalidate
// OPS-03/04 (they only check that the metric names exist, not that they are empty).
describe('GET /metrics', () => {
  beforeAll(async () => {
    await connect(process.env.MONGODB_URI as string);
  });

  afterAll(async () => {
    await disconnect();
  });

  it('OPS-05: responds 200 with empty histograms (no sample lines yet) on the very first request of the process', async () => {
    const res = await request(buildApp()).get('/metrics');

    expect(res.status).toBe(200);
    expect(res.text).toContain('# HELP http_request_duration_seconds');
    expect(res.text).toContain('# HELP db_operation_duration_seconds');
    // No sample line yet (histograms without observations) — only
    // HELP/TYPE metadata, never series data.
    expect(res.text).not.toMatch(/http_request_duration_seconds_bucket\{/);
    expect(res.text).not.toMatch(/db_operation_duration_seconds_bucket\{/);
  });

  it('OPS-03: responds 200 with Content-Type text/plain; version=0.0.4; charset=utf-8 and includes the registered metric series', async () => {
    const res = await request(buildApp()).get('/metrics');

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toBe('text/plain; version=0.0.4; charset=utf-8');
    expect(res.text).toContain('db_operation_duration_seconds');
    expect(res.text).toContain('http_request_duration_seconds');
  });

  it('OPS-04: responds 200 with no Authorization header and no session cookie set (no validToken)', async () => {
    const res = await request(buildApp()).get('/metrics');

    expect(res.status).toBe(200);
  });
});

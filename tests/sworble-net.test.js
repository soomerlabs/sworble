// tests/sworble-net.test.js — run with: node tests/sworble-net.test.js
// Covers the Soomer web client core (SoomerNet: headers/retry/timeout/errors) and the
// sworble endpoints layer (SworbleApi: board validation, submit queue). All network is a
// fake fetch injected via setup(), all storage an in-memory shim — no real I/O.
'use strict';
const assert = require('assert');
const { SoomerNet, SworbleApi } = require('../sworble-net.js');

function memStorage() {
  const m = {};
  return {
    getItem: k => (Object.prototype.hasOwnProperty.call(m, k) ? m[k] : null),
    setItem: (k, v) => { m[k] = String(v); },
    removeItem: k => { delete m[k]; },
    _dump: () => ({ ...m }),
  };
}
function jsonResponse(status, body) {
  return { ok: status >= 200 && status < 300, status, json: async () => body };
}

(async () => {
  // --- unconfigured guard ---------------------------------------------------------
  SoomerNet.reset();
  assert.strictEqual(SoomerNet.isConfigured(), false);
  await assert.rejects(() => SoomerNet.fetchJSON('/sworble/v1/leaderboard/'), /not configured/i);

  // --- setup + headers + trailing-slash paths --------------------------------------
  {
    const calls = [];
    SoomerNet.setup({
      appId: 'test-app-uuid', environment: 'prod', appVersion: '0.1.0', retryBaseMs: 1,
      fetchFn: async (url, opts) => { calls.push({ url, opts }); return jsonResponse(200, { hello: 'world' }); },
    });
    assert.strictEqual(SoomerNet.isConfigured(), true);
    assert.strictEqual(SoomerNet.baseUrl(), 'https://api.soomerlabs.com');
    const data = await SoomerNet.fetchJSON('/sworble/v1/leaderboard/?date=2026-07-20');
    assert.deepStrictEqual(data, { hello: 'world' });
    assert.strictEqual(calls.length, 1);
    assert.strictEqual(calls[0].url, 'https://api.soomerlabs.com/sworble/v1/leaderboard/?date=2026-07-20');
    assert.strictEqual(calls[0].opts.headers['X-Soomer-Application-ID'], 'test-app-uuid');
    assert.strictEqual(calls[0].opts.headers['X-Soomer-Application-Version'], '0.1.0');
    assert.strictEqual(calls[0].opts.headers['Content-Type'], 'application/json');
  }

  // --- environments ----------------------------------------------------------------
  {
    SoomerNet.setup({ appId: 'x', environment: 'dev', fetchFn: async () => jsonResponse(200, {}) });
    assert.strictEqual(SoomerNet.baseUrl(), 'https://api.dev.soomerlabs.com');
    SoomerNet.setup({ appId: 'x', environment: 'local', fetchFn: async () => jsonResponse(200, {}) });
    assert.strictEqual(SoomerNet.baseUrl(), 'http://localhost:8000');
    assert.throws(() => SoomerNet.setup({ appId: 'x', environment: 'nope' }), /environment/i);
  }

  // --- retry: 3 attempts on 5xx/408/429, then typed error; no retry on plain 4xx ---
  {
    let n = 0;
    SoomerNet.setup({ appId: 'x', environment: 'prod', retryBaseMs: 1, fetchFn: async () => { n++; return jsonResponse(500, {}); } });
    await assert.rejects(() => SoomerNet.fetchJSON('/p/'), e => e.kind === 'server');
    assert.strictEqual(n, 3, '5xx retries to 3 total attempts');

    n = 0;
    SoomerNet.setup({ appId: 'x', environment: 'prod', retryBaseMs: 1, fetchFn: async () => { n++; return n < 3 ? jsonResponse(429, {}) : jsonResponse(200, { ok: 1 }); } });
    assert.deepStrictEqual(await SoomerNet.fetchJSON('/p/'), { ok: 1 });
    assert.strictEqual(n, 3, '429 retries and can recover');

    n = 0;
    SoomerNet.setup({ appId: 'x', environment: 'prod', retryBaseMs: 1, fetchFn: async () => { n++; return jsonResponse(404, {}); } });
    await assert.rejects(() => SoomerNet.fetchJSON('/p/'), e => e.kind === 'http' && e.status === 404);
    assert.strictEqual(n, 1, 'plain 4xx does not retry');

    n = 0;
    SoomerNet.setup({ appId: 'x', environment: 'prod', retryBaseMs: 1, fetchFn: async () => { n++; throw new TypeError('network down'); } });
    await assert.rejects(() => SoomerNet.fetchJSON('/p/'), e => e.kind === 'network');
    assert.strictEqual(n, 3, 'network errors retry');
  }

  // --- timeout ---------------------------------------------------------------------
  {
    SoomerNet.setup({
      appId: 'x', environment: 'prod', timeoutMs: 20, retryBaseMs: 1,
      fetchFn: (url, opts) => new Promise((resolve, reject) => {
        if (opts.signal) opts.signal.addEventListener('abort', () => reject(Object.assign(new Error('aborted'), { name: 'AbortError' })));
      }),
    });
    await assert.rejects(() => SoomerNet.fetchJSON('/p/'), e => e.kind === 'timeout');
  }

  // --- SworbleApi: board fetch validates shape into the stub contract ---------------
  {
    const good = { entries: [{ display_name: 'OTTO', score: 4774 }, { display_name: 'Z', score: 10 }], me: { display_name: 'PHIL', score: 15, rank: 17 }, count: 3 };
    SoomerNet.setup({ appId: 'x', environment: 'prod', retryBaseMs: 1, fetchFn: async () => jsonResponse(200, good) });
    SworbleApi.setup({ storage: memStorage(), playerId: 'pid-1' });
    const board = await SworbleApi.fetchBoard('2026-07-20', 'puzzle');
    assert.deepStrictEqual(board, { entries: [{ name: 'OTTO', score: 4774 }, { name: 'Z', score: 10 }], me: { name: 'PHIL', score: 15, rank: 17 }, count: 3 });

    // malformed payloads → null (caller keeps the local stub), never a throw
    for (const bad of [null, {}, { entries: 'nope' }, { entries: [{ display_name: 'A', score: 'high' }] }]) {
      SoomerNet.setup({ appId: 'x', environment: 'prod', retryBaseMs: 1, fetchFn: async () => jsonResponse(200, bad) });
      assert.strictEqual(await SworbleApi.fetchBoard('2026-07-20', 'puzzle'), null, 'bad payload -> null: ' + JSON.stringify(bad));
    }
    // network failure → null too
    SoomerNet.setup({ appId: 'x', environment: 'prod', retryBaseMs: 1, fetchFn: async () => { throw new TypeError('down'); } });
    assert.strictEqual(await SworbleApi.fetchBoard('2026-07-20', 'puzzle'), null);
  }

  // --- SworbleApi: submit sends proof-of-play, queues on failure, flushes later -----
  {
    const sent = [];
    const storage = memStorage();
    SoomerNet.setup({ appId: 'x', environment: 'prod', retryBaseMs: 1, fetchFn: async (url, opts) => { sent.push(JSON.parse(opts.body)); return jsonResponse(201, {}); } });
    SworbleApi.setup({ storage, playerId: 'pid-1' });
    const ok = await SworbleApi.submitScore({ date: '2026-07-20', mode: 'puzzle', displayName: 'PHIL', score: 15, seven: [{ word: 'apt', pts: 15 }] });
    assert.strictEqual(ok, true);
    assert.deepStrictEqual(sent[0], {
      date: '2026-07-20', mode: 'puzzle', player_id: 'pid-1', display_name: 'PHIL',
      score: 15, seven: [{ word: 'apt', pts: 15 }],
    }, 'wire payload is snake_case and carries the seven as proof-of-play');
    assert.strictEqual(SworbleApi.pendingCount(), 0);

    // failure → queued durably
    SoomerNet.setup({ appId: 'x', environment: 'prod', retryBaseMs: 1, fetchFn: async () => { throw new TypeError('down'); } });
    const ok2 = await SworbleApi.submitScore({ date: '2026-07-20', mode: 'puzzle', displayName: 'PHIL', score: 99, seven: [] });
    assert.strictEqual(ok2, false);
    assert.strictEqual(SworbleApi.pendingCount(), 1, 'failed submit lands in the queue');

    // flush retries the queue; success drains it
    const flushed = [];
    SoomerNet.setup({ appId: 'x', environment: 'prod', retryBaseMs: 1, fetchFn: async (url, opts) => { flushed.push(JSON.parse(opts.body)); return jsonResponse(201, {}); } });
    await SworbleApi.flushQueue();
    assert.strictEqual(SworbleApi.pendingCount(), 0);
    assert.strictEqual(flushed[0].score, 99);

    // queue survives re-setup with the same storage (durability across page loads)
    SoomerNet.setup({ appId: 'x', environment: 'prod', retryBaseMs: 1, fetchFn: async () => { throw new TypeError('down'); } });
    await SworbleApi.submitScore({ date: '2026-07-21', mode: 'puzzle', displayName: 'P', score: 1, seven: [] });
    SworbleApi.setup({ storage, playerId: 'pid-1' }); // fresh "page load", same storage
    assert.strictEqual(SworbleApi.pendingCount(), 1, 'queue is read back from storage');
    // a dead submission never wedges the queue: same-day resubmits replace, stale days drop
    await SworbleApi.submitScore({ date: '2026-07-21', mode: 'puzzle', displayName: 'P', score: 5, seven: [] });
    assert.strictEqual(SworbleApi.pendingCount(), 1, 'same day+mode replaces, never duplicates');
  }

  // --- unconfigured SworbleApi degrades to null/false, no throws --------------------
  {
    SoomerNet.reset();
    SworbleApi.setup({ storage: memStorage(), playerId: 'pid-1' });
    assert.strictEqual(await SworbleApi.fetchBoard('2026-07-20', 'puzzle'), null);
    assert.strictEqual(await SworbleApi.submitScore({ date: '2026-07-20', mode: 'puzzle', displayName: 'P', score: 1, seven: [] }), false);
    assert.strictEqual(SworbleApi.pendingCount(), 1, 'even unconfigured, the submit is queued for when the backend arrives');
  }

  console.log('sworble-net: all tests passed');
})().catch(e => { console.error(e); process.exit(1); });

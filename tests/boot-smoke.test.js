// tests/boot-smoke.test.js — run with: node tests/boot-smoke.test.js
//
// Road-to-9 Sprint 1 #2: headless boot smoke. Closes the integration gap every review
// named — every other test drives the PURE modules directly; nothing before this exercised
// index.html's inline DC script (the ~6.3k-line Component class) actually booting under its
// real runtime (support.js).
//
// LEVEL ACHIEVED: full real boot, not the documented fallback. A genuine first attempt at
// mounting the REAL template + REAL support.js dc-runtime succeeded outright (no jsdom/runtime
// gap forced a retreat to a stubbed instance), so this test does both:
//   1. Boots the ACTUAL <x-dc> template + the ACTUAL extracted Component script through the
//      REAL support.js runtime (ReactDOM.createRoot, the real registry, the real
//      componentDidMount side effects) in a jsdom window — asserts it mounts with zero
//      uncaught errors and no dc-runtime error banner.
//   2. Separately evaluates the SAME extracted script text a second time (same technique
//      support.js's own evalDcLogic uses internally: `new Function(...)`, but via the
//      window's OWN Function constructor so free variables resolve against the window's
//      globals) to get a bare, unmounted Component instance and call renderVals() on it
//      directly — a robust, mount-timing-independent assertion on the home-state vals shape,
//      instead of scraping React's internal fiber tree for the live instance.
//
// Extraction is marker-based (precedent: the T3 decomposition's `<script data-dc-script>`
// node --check discipline) — find the literal `<script type="text/x-dc" data-dc-script`
// open tag and the LAST `</script>` in the file (verified: the extracted body itself never
// contains a literal `</script>` substring, so this is unambiguous).
//
// index.html's inline script isn't require()'d by any test, so `npm run coverage` (c8) never
// instruments it — this test proves it BOOTS, it doesn't contribute to the coverage number.
//
// Shims (all minimal, no real network — everything either preloaded via window.eval or
// served from local files by a stub `fetch`):
//   • fetch          → serves ./dailies.json, ./dictionary.txt, ./ScreenHeader.dc.html (the
//                       one <dc-import> sibling the template references) from disk; anything
//                       else 404s (matches the app's own "offline" degradation paths — every
//                       call site is already try/catch or .catch()-guarded for exactly this).
//   • matchMedia      → inert stub (jsdom's own throws "not implemented" on some queries).
//   • document.fonts  → inert stub (ready/check/load no-ops) if jsdom didn't provide one.
//   • Audio           → inert stub (play()/pause() no-ops); the app never calls `new Audio`
//                       today, but the shim is here per the sprint plan regardless.
//   • requestAnimationFrame/cancelAnimationFrame → setTimeout-based, only if jsdom (even with
//                       pretendToBeVisual) didn't already provide real ones.
//   • localStorage    → NOT shimmed — jsdom provides a real one for an http: origin URL, and
//                       SworbleStore already has its own in-memory fallback if it didn't.
//   • window.__resources = {} → skips support.js's internal self-refetch of location.href
//                       (harmless with the fetch shim above regardless, but avoids relying
//                       on that 404 fallback path at all).
//   • window.__SWORBLE_WORDS → the app's OWN documented override hook (index.html) for
//                       skipping words.js's dynamic import() (an ES module — can't be
//                       window.eval'd directly); set to the real FALLBACK_WORDS string,
//                       extracted from words.js the SAME way the app's own standalone-build
//                       fallback parser does.
'use strict';
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

const ROOT = path.join(__dirname, '..');
const INDEX_HTML = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');

// ---- marker-based extraction --------------------------------------------------------
const SCRIPT_START_MARKER = '<script type="text/x-dc" data-dc-script';
const scriptOpenIdx = INDEX_HTML.indexOf(SCRIPT_START_MARKER);
assert.notStrictEqual(scriptOpenIdx, -1, 'extractor: could not find the DC script open tag — has index.html\'s structure changed?');
const scriptTagCloseIdx = INDEX_HTML.indexOf('>', scriptOpenIdx) + 1;
const scriptEndIdx = INDEX_HTML.lastIndexOf('</script>');
assert.ok(scriptEndIdx > scriptTagCloseIdx, 'extractor: could not find the DC script close tag');
const dcScriptSrc = INDEX_HTML.slice(scriptTagCloseIdx, scriptEndIdx);

const xdcOpenIdx = INDEX_HTML.indexOf('<x-dc>');
const xdcCloseIdx = INDEX_HTML.indexOf('</x-dc>');
assert.ok(xdcOpenIdx !== -1 && xdcCloseIdx !== -1, 'extractor: could not find <x-dc>...</x-dc>');
let xdcBlock = INDEX_HTML.slice(xdcOpenIdx, xdcCloseIdx + '</x-dc>'.length);
// strip <helmet>...</helmet>: its <script src>/<link> children are preloaded manually below
// (deterministic window.eval, zero jsdom resource-loader/network involvement either way).
xdcBlock = xdcBlock.replace(/<helmet>[\s\S]*?<\/helmet>\n?/, '');
assert.ok(!/<helmet>/.test(xdcBlock), 'extractor: <helmet> block should have been stripped');

const bodyHtml = xdcBlock + '\n' + INDEX_HTML.slice(scriptOpenIdx, scriptEndIdx + '</script>'.length);

// words.js is a real ES module (`export const FALLBACK_WORDS = ...`) — can't be window.eval'd
// as a plain script. Pull the string out the SAME way the app's own standalone-build fallback
// parser does (index.html, loadDict(): `txt.match(/FALLBACK_WORDS\s*=\s*(["'`])([\s\S]*?)\1/)`).
const wordsJsSrc = fs.readFileSync(path.join(ROOT, 'words.js'), 'utf8');
const fwMatch = /FALLBACK_WORDS\s*=\s*(["'`])([\s\S]*?)\1/.exec(wordsJsSrc);
assert.ok(fwMatch, 'could not extract FALLBACK_WORDS from words.js');
const FALLBACK_WORDS = fwMatch[2];

const PURE_MODULES = [
  'sworble-core.js', 'sworble-store.js', 'sworble-run.js', 'sworble-status.js',
  'sworble-seed.js', 'sworble-daily.js', 'sworble-flow.js', 'sworble-net.js', 'sworble-solver.js',
];

// Home-state renderVals() keys a fresh, never-played-today boot must produce — a mix of
// score-strip HUD fields, the countdown pill, and the home CTA. Not exhaustive (there are
// 300+ keys); just enough to prove the REAL renderVals() ran, not a stub returning `{}`.
const EXPECTED_HOME_KEYS = [
  'homeCountdownText', 'homePlayLabel', 'scoreValStyle', 'topText', 'topValStyle',
  'bestValStyle', 'wordsLabel', 'recapLine', 'dailyLine',
];

async function main() {
  const dom = new JSDOM('<!doctype html><html><head></head><body></body></html>', {
    url: 'http://localhost/index.html',
    runScripts: 'dangerously',
    pretendToBeVisual: true,
  });
  const win = dom.window;

  // ---- shims ------------------------------------------------------------------------
  win.__resources = {}; // see file header
  win.__SWORBLE_WORDS = FALLBACK_WORDS;

  const localFiles = {
    './dailies.json': path.join(ROOT, 'dailies.json'),
    './dictionary.txt': path.join(ROOT, 'dictionary.txt'),
    './ScreenHeader.dc.html': path.join(ROOT, 'ScreenHeader.dc.html'),
  };
  win.fetch = async (url) => {
    const clean = String(url).split('?')[0];
    const file = localFiles[clean];
    if (file && fs.existsSync(file)) {
      const text = fs.readFileSync(file, 'utf8');
      return { ok: true, status: 200, text: async () => text, json: async () => JSON.parse(text) };
    }
    return { ok: false, status: 404, text: async () => '', json: async () => { throw new Error('not found: ' + url); } };
  };

  Object.defineProperty(win, 'matchMedia', {
    value: () => ({
      matches: false, media: '', addListener() {}, removeListener() {},
      addEventListener() {}, removeEventListener() {}, dispatchEvent() { return false; },
    }),
    writable: true, configurable: true,
  });

  win.document.fonts = win.document.fonts || { ready: Promise.resolve(), check: () => true, load: async () => [] };
  win.Audio = win.Audio || function Audio() { return { play() { return Promise.resolve(); }, pause() {} }; };
  win.requestAnimationFrame = win.requestAnimationFrame || ((cb) => setTimeout(() => cb(Date.now()), 16));
  win.cancelAnimationFrame = win.cancelAnimationFrame || (() => {});

  // ---- preload pure modules + vendor React, in index.html's <helmet> script order ---
  for (const f of PURE_MODULES) win.eval(fs.readFileSync(path.join(ROOT, f), 'utf8'));
  for (const m of ['SworbleCore', 'SworbleStore', 'SworbleRun', 'SworbleStatus', 'SworbleSeed', 'SworbleDaily', 'SworbleFlow', 'SoomerNet', 'SworbleApi', 'SworbleSolver']) {
    assert.ok(win[m], 'pure module global missing after preload: ' + m);
  }
  win.eval(fs.readFileSync(path.join(ROOT, 'vendor/react.production.min.js'), 'utf8'));
  win.eval(fs.readFileSync(path.join(ROOT, 'vendor/react-dom.production.min.js'), 'utf8'));
  assert.ok(win.React && win.ReactDOM, 'vendor React/ReactDOM UMDs failed to attach to window');

  // ---- set the body BEFORE support.js boots (it looks for x-dc + the DC script on load) --
  win.document.body.innerHTML = bodyHtml;

  const windowErrors = [];
  win.addEventListener('error', (e) => { windowErrors.push((e.error && e.error.stack) || e.message || String(e)); });

  win.eval(fs.readFileSync(path.join(ROOT, 'support.js'), 'utf8'));

  // support.js's boot is async (loadReactUmd().then(init)) even when React is preloaded
  // (still a microtask hop) — poll for the boot-complete flag index.html itself sets at the
  // end of componentDidMount, generously bounded.
  const deadline = Date.now() + 5000;
  while (!win.__sworbleBooted && Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, 20));
  }
  // componentDidMount's own async tails (loadDict/loadDailies/loadHomeLb — none awaited, all
  // fire-and-forget) keep re-rendering for a beat after __sworbleBooted flips; give them a
  // moment to settle so the mounted-tree assertions below see a stable, fully-hydrated snapshot
  // rather than racing an in-flight microtask.
  await new Promise((r) => setTimeout(r, 200));

  // ---- assertion block 1: the REAL runtime boot -------------------------------------
  assert.deepStrictEqual(windowErrors, [], 'boot must not throw any uncaught error: ' + JSON.stringify(windowErrors));
  assert.strictEqual(win.__sworbleBooted, true, 'componentDidMount never reached its final boot-flag line within the timeout');
  const dcRoot = win.document.getElementById('dc-root');
  assert.ok(dcRoot, 'support.js must replace <x-dc> with a #dc-root mount host');
  assert.ok(dcRoot.innerHTML.length > 1000, 'the mounted tree looks suspiciously empty (' + dcRoot.innerHTML.length + ' chars)');
  assert.ok(!dcRoot.innerHTML.includes('sc-has-error'), 'dc-runtime rendered its own error boundary UI (circular import / registry failure)');
  assert.ok(!dcRoot.innerHTML.includes('sc-logic-error'), 'dc-runtime rendered a logic-error banner (Component construction/render threw)');

  // ---- assertion block 2: direct renderVals() on a fresh instance -------------------
  // Same `new Function(...)` technique support.js's own evalDcLogic() uses internally, but
  // via the WINDOW's Function constructor (not Node's) so the extracted script's bare free
  // variables (SworbleCore, LS, K, FOUL, ...) resolve against window globals, exactly like a
  // real <script> would. Independent of the live mounted instance / React fiber tree.
  const Component = new win.Function('DCLogic', 'StreamableLogic', 'React',
    dcScriptSrc + '\n;return (typeof Component!=="undefined"&&Component)||undefined;'
  )(win.DCLogic, win.StreamableLogic, win.React);
  assert.strictEqual(typeof Component, 'function', 'extracted script must define a Component class');

  const inst = new Component({});
  assert.strictEqual(typeof inst.renderVals, 'function');
  const vals = inst.renderVals();
  assert.strictEqual(typeof vals, 'object');
  assert.ok(vals && !Array.isArray(vals), 'renderVals() must return a plain object');
  assert.ok(Object.keys(vals).length > 100, 'renderVals() returned suspiciously few keys (' + Object.keys(vals).length + ') — looks like a stub, not the real component');
  for (const k of EXPECTED_HOME_KEYS) assert.ok(k in vals, 'expected home-state key missing from renderVals(): ' + k);

  assert.strictEqual(inst.state.screen, 'home', 'boot lands on home (per componentDidMount\'s own comment)');
  assert.match(vals.homeCountdownText, /^\d+:\d{2}:\d{2}$/, 'homeCountdownText must be an H:MM:SS string: ' + JSON.stringify(vals.homeCountdownText));
  assert.strictEqual(vals.homePlayLabel, 'PLAY', 'a fresh, never-played-today instance shows the plain PLAY label');

  console.log('boot-smoke: real dc-runtime boot (0 errors, ' + dcRoot.innerHTML.length + ' chars mounted) + renderVals() (' + Object.keys(vals).length + ' keys) both passed');
  process.exit(0); // componentDidMount schedules an rAF loop + 1s timers — force exit so the pending handles never hang the test runner
}

main().catch((e) => { console.error(e); process.exit(1); });

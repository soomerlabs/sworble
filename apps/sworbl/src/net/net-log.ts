// DEV NETWORK LOG (owner: "show me the supabase functions we are
// calling") — a fetch interceptor that records every supabase-bound
// request (functions, REST, auth) into a memory ring. DEV ONLY: the
// interceptor never installs in release builds; zero cost there.
const IS_DEV = typeof __DEV__ !== 'undefined' && __DEV__;

export interface NetEntry {
  ts: number;
  method: string;
  path: string; // pathname only — keys/tokens never logged
  status: number | 'ERR';
  ms: number;
}

const RING_MAX = 60;
const ring: NetEntry[] = [];
let installed = false;

export function getNetLog(): NetEntry[] {
  return [...ring].reverse(); // newest first
}

export function clearNetLog(): void {
  ring.length = 0;
}

export function installNetLog(baseUrl: string): void {
  if (!IS_DEV || installed || !baseUrl) return;
  installed = true;
  const orig = global.fetch;
  global.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const url =
      typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
    if (!url.startsWith(baseUrl)) return orig(input as never, init);
    const method = init?.method ?? (typeof input === 'object' && 'method' in input ? input.method : 'GET');
    const started = Date.now();
    const push = (status: number | 'ERR') => {
      let path = url;
      try {
        const u = new URL(url);
        path = u.pathname + (u.search.length > 1 ? '?' + u.search.slice(1, 61) : '');
      } catch {}
      ring.push({ ts: started, method: method.toUpperCase(), path, status, ms: Date.now() - started });
      if (ring.length > RING_MAX) ring.shift();
    };
    try {
      const res = await orig(input as never, init);
      push(res.status);
      return res;
    } catch (e) {
      push('ERR');
      throw e;
    }
  };
}

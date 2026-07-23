// Storage backing — NATIVE: MMKV behind the engine store's setBacking seam
// (PHASE2 #8). MMKV is synchronous like localStorage, so the engine's typed
// helpers (getInt/getJSON/keys/age-GC) work unchanged on top of it.
import { createMMKV } from 'react-native-mmkv';
import engine from '@sworbl/engine';

const mmkv = createMMKV({ id: 'sworbl' });

export function initStorage(): void {
  engine.store.setBacking({
    getItem: (k: string) => {
      const v = mmkv.getString(k);
      return v === undefined ? null : v;
    },
    setItem: (k: string, v: string) => mmkv.set(k, String(v)),
    removeItem: (k: string) => {
      mmkv.remove(k);
    },
    key: (i: number) => mmkv.getAllKeys()[i] ?? null,
    get length() {
      return mmkv.getAllKeys().length;
    },
  });
}

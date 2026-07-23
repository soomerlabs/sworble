// Full-dictionary loader: the 135k list rides the APP BUNDLE as a Metro asset
// (single source: the repo-root dictionary.txt the web app fetches). Native
// reads the bundled file; web fetches the emitted asset URL. Fire-and-forget
// at boot — validation runs on the starter until the swap lands (seconds).
import { Asset } from 'expo-asset';
import * as FileSystem from 'expo-file-system/legacy';
import { applyFullDictionary } from './dict';

export async function loadFullDictionary(): Promise<number> {
  try {
    const asset = Asset.fromModule(require('../../../../dictionary.txt'));
    await asset.downloadAsync(); // no-op when already bundled locally
    const uri = asset.localUri || asset.uri;
    if (!uri) return 0;
    // dev-mode native serves assets over http (Metro) — read file:// via the
    // filesystem, anything else via fetch (the Invalid-URL bug on device)
    const text = uri.startsWith('file://')
      ? await FileSystem.readAsStringAsync(uri)
      : await (await fetch(uri)).text();
    return applyFullDictionary(text);
  } catch (e) {
    // starter dictionary keeps the game fully playable — log and move on
    console.warn('full dictionary load failed; starter stays active', e);
    return 0;
  }
}

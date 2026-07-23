// Storage backing — WEB: the engine store already binds localStorage (with its
// in-memory fallback) at load; nothing to inject. This no-op keeps the call
// site platform-agnostic.
export function initStorage(): void {}

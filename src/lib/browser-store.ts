import { useSyncExternalStore } from 'react';

// A list a shopper keeps in this browser's localStorage, without an account: the favorites, the
// cart. The server and the first render see it empty, so no page reads a cookie; the browser's list
// arrives on hydration. Another tab's change comes with the `storage` event. `parse` reads whatever
// is kept as far as it is such a list.
export function browserStore<T>(
  key: string,
  parse: (text: string | null) => T[],
) {
  const none: T[] = [];
  const listeners = new Set<() => void>();
  let kept: { text: string | null; items: T[] } = { text: null, items: none };
  // Storage blocked (a private window): the list lasts until the page reloads.
  let memory: T[] | null = null;

  function read() {
    if (memory) return memory;
    let text: string | null;
    try {
      text = localStorage.getItem(key);
    } catch {
      return none;
    }
    // The same list for the same text: React re-renders when the snapshot changes.
    if (text !== kept.text) kept = { text, items: parse(text) };
    return kept.items;
  }

  function write(items: T[]) {
    try {
      localStorage.setItem(key, JSON.stringify(items));
    } catch {
      memory = items;
    }
    for (const listener of listeners) listener();
  }

  function subscribe(listener: () => void) {
    const other = (event: StorageEvent) => {
      if (event.key === key || event.key === null) listener();
    };
    listeners.add(listener);
    window.addEventListener('storage', other);
    return () => {
      listeners.delete(listener);
      window.removeEventListener('storage', other);
    };
  }

  const useStore = () => useSyncExternalStore(subscribe, read, () => none);

  return { read, write, use: useStore };
}

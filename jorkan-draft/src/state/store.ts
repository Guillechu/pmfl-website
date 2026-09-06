import { useSyncExternalStore } from 'react';

/**
 * Minimal observable store.
 *
 * Deliberately not a state library: the draft runs for hours and the only
 * thing that must be fast is publishing a new immutable DraftState to React.
 */
export class Store<T> {
  private listeners = new Set<() => void>();

  constructor(private state: T) {}

  get = (): T => this.state;

  set = (next: T): void => {
    if (Object.is(next, this.state)) return;
    this.state = next;
    for (const listener of [...this.listeners]) listener();
  };

  update = (fn: (current: T) => T): void => {
    this.set(fn(this.state));
  };

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };
}

export function useStore<T>(store: Store<T>): T {
  return useSyncExternalStore(store.subscribe, store.get, store.get);
}

export function useStoreSelector<T, S>(store: Store<T>, select: (state: T) => S): S {
  return useSyncExternalStore(
    store.subscribe,
    () => select(store.get()),
    () => select(store.get()),
  );
}

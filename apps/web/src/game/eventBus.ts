import type { GameEvent } from '@ethergrove/core';

type EventOf<T extends GameEvent['type']> = Extract<GameEvent, { type: T }>;
type Listener = (event: GameEvent) => void;

export interface EventBus {
  on<T extends GameEvent['type']>(type: T, fn: (event: EventOf<T>) => void): () => void;
  onAny(fn: Listener): () => void;
  emit(events: readonly GameEvent[]): void;
}

export function createEventBus(): EventBus {
  const byType = new Map<string, Set<Listener>>();
  const any = new Set<Listener>();
  return {
    on(type, fn) {
      const set = byType.get(type) ?? new Set<Listener>();
      byType.set(type, set);
      const listener = fn as Listener;
      set.add(listener);
      return () => set.delete(listener);
    },
    onAny(fn) {
      any.add(fn);
      return () => any.delete(fn);
    },
    emit(events) {
      for (const e of events) {
        byType.get(e.type)?.forEach((fn) => {
          fn(e);
        });
        any.forEach((fn) => {
          fn(e);
        });
      }
    },
  };
}

export const eventBus = createEventBus();

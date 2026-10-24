import type { GameEvent, ItemStack } from '@hearthvale/core';
import type { StoreApi } from 'zustand/vanilla';
import type { EventBus } from '../game/eventBus';
import type { GameStore } from '../game/store';
import { installLessonBridge } from './lessons/lessonStore';
import { toastStore } from './toastStore';
import { uiStore } from './uiStore';

const FAIL_TEXT: Partial<Record<Extract<GameEvent, { type: 'actionFailed' }>['reason'], string>> = {
  noStamina: "You're too tired. Eat something or get some sleep.",
  canEmpty: 'The watering can is empty. Refill it at the pond.',
  bagFull: 'Your bag is full. Ship or move some items.',
  cartClosed: "Sol's cart is open 9 AM to 5 PM, spring to fall.",
  wrongSeason: "Those seeds won't grow this season.",
  notEnoughGold: 'Not enough gold.',
  notHungry: "You're already full of energy.",
};

const MILESTONE_TEXT: Record<string, string> = {
  firstTill: 'Your first furrow.',
  firstPlant: 'First seeds in the ground. Water them every day.',
  firstShipment: 'Your first shipment sold!',
  gold1k: '1,000 gold saved.',
  gold10k: '10,000 gold. Grandpa would be proud.',
  allCrops: "You've grown every crop in the valley.",
  fullYear: 'A full year on the farm.',
};

/** Connects core events to overlays, toasts and lessons. */
export function installUiBridge(store: StoreApi<GameStore>, bus: EventBus): () => void {
  let lastFail = { reason: '', at: 0 };
  let pendingReport: { items: ItemStack[]; total: number } | null = null;
  const offs = [
    bus.on('openUi', (e) => {
      store.getState().setOverlay(e.ui);
    }),
    bus.on('shippingReport', (e) => {
      pendingReport = e.total > 0 ? { items: e.items, total: e.total } : null;
    }),
    bus.on('dayStarted', () => {
      if (!pendingReport) return;
      uiStore.getState().setReport(pendingReport);
      pendingReport = null;
      store.getState().setOverlay('morning');
    }),
    bus.on('passedOut', () => {
      toastStore
        .getState()
        .push('You passed out from exhaustion and woke up at home.', 'warn', 5000);
    }),
    bus.on('milestoneReached', (e) => {
      const text = MILESTONE_TEXT[e.id];
      if (text) toastStore.getState().push(text, 'magic');
    }),
    bus.on('actionFailed', (e) => {
      const text = FAIL_TEXT[e.reason];
      const now = performance.now();
      if (!text || (lastFail.reason === e.reason && now - lastFail.at < 1500)) return;
      lastFail = { reason: e.reason, at: now };
      toastStore.getState().push(text, 'warn');
    }),
  ];
  const offLessons = installLessonBridge(store, bus);
  return () => {
    offs.forEach((off) => {
      off();
    });
    offLessons();
  };
}

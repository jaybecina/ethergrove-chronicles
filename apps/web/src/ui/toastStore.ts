import { useStore } from 'zustand';
import { createStore } from 'zustand/vanilla';

export interface Toast {
  id: number;
  text: string;
  tone: 'info' | 'warn' | 'magic';
}

interface ToastState {
  toasts: Toast[];
  push(text: string, tone?: Toast['tone'], ms?: number): void;
  dismiss(id: number): void;
}

let nextId = 1;

export const toastStore = createStore<ToastState>()((set, get) => ({
  toasts: [],
  push(text, tone = 'info', ms = 3500) {
    const id = nextId++;
    set({ toasts: [...get().toasts.slice(-2), { id, text, tone }] });
    setTimeout(() => {
      get().dismiss(id);
    }, ms);
  },
  dismiss(id) {
    set({ toasts: get().toasts.filter((t) => t.id !== id) });
  },
}));

export const useToasts = () => useStore(toastStore, (s) => s.toasts);

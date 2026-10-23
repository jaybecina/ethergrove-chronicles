import { toastStore } from '../ui/toastStore';
import { createIdbRepository } from './idbRepository';
import { createResilientRepository } from './resilient';

/** The app's save repository: IndexedDB, falling back to memory if storage is blocked. */
export const saveRepo = createResilientRepository(createIdbRepository(), () => {
  toastStore
    .getState()
    .push("Saving isn't available here. Progress lasts until you close the tab.", 'warn', 6000);
});

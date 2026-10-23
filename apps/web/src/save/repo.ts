import { createIdbRepository } from './idbRepository';

/** The app's save repository (IndexedDB). Tests pass their own. */
export const saveRepo = createIdbRepository();

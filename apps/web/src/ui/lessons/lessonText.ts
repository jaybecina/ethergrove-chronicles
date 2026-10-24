import type { LessonId, NoteId } from '@hearthvale/core';

export interface LessonCopy {
  title: string;
  body: string;
}

/** Spec Appendix A.1, verbatim. */
export const LESSON_TEXT: Record<LessonId, LessonCopy> = {
  walkToField: {
    title: 'Walk to the field',
    body: 'The old field lies north of where you stand. Walk up and take a look.',
  },
  till: {
    title: 'Break some ground',
    body: "Grass won't take seeds. Pick the hoe and turn three patches of grass into soil.",
  },
  plant: {
    title: 'Plant your turnips',
    body: 'Turnips are forgiving. Pick the seed pouch, face the soil, and tuck a seed into each patch.',
  },
  water: {
    title: 'Water the seedlings',
    body: 'Seeds are thirsty. Pick the watering can and give every planted patch a drink.',
  },
  sleep: {
    title: 'Rest for the night',
    body: 'Watch the clock and your energy. Sleeping in your bed ends the day and saves the farm.',
  },
  waterDaily: {
    title: 'Water every morning',
    body: "Morning! Crops only grow on days they're watered. Rain does it for you. Turnips need four days.",
  },
  harvest: {
    title: 'Harvest a turnip',
    body: "Look at that, it's ripe! Cut it with the sickle, or face it and pick it by hand.",
  },
  ship: {
    title: 'Fill the shipping bin',
    body: 'The bin by the house buys anything you grow. Open it and put your turnip in.',
  },
  sellOvernight: {
    title: 'Sleep on it',
    body: 'The bin is emptied at night, and the money is yours by morning. Go to bed.',
  },
  buySeeds: {
    title: 'Buy more seeds',
    body: "Sol's cart on the east road sells seeds from nine to five. Spend some of those coins.",
  },
};

/** Spec Appendix A.2, verbatim. */
export const NOTE_TEXT: Record<NoteId, LessonCopy> = {
  canEmpty: {
    title: 'Out of water',
    body: 'An empty can waters nothing. Face the pond and use the can to fill it up.',
  },
  staminaLow: {
    title: 'Running low',
    body: "You're tiring. Eat a crop you grew, or call it a day and sleep.",
  },
  exhausted: {
    title: 'Worn out',
    body: "You've worked yourself to the bone. You'll move slowly until you eat or sleep.",
  },
  passedOut: {
    title: 'Too late a night',
    body: 'You stayed out too late and collapsed. You wake with half your energy. Bed earlier!',
  },
  rain: {
    title: 'Rainy day',
    body: 'Rain waters every crop for you. Spend the day clearing the field instead.',
  },
  obstacles: {
    title: 'Clearing the field',
    body: 'Weeds need the sickle, rocks the hammer, stumps the axe. Clear them to make room.',
  },
  wrongSeason: {
    title: 'Wrong season',
    body: "Every seed has its season. Seeds planted out of season won't sprout.",
  },
  newSeason: {
    title: 'A new season',
    body: "The season turned. Last season's crops wither, so plant what the cart sells now.",
  },
  bagFull: { title: 'Bag is full', body: 'Your bag is full. Ship or eat something to make room.' },
  cartClosed: {
    title: 'Cart is closed',
    body: 'Sol keeps the cart open nine to five, spring to fall. Come back then.',
  },
};

/** Spec Appendix A.3. */
export const COMPLETE_TEXT = {
  title: 'The rest is yours',
  body: "That's all I can teach you from a notebook. The valley remembers people who stay. — Elias",
  gift: (gold: number) => `Tucked in the last page: ${gold} gold.`,
  button: 'Thanks, Grandpa',
};

/** Spec Appendix A.4. */
export const JOURNAL_TEXT = {
  tab: 'Journal',
  lessons: 'Lessons',
  notes: 'Notes',
  controls: 'Controls',
  skip: 'Skip lessons',
  restart: 'Start lessons again',
  showAll: 'Show all devices',
  skipTitle: "Skip Grandpa's lessons?",
  skipBody: 'You can start them again from this Journal any time.',
  skipConfirm: 'Skip',
  skipCancel: 'Keep learning',
  newGameLabel: "Grandpa's lessons",
  newGameHint: 'Recommended for your first farm.',
  eyebrow: "From Grandpa's notes",
};

// src/assets/games/battleship/content.js

export const DEFAULT_GRID_SIZE = 8;
export const GRID_SIZE_OPTIONS = [6, 8, 10];

export const DEFAULT_LABEL_SET = "names_foods";

// Ship names pool (randomized per game)
export const SHIP_NAME_POOL = [
  "Yamato",
  "Musashi",
  "Nagato",
  "Mutsu",
  "Kongo",
  "Haruna",
  "Hiei",
  "Kirishima",
  "Akagi",
  "Kaga",
  "Soryu",
  "Hiryu",
  "Shokaku",
  "The Seventh Hokage",
  "Tanjiro's Sword",
  "The Seventh Dragon Ball",
  "Yamashiro",
  "One Piece",
  "Pikachu Thunder",
  "The Shin-Chan",
  "SS Doraemon",
];

// Sentence examples (placeholder text)
export const SENTENCE_EXAMPLE = "Does Mark like apples?";

// Base axis data
const NAMES = [
  "Hana",
  "Riku",
  "Kate",
  "Mark",
  "Jing",
  "Dinu",
  "Ami",
  "Mr. Oka",
  "Ms. Baker",
  "Nana",
];

const FOODS = [
  "apples",
  "bananas",
  "natto",
  "ramen",
  "sushi",
  "pizza",
  "rice",
  "curry",
  "udon",
  "miso soup",
];

const VERB_PHRASES = [
  "play soccer",
  "eat natto",
  "cook dinner",
  "go shopping",
  "study English",
  "watch TV",
  "read books",
  "drink water",
  "make a cake",
  "clean the room",
];

export const LABEL_SETS = {
  names_foods: {
    name: "Names + Foods",
    type: "names_foods",
    example: "Does Mark like apples?",
  },

  names_verbs_past: {
    name: "Names + Verbs (Past)",
    type: "names_verbs_tense",
    aux: "Did",
    example: "Did Mark go shopping?",
  },

  names_verbs_present: {
    name: "Names + Verbs (Present)",
    type: "names_verbs_tense",
    aux: "Does",
    example: "Does Mark go shopping?",
  },

  names_verbs_future: {
    name: "Names + Verbs (Future)",
    type: "names_verbs_tense",
    aux: "Will",
    example: "Will Mark go shopping?",
  },

  names_verbs_mixed: {
    name: "Names + Verbs (Mixed)",
    type: "names_verbs_mixed",
    example: "Did Mark play soccer?",
  },
};

function shuffleInPlace(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * Returns axis labels and metadata used for sentence parsing.
 * axis.x / axis.y are strings for display.
 * meta contains parsing fields for y entries.
 */
export function axisForGridSizeAndLabelSet(gridSize, labelSetKey) {
  const conf = LABEL_SETS[labelSetKey] ?? LABEL_SETS.names_foods;

  // size-trim helper (keeps ordering stable; just truncates)
  const pick = (list) => list.slice(0, gridSize);

  const x = pick(NAMES);
  let y = [];
  let meta = { type: conf.type, aux: conf.aux ?? null, yEntries: [] };

  if (conf.type === "names_foods") {
    y = pick(FOODS);

    meta.yEntries = y.map((food) => ({
      label: food, // display
      aux: "Does",
      phrase: `like ${food}`,
    }));
  } else if (conf.type === "names_verbs_tense") {
    // Display: just the phrases on the axis, but parsing expects the selected aux.
    y = pick(VERB_PHRASES);

    meta.aux = conf.aux; // Did / Does / Will
    meta.yEntries = y.map((phrase) => ({
      label: phrase,
      aux: conf.aux,
      phrase,
    }));
  } else if (conf.type === "names_verbs_mixed") {
    // Display includes tense label on each Y entry
    // “Did ~ play soccer”, etc.
    const base = pick(VERB_PHRASES);

    // Build a mixed set. To keep it deterministic per grid size, cycle aux choices.
    const auxCycle = ["Did", "Does", "Will"];
    const entries = base.map((phrase, i) => {
      const aux = auxCycle[i % auxCycle.length];
      const label = `${aux} ~ ${phrase}`;
      return { label, aux, phrase };
    });

    y = entries.map((e) => e.label);
    meta.yEntries = entries;
  }

  return {
    x,
    y,
    meta,
    example: conf.example ?? SENTENCE_EXAMPLE,
  };
}

/**
 * Ship list per grid size.
 * 8x8 and 10x10 use all ships. 6x6 excludes the 5-length ship.
 */
export function fleetForGridSize(gridSize) {
  const base = [
    { id: "ship-5", name: "Ship", size: 5 },
    { id: "ship-4", name: "Ship", size: 4 },
    { id: "ship-3a", name: "Ship", size: 3 },
    { id: "ship-3b", name: "Ship", size: 3 },
    { id: "ship-2", name: "Ship", size: 2 },
  ];

  if (gridSize === 6) return base.filter((s) => s.size !== 5);
  return base;
}

function normalizeSentence(s) {
  return s
    .trim()
    .replace(/[?！？]+$/g, "")
    .replace(/\s+/g, " ");
}

/**
 * Parse the user sentence into a grid coordinate based on current axis meta.
 *
 * Returns:
 *  { ok:true, x:number, y:number }
 *  { ok:false, error:string, expected:string }
 */
export function parseShotSentence(sentence, axis) {
  const expected = axis?.example ?? SENTENCE_EXAMPLE;
  if (!sentence || !sentence.trim()) {
    return { ok: false, error: "Empty sentence.", expected };
  }

  const s = normalizeSentence(sentence);

  // Find name on X axis
  const xIndexByName = new Map(axis.x.map((name, i) => [name.toLowerCase(), i]));

  // Type: names_foods
  if (axis.meta?.type === "names_foods") {
    // Does Mark like apples
    const m = /^does\s+([a-z]+)\s+like\s+(.+)$/i.exec(s);
    if (!m) return { ok: false, error: "Sentence does not match format.", expected };

    const name = m[1];
    const obj = m[2].toLowerCase();

    const x = xIndexByName.get(name.toLowerCase());
    if (x == null) return { ok: false, error: `Name not found on X axis: ${name}`, expected };

    const y = axis.meta.yEntries.findIndex((e) => e.phrase.toLowerCase() === `like ${obj}`);
    if (y < 0) return { ok: false, error: `Food not found on Y axis: ${m[2]}`, expected };

    return { ok: true, x, y };
  }

  // Type: names_verbs_tense or names_verbs_mixed
  {
    // Did/Does/Will Mark go shopping
    const m = /^(did|does|will)\s+([a-z]+)\s+(.+)$/i.exec(s);
    if (!m) return { ok: false, error: "Sentence does not match format.", expected };

    const aux = m[1][0].toUpperCase() + m[1].slice(1).toLowerCase();
    const name = m[2];
    const phrase = m[3].toLowerCase();

    const x = xIndexByName.get(name.toLowerCase());
    if (x == null) return { ok: false, error: `Name not found on X axis: ${name}`, expected };

    // If tense-locked, enforce aux
    if (axis.meta?.type === "names_verbs_tense") {
      if (axis.meta.aux && aux !== axis.meta.aux) {
        return { ok: false, error: `Wrong tense. Use "${axis.meta.aux}".`, expected };
      }
    }

    const y = axis.meta.yEntries.findIndex(
      (e) => e.aux === aux && e.phrase.toLowerCase() === phrase
    );

    if (y < 0) return { ok: false, error: `Verb phrase not found on Y axis: ${m[3]}`, expected };

    return { ok: true, x, y };
  }
}

/**
 * Assigns randomized names from SHIP_NAME_POOL to a fleet runtime list.
 * Mutates the fleet.
 */
export function assignRandomShipNames(fleet) {
  const pool = shuffleInPlace([...SHIP_NAME_POOL]);

  for (let i = 0; i < fleet.length; i++) {
    const name = pool[i % pool.length];
    fleet[i].name = name;
  }
}
// src/stores/selections.ts
import { defineStore } from "pinia";

/**
 * Local-only storage of user card selections per deck.
 * Structure in localStorage:
 * {
 *   [deckKey: string]: {
 *     [selectionName: string]: { ids: string[]; updatedAt: number }
 *   }
 * }
 */

type SelectionRecord = {
  ids: string[];          // card IDs for this selection
  updatedAt: number;      // epoch ms
};

type DeckSelections = Record<string, SelectionRecord>; // name -> record
type SelectionsData = Record<string, DeckSelections>;   // deckKey -> selections

type SavedSetListItem = {
  name: string;
  count: number;
  updatedAt: number;
};

const STORAGE_KEY = "taiyaki.selections.v1";

function safeParse(json: string | null): SelectionsData {
  if (!json) return {};
  try {
    const parsed = JSON.parse(json);
    // Very light validation
    return typeof parsed === "object" && parsed ? parsed as SelectionsData : {};
  } catch {
    return {};
  }
}
function readStorage(): SelectionsData {
  try {
    return safeParse(localStorage.getItem(STORAGE_KEY));
  } catch {
    return {};
  }
}
function writeStorage(data: SelectionsData) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    console.warn("Failed to persist selections to localStorage:", e);
  }
}

/** Deduplicate while preserving first-seen order */
function uniquePreserveOrder<T>(arr: T[]): T[] {
  const seen = new Set<T>();
  const out: T[] = [];
  for (const v of arr) {
    if (!seen.has(v)) {
      seen.add(v);
      out.push(v);
    }
  }
  return out;
}

export const useSelectionsStore = defineStore("selections", {
  state: () => ({
    data: readStorage() as SelectionsData,
  }),

  actions: {
    /** List saved sets for a deck, sorted newest first */
    list(deckKey: string): SavedSetListItem[] {
      const deck = this.data[deckKey] || {};
      return Object.entries(deck)
        .map(([name, rec]) => ({
          name,
          count: rec.ids.length,
          updatedAt: rec.updatedAt,
        }))
        .sort((a, b) => b.updatedAt - a.updatedAt);
    },

    /** Save/overwrite a named selection for a deck */
    save(deckKey: string, name: string, ids: string[]) {
      if (!deckKey || !name) return;
      const cleanIds = uniquePreserveOrder(ids.filter(Boolean));

      if (!this.data[deckKey]) this.data[deckKey] = {};
      this.data[deckKey][name] = {
        ids: cleanIds,
        updatedAt: Date.now(),
      };
      writeStorage(this.data);
    },

    /** Load a named selection's card IDs (empty array if not found) */
    load(deckKey: string, name: string): string[] {
      const deck = this.data[deckKey];
      if (!deck) return [];
      return deck[name]?.ids ? [...deck[name].ids] : [];
    },

    /** Delete a named selection */
    delete(deckKey: string, name: string) {
      const deck = this.data[deckKey];
      if (!deck || !(name in deck)) return;
      delete deck[name];
      // Clean up empty deck buckets to keep storage tidy
      if (Object.keys(deck).length === 0) {
        delete this.data[deckKey];
      }
      writeStorage(this.data);
    },

    /** Optional helpers (not used by DeckView, but handy) */
    clearDeck(deckKey: string) {
      if (this.data[deckKey]) {
        delete this.data[deckKey];
        writeStorage(this.data);
      }
    },
    clearAll() {
      this.data = {};
      writeStorage(this.data);
    },
  },
});

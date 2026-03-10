// src/assets/games/battleship/gridStyles.js

export const GRID_VARIANTS = {
  duelSonar: {
    // label areas
    labelColPx: 170,
    labelHeightPx: 46,

    // grid geometry
    gapPx: 6,

    // dynamic sizing bounds for cells
    cellMinPx: 44, // raise this so grids aren't tiny
    cellMaxPx: 78, // cap so it doesn't get ridiculous on large monitors
  },
};

export function getGridVariant(key) {
  return GRID_VARIANTS[key] ?? GRID_VARIANTS.duelSonar;
}
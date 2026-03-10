// src/assets/games/battleship/engine.js

/**
 * Grid cell schema:
 * {
 *   guessed: boolean,
 *   hit: boolean,
 *   shipId: string|null
 * }
 *
 * NOTE: We allow overlap DURING setup by allowing multiple ships to occupy
 * the same coordinate in fleet data. The grid cell's shipId may be overwritten.
 * Confirmation blocks if overlaps exist (handled in Battleship.vue via fleetHasOverlap()).
 */

export function createEmptyGrid(n) {
  return Array.from({ length: n }, () =>
    Array.from({ length: n }, () => ({
      guessed: false,
      hit: false,
      shipId: null,
    }))
  );
}

export function createFleetRuntime(ships) {
  // runtime fields: cells, hits, orientation
  return ships.map((s) => ({
    ...s,
    cells: [],
    hits: 0,
    orientation: "H",
  }));
}

export function getShipById(fleet, shipId) {
  return fleet.find((s) => s.id === shipId) ?? null;
}

export function allShipsPlaced(fleet) {
  return fleet.every((s) => s.cells.length === s.size);
}

export function allShipsSunk(fleet) {
  return fleet.every((s) => s.cells.length > 0 && s.hits >= s.size);
}

export function shipStatus(ship) {
  if (!ship.cells.length) return "Unplaced";
  if (ship.hits >= ship.size) return "Destroyed";
  if (ship.hits > 0) return `${ship.hits} hit${ship.hits === 1 ? "" : "s"}`;
  return "OK";
}

/**
 * Placement validation:
 * - Bounds only
 * - DOES NOT check collision/overlap (by request)
 */
export function canPlaceShip(grid, ship, startX, startY, orientation) {
  const n = grid.length;
  const dx = orientation === "V" ? 0 : 1;
  const dy = orientation === "V" ? 1 : 0;

  for (let i = 0; i < ship.size; i++) {
    const x = startX + dx * i;
    const y = startY + dy * i;
    if (x < 0 || y < 0 || x >= n || y >= n) {
      return { ok: false, reason: "Out of bounds." };
    }
  }
  return { ok: true };
}

export function placeShip(grid, fleet, shipId, startX, startY, orientation) {
  const ship = getShipById(fleet, shipId);
  if (!ship) return { ok: false, reason: "Ship not found." };

  const check = canPlaceShip(grid, ship, startX, startY, orientation);
  if (!check.ok) return check;

  // Clear prior placement
  removeShip(grid, fleet, shipId);

  const dx = orientation === "V" ? 0 : 1;
  const dy = orientation === "V" ? 1 : 0;

  const cells = [];
  for (let i = 0; i < ship.size; i++) {
    const x = startX + dx * i;
    const y = startY + dy * i;
    cells.push({ x, y });

    // NOTE: shipId can be overwritten if overlapped. That's fine for setup visuals.
    grid[y][x].shipId = shipId;
  }

  ship.cells = cells;
  ship.orientation = orientation;
  // hits not reset here; a reset happens at game start in your view

  return { ok: true };
}

export function removeShip(grid, fleet, shipId) {
  const ship = getShipById(fleet, shipId);
  if (!ship || !ship.cells.length) return false;

  // Clear grid cells that still reference this shipId
  for (const c of ship.cells) {
    if (grid[c.y]?.[c.x]?.shipId === shipId) {
      grid[c.y][c.x].shipId = null;
    }
  }

  ship.cells = [];
  ship.orientation = ship.orientation || "H";
  ship.hits = 0;

  return true;
}

/**
 * Remove a ship by clicking a cell:
 * Since overlaps are allowed during setup, grid[y][x].shipId is unreliable.
 * We scan the fleet to find the first ship whose cells contain x,y.
 */
export function removeShipAtCell(grid, fleet, x, y) {
  const target = fleet.find((s) => s.cells.some((c) => c.x === x && c.y === y));
  if (!target) return false;
  return removeShip(grid, fleet, target.id);
}

/**
 * Guess resolution:
 * - sourceOwnGrid: the defender's grid (ships live here)
 * - defenderFleet: defender ships
 * - attackerTargetGrid: the attacker's tracking grid (guesses/hit/miss)
 */
export function resolveGuess(defenderOwnGrid, defenderFleet, attackerTargetGrid, x, y) {
  const cell = attackerTargetGrid[y][x];
  if (cell.guessed) return { ok: false, reason: "Already guessed.", hit: false };

  cell.guessed = true;

  const defCell = defenderOwnGrid[y][x];
  const shipId = defCell.shipId;

  if (shipId) {
    cell.hit = true;

    const ship = getShipById(defenderFleet, shipId);
    if (ship) ship.hits = Math.min(ship.size, ship.hits + 1);

    return { ok: true, hit: true, shipId };
  }

  cell.hit = false;
  return { ok: true, hit: false, shipId: null };
}

/**
 * AI helpers (basic random)
 */
export function aiPickRandomGuess(targetGrid) {
  const n = targetGrid.length;
  const candidates = [];
  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) {
      if (!targetGrid[y][x].guessed) candidates.push({ x, y });
    }
  }
  if (!candidates.length) return null;
  return candidates[Math.floor(Math.random() * candidates.length)];
}

export function aiPlaceFleetRandom(grid, fleet) {
  const n = grid.length;

  for (const ship of fleet) {
    // try up to N attempts
    let placed = false;
    for (let tries = 0; tries < 500 && !placed; tries++) {
      const orientation = Math.random() < 0.5 ? "H" : "V";
      const maxX = orientation === "H" ? n - ship.size : n - 1;
      const maxY = orientation === "V" ? n - ship.size : n - 1;

      const x = Math.floor(Math.random() * (maxX + 1));
      const y = Math.floor(Math.random() * (maxY + 1));

      // For AI placement we DO want to avoid overlap (standard rules).
      // So we do a collision check here locally.
      const dx = orientation === "V" ? 0 : 1;
      const dy = orientation === "V" ? 1 : 0;

      let collides = false;
      for (let i = 0; i < ship.size; i++) {
        const cx = x + dx * i;
        const cy = y + dy * i;
        if (grid[cy][cx].shipId) {
          collides = true;
          break;
        }
      }
      if (collides) continue;

      placeShip(grid, fleet, ship.id, x, y, orientation);
      placed = true;
    }

    if (!placed) {
      // fallback: place anyway (shouldn't happen often with these sizes)
      placeShip(grid, fleet, ship.id, 0, 0, "H");
    }
  }
}
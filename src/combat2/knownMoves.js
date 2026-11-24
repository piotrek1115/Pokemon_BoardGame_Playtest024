// COMBAT 2.0 (from the isolated prototype; used by the MVP — rules.combatMoves 'mvp1', dev-1510-combat). INSTANCE_KNOWN_MOVES: what one Pokémon (one uid) knows.
//
// Stored ON THE INSTANCE as `moves: { special: id | null, powerful: id | null }` — so it travels with everything
// that already moves the whole instance: the team / Box, Professor Oak's jobs, a trade (tradeEngine swaps whole
// objects), an evolution (evolutionEngine changes species / HP / Growth on the same object), a save (plain JSON).
// An instance without the field (every Pokémon of every game before Combat 2.0) knows nothing extra.
// Decided ONCE and stored: never derived again on load, so a reload can never re-roll what a Pokémon knows.
import { getSpecies } from '../data/pokemon.js';
import { hashIndex } from '../engine/rng.js';
import { MOVE_DEFINITIONS } from './moves.js';
import { learnsetFor, speciesCanKnow, TM_DEFINITIONS } from './learnsets.js';

export const KNOWN_SLOTS = Object.freeze(['special', 'powerful']);
// How a move may be learned. 'caught' / 'starter' happen when the instance is created; the others later.
export const LEARN_SOURCES = Object.freeze(['growth', 'tm', 'reward', 'caught', 'starter']);

export const emptyKnownMoves = () => ({ special: null, powerful: null });

export function knownMovesOf(mon) {
  return { special: mon?.moves?.special ?? null, powerful: mon?.moves?.powerful ?? null };
}

export function knownCount(mon) {
  const k = knownMovesOf(mon);
  return KNOWN_SLOTS.filter((s) => k[s]).length;
}

// May `mon` learn `moveId` now? { ok, reason, slot, replaces }. Learning into a filled slot needs `replace`
// (the player chooses which one stays — „zna najwyżej 1 specjalny i 1 potężny”).
export function canLearn(mon, moveId, { replace = false } = {}) {
  const move = MOVE_DEFINITIONS[moveId];
  if (!move) return { ok: false, reason: 'unknown move' };
  if (move.slot === 'basic') return { ok: false, reason: 'the basic attack is never learned — every Pokémon has it' };
  if (!speciesCanKnow(mon.species, moveId)) return { ok: false, reason: 'not in this species’ learnset', slot: move.slot };
  const current = knownMovesOf(mon)[move.slot];
  if (current === moveId) return { ok: false, reason: 'already knows it', slot: move.slot };
  if (current && !replace) return { ok: false, reason: 'slot taken — choose which move stays', slot: move.slot, replaces: current };
  return { ok: true, reason: null, slot: move.slot, replaces: current };
}

// Teach `moveId` (via one of LEARN_SOURCES). Returns { ok, reason, slot, replaces, forgot }; changes nothing when
// it is not ok. The caller logs the result (the game log is the history; the instance keeps only the outcome).
export function learnMove(mon, moveId, { via, replace = false } = {}) {
  if (!LEARN_SOURCES.includes(via)) return { ok: false, reason: `unknown source ${via}` };
  const check = canLearn(mon, moveId, { replace });
  if (!check.ok) return check;
  mon.moves = { ...knownMovesOf(mon), [check.slot]: moveId };
  return { ...check, via, forgot: check.replaces ?? null };
}

// ---- learning paths ---------------------------------------------------------------------------------------
// GROWTH — the proposal (docs §5.2, policy A): EVOLVING teaches one move — the slot the Pokémon still lacks,
// Special first, then Powerful; the player picks from the NEW form's options of that slot (the AI / a default:
// the first). Policy B (an alternative for Piotr): the Special when its Growth first reaches half its threshold.
export function evolutionLearnOffer(mon, toSpeciesId) {
  const k = knownMovesOf(mon);
  const l = learnsetFor(toSpeciesId);
  for (const slot of KNOWN_SLOTS) if (!k[slot] && l[slot].length) return { slot, options: [...l[slot]], via: 'growth' };
  return null;
}

export function growthMilestoneOffer(mon, growth, threshold) {
  if (knownMovesOf(mon).special || growth < Math.ceil(threshold / 2)) return null;
  const options = learnsetFor(mon.species).special;
  return options.length ? { slot: 'special', options: [...options], via: 'growth' } : null;
}

// TM — teaches its one move to a compatible species (TM_COMPATIBILITY); a filled slot needs `replace`.
export function useTm(mon, tmId, { replace = false } = {}) {
  const tm = TM_DEFINITIONS[tmId];
  if (!tm) return { ok: false, reason: 'unknown TM' };
  return learnMove(mon, tm.move, { via: 'tm', replace });
}

// QUEST REWARD — { type: 'move', slot, move? }: a named move (only for a species that can know it) or the first
// option of the slot the chosen Pokémon can learn.
export function rewardMove(mon, reward, { replace = false } = {}) {
  const id = reward.move ?? learnsetFor(mon.species)[reward.slot]?.[0];
  if (!id) return { ok: false, reason: `no ${reward.slot} move for this species` };
  return learnMove(mon, id, { via: 'reward', replace });
}

// ---- known at creation -----------------------------------------------------------------------------------
// The proposal (docs §5.4), deterministic — no die, no RNG stream consumed:
//   starter           its family's FIRST Special (Pikachu Fala elektryczna, Squirtle Skorupa, Staryu
//                     Utwardzenie, Geodude Zwinięcie w kulkę)
//   wild / trainer    a first stage that still evolves: nothing; a second stage or a one-stage species: one
//                     Special; a third stage or a Super Rare one-stage species: + one Powerful.
//                     Which option: hashIndex(uid + species + slot) — the same uid always gets the same answer,
//                     and it is STORED at creation, so a later data change or a reload never changes it.
//   reward / gift     nothing (a reward that teaches says so itself)
export function initialKnownMoves(speciesId, origin, uid) {
  const s = getSpecies(speciesId);
  const l = learnsetFor(speciesId);
  const known = emptyKnownMoves();
  const pick = (slot) => (l[slot].length ? l[slot][hashIndex(`${uid}|${speciesId}|${slot}`, l[slot].length)] : null);
  if (origin === 'starter') {
    known.special = l.special[0] ?? null;
    return known;
  }
  if (origin !== 'wild' && origin !== 'trainer') return known;
  const oneStage = s.stage === 1 && !s.evolution; // Onix, Scyther, Lapras, Eevee (its branch is a rule, not data) …
  if (s.stage === 1 && !oneStage) return known;
  known.special = pick('special');
  if (s.stage >= 3 || (oneStage && s.rarity === 'superRare')) known.powerful = pick('powerful');
  return known;
}

// ---- evolution / trade --------------------------------------------------------------------------------------
// Evolution keeps the SAME instance (evolutionEngine) — its known moves stay. The learnsets only grow along a
// family, so every known move is still a possibility of the new form; if a future data change ever broke that,
// the move is KEPT anyway (a learned move is never taken away silently) and reported here.
export function evolutionCarryOver(mon, toSpeciesId) {
  const k = knownMovesOf(mon);
  const kept = KNOWN_SLOTS.filter((s) => k[s]).map((s) => k[s]);
  const outsideLearnset = kept.filter((id) => !speciesCanKnow(toSpeciesId, id));
  return { kept, outsideLearnset };
}

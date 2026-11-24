// TM-4 — a new move at evolution (rules.evoMoves 'a1', a DEV pilot, OFF in every set; ?dev=evomove — with combatMoves
// 'mvp1'). DECIDED by Piotr 12.11.2026: policy A of docs/ROADMAP_KANTO_SYSTEMS.md (DQ-133 Q4) — EVOLVING offers one move:
// for the slot the Pokémon still lacks (Special first, then Powerful), one of the NEW form's options of that slot
// (src/combat2/knownMoves.js evolutionLearnOffer — the same learnsets as everything else). Nothing is ever replaced: a
// Pokémon with both slots filled gets no offer. Combat 2.2 is not touched — it only reads `mon.moves`.
//
//   the offer   stored ON THE INSTANCE: `mon.evoOffer = { slot, options }` — written when a HUMAN player's Pokémon evolves
//               (evolutionEngine, only in such a game; never for the AI, which never learns this way — AI v2e frozen, so
//               an AI-only game plays the same with the switch ON or OFF). A later evolution writes its own (or removes it
//               when no slot is free); it travels with the instance (team, Box, trade) like `mon.moves`.
//   the action  `{ type: 'evoMove', target, choice }` (`choice` = the move — a field the history keeps) — FREE (no action, no battle, like a TM: a Fly turn stays whole): the
//               move into the empty slot, the offer gone. Only a Pokémon of the active team, on the owner's turn, outside
//               a battle or a choice. Any time later is fine — the offer waits.
//   the end     the offer also goes when its slot is filled another way (a TM — tmEngine.applyUseTm).
//   the log     English, with `{ evoOffer: { player, uid, species, slot } }` when offered and `{ evoMove: { player, uid,
//               species, move } }` when learned — the table says both in Polish (flow.js).
import { getSpecies } from '../data/pokemon.js';
import { MOVE_DEFINITIONS, getMove } from '../combat2/moves.js';
import { canLearn, evolutionLearnOffer, knownMovesOf, learnMove } from '../combat2/knownMoves.js';
import { log } from './log.js';
import { tmBusy } from './tmEngine.js';

export const usesEvoMoves = (config) => config?.rules?.evoMoves === 'a1' && config.rules.combatMoves === 'mvp1';

// evolutionEngine, right after the species changed: the new form's offer for its owner (a human player), or none.
export function noteEvolutionOffer(state, player, mon) {
  if (!usesEvoMoves(state.config) || player.controller === 'ai') return;
  const offer = evolutionLearnOffer(mon, mon.species);
  if (!offer) {
    delete mon.evoOffer; // both slots filled: nothing to offer (an older offer of a filled slot goes too)
    return;
  }
  mon.evoOffer = { slot: offer.slot, options: offer.options };
  log(state, 'evolution', `${getSpecies(mon.species).name} can learn a new ${offer.slot} move (free — any time on ${player.name}'s turn)`, {
    evoOffer: { player: player.id, uid: mon.uid, species: mon.species, slot: offer.slot },
  });
}

// The moves this Pokémon is offered now (its slot still empty, each one it can learn) — none without an offer.
export function evoOfferMoves(mon) {
  const o = mon?.evoOffer;
  if (!o || knownMovesOf(mon)[o.slot]) return [];
  return o.options.filter((id) => canLearn(mon, id).ok);
}

// turnEngine.getLegalActions (the turn's free steps): one action per offered move × Pokémon of the active team.
export function evoMoveActions(state, player) {
  if (!usesEvoMoves(state.config) || tmBusy(state)) return [];
  return player.team.flatMap((mon) => evoOfferMoves(mon).map((choice) => ({ type: 'evoMove', target: mon.uid, choice })));
}

// The action (legal — turnEngine checked it): the move into its empty slot, the offer gone, one log line.
export function applyEvoMove(state, player, action) {
  const mon = player.team.find((m) => m.uid === action.target);
  const r = learnMove(mon, action.choice, { via: 'growth' });
  if (!r.ok) throw new Error(`evoMove: ${r.reason}`); // never: the action was legal
  delete mon.evoOffer;
  log(state, 'action', `${player.name}'s ${getSpecies(mon.species).name} learns ${getMove(action.choice).name} (a move at evolution — free, no action)`, {
    evoMove: { player: player.id, uid: mon.uid, species: mon.species, move: action.choice },
  });
}

// explainIllegal (English, like the engine's other answers): why this evoMove is not possible now.
export function evoMoveIllegalText(state, player, action) {
  if (!usesEvoMoves(state.config)) return 'This game teaches no move at evolution';
  if (tmBusy(state)) return 'Finish the current step first — a new move is learned on your turn, outside a battle';
  const mon = player.team.find((m) => m.uid === action.target);
  if (!mon) return `Only a Pokémon of your active team (not in the Box) learns it — ${action.target} is not there`;
  const name = getSpecies(mon.species).name;
  if (!mon.evoOffer) return `${name} has no new move waiting — a move is offered when a Pokémon evolves`;
  if (knownMovesOf(mon)[mon.evoOffer.slot]) return `${name} already has a move in that slot`;
  return `${name} cannot learn ${MOVE_DEFINITIONS[action.choice]?.name ?? action.choice} now — choose one of the offered moves`;
}

// TM-1 — Technical Machines (rules.tms 't1', a DEV pilot, OFF in every set; ?dev=tm; data/tms.js). DEV approved 12.11.2026
// (docs/ROADMAP_KANTO_SYSTEMS.md, milestone C); DQ-133 („TM at all?”) stays the owner's before any set.
//
// A TM teaches its ONE move (src/combat2 TM_DEFINITIONS) to a Pokémon of the ACTIVE team whose species can know it
// (speciesCanKnow — the same learnsets as everything else: a TM opens no new possibility). The move goes into the
// instance's own slot (`mon.moves.special` / `.powerful`, src/combat2/knownMoves.js learnMove via 'tm'), so in battle it is
// any known Special / Powerful: once per battle, the same button (Combat 2.2 is not touched — it only reads `mon.moves`).
//
//   the field   `player.tms = { tmId: count }` — ONLY in a TM game (rules.tms 't1' AND combatMoves 'mvp1'); every other
//               game, every old save, never has it (saves stay byte-identical). A TM at 0 is deleted from it.
//   the action  `{ type: 'useTm', tm, target }` into an empty slot; `{ type: 'useTm', tm, target, forget }` into a filled
//               one — `forget` names the move the player chose to let go (the confirmation: without it a filled slot
//               never changes). FREE: no action spent, no battle — a Fly turn stays whole (flyEngine.noteTurnSpent).
//   the count   single-use (data/tms.js `singleUse`, PROVISIONAL): −1 per use; reusable when flipped.
//   the log     English, with `{ tm: { player, uid, species, tmId, move, forgot } }` — the table says it in Polish (flow.js).
//
// The AI never uses a TM (aiEngine.chooseAction filters `useTm`, like `fly` — AI v2e frozen, no heuristic): an AI-only
// game plays the same with the switch ON or OFF.
//
// TM-2 — the sources (rules.tms 't2', DECIDED by Piotr 12.11.2026; data/tms.js `sources`): a gym leader gives its TM with
// the badge (gymEngine.gymWon — to the AI too, which holds it and never uses it), the Dojo's quest pays TM11 (a reward
// line `{ type: 'tm', id }` — questBookEngine.payReward; the AI never takes it), Celadon's shop sells three
// (pokeStopEngine.buyableTms — `buyTm`, the AI never buys one). In 't1' no source exists: tests and tools give a TM with
// the debug meta-action `debugGiveTm` (turnEngine — recorded, so a replay stays exact).
import { TMS } from '../data/tms.js';
import { getSpecies } from '../data/pokemon.js';
import { pickVersion } from '../rules.js';
import { MOVE_DEFINITIONS, getMove } from '../combat2/moves.js';
import { TM_DEFINITIONS } from '../combat2/learnsets.js';
import { canLearn, useTm as teachTm } from '../combat2/knownMoves.js';
import { log } from './log.js';

export const usesTms = (config) => Boolean(TMS[config?.rules?.tms]) && config.rules.combatMoves === TMS[config.rules.tms].combatMoves;
export const tmSpec = (config) => pickVersion(TMS, config.rules.tms, 'TM rules');
// TM-2: the sources of this game (t2), or null (t1: none — and every game without TMs)
export const tmSources = (config) => (usesTms(config) ? tmSpec(config).sources ?? null : null);
// the TM a gym's leader gives with its badge in this game (null: none)
export const gymTm = (gymId, config) => tmSources(config)?.gyms[gymId] ?? null;
// the quest that pays a TM — the AI leaves it to the family (aiEngine.chooseAction, like the HMs' quests)
export const isTmQuest = (id) => Object.values(TMS).some((v) => v.sources?.quest.id === id);
export const TM_IDS = Object.freeze(Object.keys(TM_DEFINITIONS));
export const tmMove = (tmId) => getMove(TM_DEFINITIONS[tmId].move);

// The TMs this player holds now (count > 0), in TM order — none outside a TM game.
export function heldTms(state, player) {
  if (!usesTms(state.config) || !player?.tms) return [];
  return TM_IDS.filter((id) => (player.tms[id] ?? 0) > 0);
}

// What `tmId` would do for `mon` now — for the engine's actions and the table's „Naucz ruchu” view:
//   'learn'    an empty slot: learns at once
//   'replace'  the slot holds another move (`replaces`): learns only once the player chose to let that one go
//   'knows'    it knows this move already
//   'cannot'   its species can never know it (not in its learnset)
export function tmChoice(mon, tmId) {
  const move = tmMove(tmId);
  const c = canLearn(mon, move.id);
  if (c.ok) return { code: 'learn', slot: move.slot, move: move.id, replaces: null };
  if (c.replaces) return { code: 'replace', slot: move.slot, move: move.id, replaces: c.replaces };
  return { code: c.reason === 'already knows it' ? 'knows' : 'cannot', slot: move.slot, move: move.id, replaces: null };
}

// No TM step while another one is waiting (a battle, a choice, the shop, a trade, a duel) — TM-4's move at evolution too.
export const tmBusy = (state) => state.phase !== 'turn' || Boolean(state.growthChoice || state.boxChoice || state.oakJobDraft || state.trade || state.pvp || state.battlePrep);

// turnEngine.getLegalActions (the turn's free steps): one action per held TM × Pokémon of the active team that can take it.
export function tmActions(state, player) {
  if (tmBusy(state)) return [];
  const out = [];
  for (const tm of heldTms(state, player)) {
    for (const mon of player.team) {
      const c = tmChoice(mon, tm);
      if (c.code === 'learn') out.push({ type: 'useTm', tm, target: mon.uid });
      else if (c.code === 'replace') out.push({ type: 'useTm', tm, target: mon.uid, forget: c.replaces });
    }
  }
  return out;
}

// The action (legal — turnEngine checked it): the move into its slot, the TM used up (single-use), one log line.
export function applyUseTm(state, player, action) {
  const mon = player.team.find((m) => m.uid === action.target);
  const r = teachTm(mon, action.tm, { replace: Boolean(action.forget) });
  if (!r.ok) throw new Error(`useTm: ${r.reason}`); // never: the action was legal
  if (mon.evoOffer?.slot === r.slot) delete mon.evoOffer; // TM-4 (rules.evoMoves): the slot an evolution offered is filled now
  if (tmSpec(state.config).singleUse) {
    player.tms[action.tm] -= 1;
    if (player.tms[action.tm] <= 0) delete player.tms[action.tm];
  }
  const move = tmMove(action.tm);
  const name = getSpecies(mon.species).name;
  log(state, 'action', `${player.name} uses ${action.tm.toUpperCase()}: ${name} learns ${move.name}${r.forgot ? ` and forgets ${getMove(r.forgot).name}` : ''} (free — no action)`, {
    tm: { player: player.id, uid: mon.uid, species: mon.species, tmId: action.tm, move: move.id, forgot: r.forgot ?? null },
  });
}

// One more of this TM: a TM-2 source (a gym, a quest, the shop) or debugGiveTm (turnEngine, a recorded meta-action).
export function giveTm(player, tmId, n = 1) {
  player.tms[tmId] = (player.tms[tmId] ?? 0) + n;
}

// explainIllegal (English, like the engine's other answers): why this useTm is not possible now.
export function tmIllegalText(state, player, action) {
  if (!usesTms(state.config)) return 'This game has no TMs';
  if (tmBusy(state)) return 'Finish the current step first — a TM is used on your turn, outside a battle';
  if (!TM_DEFINITIONS[action.tm]) return `Unknown TM "${action.tm}"`;
  const label = action.tm.toUpperCase();
  if (!heldTms(state, player).includes(action.tm)) return `You have no ${label}`;
  const mon = player.team.find((m) => m.uid === action.target);
  if (!mon) return `A TM teaches a Pokémon of your active team (not in the Box) — ${action.target} is not there`;
  const name = getSpecies(mon.species).name;
  const c = tmChoice(mon, action.tm);
  const move = tmMove(action.tm).name;
  if (c.code === 'cannot') return `${name} cannot learn ${move} from a TM`;
  if (c.code === 'knows') return `${name} already knows ${move}`;
  if (c.code === 'replace') {
    const old = getMove(c.replaces).name;
    return action.forget ? `${name} has ${old} there, not ${MOVE_DEFINITIONS[action.forget]?.name ?? action.forget} — choose which move stays again` : `${name} already has a move there (${old}) — choose which move stays first`;
  }
  return `${name} has that slot free — nothing to forget`;
}

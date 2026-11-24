// FLY-1 — „Lot” (rules.fly 'f1', a DEV pilot; data/fly.js, Piotr's F1–F5 of 11.11.2026). One field ability for every
// capable Pokémon: the HM (a key item), the Thunder Badge and an awake capable Pokémon in the active team carry the player
// to a town or city they have visited — the whole turn.
//
// The turn: Fly needs both actions of the turn untouched — no action spent, no battle fought this turn (free steps — the
// lead, an item, a quest taken or collected, a trade, an evolution — do not count). turnEngine.dispatch marks the turn
// spent (`state.turn.flySpent`, only in a Fly game) and advanceTurn clears the mark. Landing is an ordinary arrival (the
// same steps as a move: visited, vigilance, the quest book's / missions' / rumours' arrival, Team Rocket on arrival), then
// the turn ends by the ordinary rule (no actions left → advanceTurn, after a battle the landing started).
//
// The AI never flies and never takes the HM's quest (aiEngine.chooseAction filters both, like takeOffer / swapAdventure —
// AI v2e frozen: no new heuristic, an AI-only game plays the same with the switch ON or OFF).
import { FLY } from '../data/fly.js';
import { getLocation } from '../data/locations.js';
import { getSpecies } from '../data/pokemon.js';
import { pickVersion } from '../rules.js';
import { log } from './log.js';
import { vigilanceOnMove } from './captureEngine.js';
import { worldBlocks } from './graphEngine.js';
import { recordQuestEvent } from './questEngine.js';
import { rocketOnArrive } from './rocketEngine.js';

export const usesFly = (config) => config.rules.fly === 'f1';
export const flySpec = (config) => pickVersion(FLY, config.rules.fly, 'Fly rules');
// the HM's quest (FLY-3) — the AI leaves it to the family
export const isFlyQuest = (id) => Object.values(FLY).some((v) => v.hmFrom === id);

export const hasFlyHm = (player, config) => Boolean(player.questBook?.keyItems.includes(flySpec(config).hm));
export const hasFlyBadge = (player, config) => player.badges.includes(flySpec(config).badge);
const canCarry = (config, mon) => flySpec(config).species.includes(mon.species);
// F2: the capable Pokémon that can fly now — awake, in the active team, in team order (the first one carries)
export const flyers = (player, config) => player.team.filter((m) => m.hp > 0 && canCarry(config, m));

// F3: both actions of this turn untouched
export function turnWhole(state) {
  return state.turn.actionsRemaining >= state.config.actionsPerTurn && !state.turn.flySpent;
}

// F4 + F5: where this player may land — a visited town / city, not where they stand, not a closed place
export function flyTargets(state, player) {
  const closed = worldBlocks(state)?.locations ?? [];
  return flySpec(state.config).targets.filter((id) => player.visited.includes(id) && id !== player.location && !closed.includes(id));
}

// What stands in the way of a flight now, in a fixed order (the table says it in Polish, explainIllegal in English):
//   'phase'    another step first (a battle, a choice, the shop)
//   'hm'       no HM Lot
//   'badge'    no Thunder Badge
//   'pokemon'  no capable Pokémon awake in the team — `fainted` / `boxed`: one is, but fainted / in the Box
//   'actions'  the turn is no longer whole
//   'targets'  no town or city to land in (visited, not here, not closed)
export function flyBlockers(state, player) {
  if (!usesFly(state.config)) return [{ code: 'off' }];
  const out = [];
  const busy = state.phase !== 'turn' || state.growthChoice || state.boxChoice || state.oakJobDraft || state.trade || state.pvp || state.battlePrep;
  if (busy) out.push({ code: 'phase' });
  if (!hasFlyHm(player, state.config)) out.push({ code: 'hm' });
  if (!hasFlyBadge(player, state.config)) out.push({ code: 'badge' });
  if (!flyers(player, state.config).length) {
    const fainted = player.team.filter((m) => canCarry(state.config, m)).map((m) => m.species);
    const boxed = (player.reserve ?? []).filter((m) => canCarry(state.config, m)).map((m) => m.species);
    out.push({ code: 'pokemon', fainted, boxed });
  }
  if (!turnWhole(state)) out.push({ code: 'actions' });
  if (!flyTargets(state, player).length) out.push({ code: 'targets' });
  return out;
}

export function flyActions(state, player) {
  if (!usesFly(state.config) || flyBlockers(state, player).length) return [];
  return flyTargets(state, player).map((to) => ({ type: 'fly', to }));
}

// The flight (a legal action — turnEngine checked it): the whole turn, then an ordinary arrival.
export function fly(state, player, to) {
  const from = player.location;
  const carrier = flyers(player, state.config)[0];
  player.previousLocation = from;
  player.location = to;
  if (!player.visited.includes(to)) player.visited.push(to); // always visited already (F4) — kept as a move does
  vigilanceOnMove(state, player); // Gameplay P1: a new place, unwary Pokémon (as a move)
  const used = state.turn.actionsRemaining;
  state.turn.actionsRemaining = 0; // F3: the whole turn
  state.turn.flySpent = true;
  log(state, 'action', `${player.name} flies ${getLocation(from).name} → ${getLocation(to).name} on ${getSpecies(carrier.species).name} (HM Fly: the whole turn${used > state.config.actionsPerTurn ? `, ${used} actions` : ''})`, { fly: { player: player.id, from, to, species: carrier.species, uid: carrier.uid } });
  recordQuestEvent(state, player, { kind: 'arrive', location: to }); // the quest book, missions, rumours — as a move
  rocketOnArrive(state, player); // Team Rocket on arrival — as a move
}

// turnEngine.dispatch, after every action of a Fly game: the turn is no longer whole once an action was spent or a battle
// was fought (one going on when the action came — Team Rocket at the turn's start —, one it started, a duel's blow).
const DUEL_BLOWS = new Set(['pvpAttack', 'pvpMove']);
export function noteTurnSpent(state, action, before, fought) {
  if (fought || state.encounter || state.turn.actionsRemaining < before || DUEL_BLOWS.has(action.type)) state.turn.flySpent = true;
}

// explainIllegal (English, as the engine's other answers)
const BLOCKER_EN = {
  off: 'This game has no Fly',
  phase: 'Finish the current step first',
  hm: 'Fly needs the HM Fly (the Route 16 quest)',
  badge: 'Fly needs the Thunder Badge',
  pokemon: 'Fly needs an awake Pokémon that can fly in the active team (not in the Box)',
  actions: 'Fly takes the whole turn: both actions, before any other action or battle this turn',
  targets: 'There is no visited town or city to fly to',
};
export function flyIllegalText(state, player, to) {
  const why = flyBlockers(state, player).map((b) => BLOCKER_EN[b.code]);
  if (why.length) return why.join('; ');
  let name = to;
  try {
    name = getLocation(to).name;
  } catch {
    return `Unknown location "${to}"`;
  }
  if (to === player.location) return `You are in ${name} already`;
  if (!flySpec(state.config).targets.includes(to)) return `${name} is not a town or city Fly can land in`;
  if (!player.visited.includes(to)) return `${name} has not been visited yet — Fly lands only where you have been`;
  return `${name} is closed now — Fly cannot land there`;
}

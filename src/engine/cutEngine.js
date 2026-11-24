// CUT-1 — HM Cut and the bushes (rules.cut 'c1', a DEV pilot; data/cut.js, Piotr's OWNER GO 18.11.2026: K1 „Krzaczki”). One
// field ability, the shape of Surf (engine/surfEngine.js): the HM Cut (a key item), the Cascade Badge and an awake capable
// Pokémon in the active team let the player cut the bush at their place — ONE action — and take the small bonus behind it.
//
// K1 never touches the travel graph: no bush closes an edge, a gym, the League or a quest step (graphEngine.worldBlocks is
// not asked and never changes). Each player may cut each bush once (C2 „osobno”): `player.cutBushes` (the bush ids this
// player has cut — saved with the player; an older save has none). The reward is paid once per player per bush: no farming.
//
// The AI never gets the HM (its quest is `family` — questBookEngine.takeBlock never offers it to an AI player) and is never
// offered a cut: an AI-only game plays the same with the switch ON or OFF (AI v2e's code untouched).
//
// CUT2 (rules.cut 'c2', the DEV pilot `cut2`, OFF in every set; data/cut.js CUT2_TEACH, docs/design/CUT2_TEACH.md): c1 + the
// action `teachCut { target }` — the player who holds the HM teaches Cut to a Pokémon of the active team whose species can
// learn it (data/cut.js `species`) and that does not know it yet. The Pokémon keeps it on itself (`mon.hms = ['cut']`: saved
// with it, kept by evolution — the same object — even when the new form is not on the list, by Oak's Box and by a trade).
// Under c2 only a Pokémon that KNOWS Cut cuts (awake = HP > 0, in the active team — as c1). A c1 game never reads `mon.hms`
// and never offers `teachCut`: c1 is unchanged. The AI is never offered `teachCut` (and never holds the HM): it never cuts.
import { CUT } from '../data/cut.js';
import { getLocation } from '../data/locations.js';
import { getSpecies } from '../data/pokemon.js';
import { pickVersion } from '../rules.js';
import { log } from './log.js';
import { addItem } from './itemEngine.js';

export const usesCut = (config) => config?.rules?.cut === 'c1' || config?.rules?.cut === 'c2'; // CUT2: c2 is c1 + teaching
export const cutTeaches = (config) => config?.rules?.cut === 'c2'; // CUT2: a Pokémon must be taught Cut first
export const cutSpec = (config) => pickVersion(CUT, config.rules.cut, 'Cut rules');
export const isCutQuest = (id) => Object.values(CUT).some((v) => v.hmFrom === id);

export const hasCutHm = (player, config) => Boolean(player.questBook?.keyItems.includes(cutSpec(config).hm));
export const hasCutBadge = (player, config) => (player.badges ?? []).includes(cutSpec(config).badge);
// the species can learn Cut (c1: that is enough to cut)
export const canLearnCut = (config, mon) => cutSpec(config).species.includes(mon.species);
// CUT2: this Pokémon was taught Cut (its own field — any game; only c2 reads it)
export const knowsCut = (mon) => Boolean(mon?.hms?.includes('cut'));
// c1: a species that can cut; c2: a Pokémon that KNOWS Cut (whatever its species now — an evolution keeps it)
const canCut = (config, mon) => (cutTeaches(config) ? knowsCut(mon) : canLearnCut(config, mon));
// the capable Pokémon that can cut now — awake, in the active team, in team order (the first one cuts)
export const cutters = (player, config) => (player.team ?? []).filter((m) => m.hp > 0 && canCut(config, m));
export const cutDone = (player) => player.cutBushes ?? [];
// the bush at this place (one per place), or null
export const bushAt = (config, place) => (usesCut(config) ? cutSpec(config).bushes.find((b) => b.place === place) ?? null : null);

// What stands between this player and the bush here, in a fixed order (the table says it in Polish):
//   'off'      this game has no Cut
//   'here'     no bush at this place
//   'done'     this player has cut this bush already (the stump)
//   'phase'    another step first (a battle, a choice, the shop)
//   'hm'       no HM Cut
//   'badge'    no Cascade Badge
//   'pokemon'  no capable Pokémon awake in the team — `fainted` / `boxed`: one is, but fainted / in the Box
//   'learn'    CUT2 (c2): nobody of this player knows Cut yet — `pupils`: the team's species that could learn it now
//   'actions'  no action left this turn
export function cutBlockers(state, player) {
  if (!usesCut(state.config)) return [{ code: 'off' }];
  const bush = bushAt(state.config, player.location);
  if (!bush) return [{ code: 'here' }];
  if (cutDone(player).includes(bush.id)) return [{ code: 'done', bush: bush.id }];
  const out = [];
  const busy = state.phase !== 'turn' || state.growthChoice || state.boxChoice || state.oakJobDraft || state.trade || state.pvp || state.battlePrep;
  if (busy) out.push({ code: 'phase' });
  if (!hasCutHm(player, state.config)) out.push({ code: 'hm' });
  out.push(...cutAbilityBlockers(player, state.config));
  if (state.turn.actionsRemaining <= 0) out.push({ code: 'actions' });
  return out;
}

// The ability's own requirements besides the HM (the „Plecak” tile says the first one): 'badge', 'pokemon'
export function cutAbilityBlockers(player, config) {
  const out = [];
  if (!hasCutBadge(player, config)) out.push({ code: 'badge' });
  if (!cutters(player, config).length) {
    const fainted = (player.team ?? []).filter((m) => canCut(config, m)).map((m) => m.species);
    const boxed = (player.reserve ?? []).filter((m) => canCut(config, m)).map((m) => m.species);
    if (cutTeaches(config) && !fainted.length && !boxed.length) out.push({ code: 'learn', pupils: (player.team ?? []).filter((m) => canLearnCut(config, m)).map((m) => m.species) }); // CUT2
    else out.push({ code: 'pokemon', fainted, boxed });
  }
  return out;
}

// The cut open now — [{ type: 'cut' }] (a legal action) or []. Never for an AI player (it has no HM anyway).
export function cutActions(state, player) {
  if (!usesCut(state.config) || player.controller === 'ai' || cutBlockers(state, player).length) return [];
  return [{ type: 'cut' }];
}

// The cut (a legal action — turnEngine checked it): one action, the bush marked for this player, its bonus paid.
export function cut(state, player) {
  const bush = bushAt(state.config, player.location);
  const by = cutters(player, state.config)[0];
  state.turn.actionsRemaining -= 1;
  (player.cutBushes ??= []).push(bush.id);
  for (const r of bush.reward) {
    if (r.type === 'money') player.money += r.amount;
    else addItem(player, r.type === 'pokeballs' ? 'pokeball' : r.type, r.amount);
  }
  log(state, 'action', `🌳 ${player.name}'s ${getSpecies(by.species).name} cuts the bush at ${getLocation(bush.place).name} — behind it: ${bush.reward.map((r) => `${r.amount}× ${r.type}`).join(', ')} (HM Cut: 1 action)`, { cut: { player: player.id, bush: bush.id, place: bush.place, species: by.species, reward: bush.reward } });
}

// explainIllegal (English, as the engine's other answers)
const BLOCKER_EN = {
  off: 'This game has no Cut',
  here: 'There is no bush to cut here',
  done: 'You have cut this bush already',
  phase: 'Finish the current step first',
  hm: 'Cut needs the HM Cut (the S.S. Anne captain in Vermilion)',
  badge: 'Cut needs the Cascade Badge',
  pokemon: 'Cut needs an awake Pokémon that can cut in the active team (not in the Box)',
  learn: 'Cut needs a Pokémon that knows Cut — teach one first (the HM Cut, in the bag)', // CUT2
  actions: 'No action left this turn',
};
export const cutIllegalText = (state, player) => cutBlockers(state, player).map((b) => BLOCKER_EN[b.code]).join('; ') || 'Cutting is not possible now';

// ---- CUT2: „Naucz ścinania” (rules.cut 'c2') ----------------------------------------------------------------------------
export const cutTeachSpec = (config) => (cutTeaches(config) ? cutSpec(config).teach : null);
// who may be taught: the active team (+ Oak's Box when FROM_BOX), in that order
export const teachPool = (player, config) => [...(player.team ?? []), ...(cutTeachSpec(config)?.FROM_BOX ? player.reserve ?? [] : [])];
// how many of this player's own Pokémon know Cut now (team + Box) — MAX_PUPILS counts these
export const cutPupils = (player) => [...(player.team ?? []), ...(player.reserve ?? [])].filter(knowsCut).length;

// Why this player cannot teach Cut to the Pokémon `uid` now, in a fixed order (empty: legal):
//   'off'      not a c2 game          'ai'       an AI player (never offered)       'phase'    another step first
//   'hm'       no HM Cut               'mon'      not this player's Pokémon         'boxed'    in Oak's Box (FROM_BOX off)
//   'species'  its species cannot learn Cut                                         'knows'    it knows Cut already
//   'limit'    MAX_PUPILS reached      'actions'  ACTION_COST > actions left
export function teachCutBlockers(state, player, uid) {
  const cfg = state.config;
  if (!cutTeaches(cfg)) return [{ code: 'off' }];
  if (player.controller === 'ai') return [{ code: 'ai' }];
  const t = cutTeachSpec(cfg);
  const out = [];
  const busy = state.phase !== 'turn' || state.growthChoice || state.boxChoice || state.oakJobDraft || state.trade || state.pvp || state.battlePrep;
  if (busy) out.push({ code: 'phase' });
  if (!hasCutHm(player, cfg)) out.push({ code: 'hm' });
  const mon = teachPool(player, cfg).find((m) => m.uid === uid);
  if (!mon) {
    out.push((player.reserve ?? []).some((m) => m.uid === uid) ? { code: 'boxed' } : { code: 'mon' });
    return out;
  }
  if (!canLearnCut(cfg, mon)) out.push({ code: 'species', species: mon.species });
  else if (knowsCut(mon)) out.push({ code: 'knows', species: mon.species });
  else if (t.MAX_PUPILS != null && cutPupils(player) >= t.MAX_PUPILS) out.push({ code: 'limit' });
  if (t.ACTION_COST > 0 && state.turn.actionsRemaining < t.ACTION_COST) out.push({ code: 'actions' });
  return out;
}

// The teachings open now — one `{ type: 'teachCut', target }` per Pokémon (team order, then the Box) — or [].
export function teachCutActions(state, player) {
  if (!cutTeaches(state.config) || player.controller === 'ai') return [];
  return teachPool(player, state.config).filter((m) => !teachCutBlockers(state, player, m.uid).length).map((m) => ({ type: 'teachCut', target: m.uid }));
}

// The teaching (a legal action — turnEngine checked it): the Pokémon knows Cut from now on; ACTION_COST actions; the HM stays
// unless CONSUMES_HM.
export function teachCut(state, player, action) {
  const t = cutTeachSpec(state.config);
  const mon = teachPool(player, state.config).find((m) => m.uid === action.target);
  (mon.hms ??= []).push('cut');
  if (t.ACTION_COST > 0) state.turn.actionsRemaining -= t.ACTION_COST;
  if (t.CONSUMES_HM) player.questBook.keyItems = player.questBook.keyItems.filter((id) => id !== cutSpec(state.config).hm);
  const cost = t.ACTION_COST > 0 ? `${t.ACTION_COST} action${t.ACTION_COST > 1 ? 's' : ''}` : 'free — no action';
  log(state, 'action', `✂️ ${player.name} teaches ${getSpecies(mon.species).name} Cut (HM Cut: ${cost}${t.CONSUMES_HM ? ', the HM is used up' : ', the HM stays'})`, { cutTeach: { player: player.id, uid: mon.uid, species: mon.species } });
}

const TEACH_EN = {
  off: 'This game has no Cut teaching',
  ai: 'Only a human player teaches Cut',
  phase: 'Finish the current step first',
  hm: 'Teaching Cut needs the HM Cut (the S.S. Anne captain in Vermilion)',
  mon: 'That is not a Pokémon of your team',
  boxed: 'That Pokémon is in the Box — take it into the team first',
  species: 'That Pokémon cannot learn Cut',
  knows: 'That Pokémon knows Cut already',
  limit: 'No more Pokémon can learn Cut',
  actions: 'Not enough actions left this turn',
};
export const teachCutIllegalText = (state, player, uid) => teachCutBlockers(state, player, uid).map((b) => TEACH_EN[b.code]).join('; ') || 'Teaching Cut is not possible now';

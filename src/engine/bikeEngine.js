// BIKE-1 — „Rower” (rules.bike 'b1', a DEV pilot; data/bike.js, Piotr's OWNER GO 18.11.2026: W2 trails + W3 downhill). The
// bicycle (a lasting key item from the Fan Club's voucher) lets the player ride a TRAIL (town – route – town, both ways) or
// the Cycling Road DOWNHILL (Route 16 → 17 → 18, one way) for ONE Move action.
//
// A ride is two ORDINARY steps along EXISTING edges (no new edge, the canonical map unchanged): each step is asked of the one
// travel graph (graphEngine.canStep — Team Rocket's closed road, a world incident, Snorlax, a missing capability) and must be
// a land road (never water, Surf or an Underground Path). The middle place is a real arrival — visited, vigilance, the quest
// book's / missions' / rumours' `arrive`, Team Rocket on arrival — and when something happens there (an ambush, Team Rocket
// at its entry, a pitfall, any battle or choice) the ride STOPS there, as a walk would. Otherwise the second step is the
// same arrival at the end. Uphill (Route 18 → 16) is never a ride: an ordinary walk.
//
// The AI never gets the bicycle (its quest is `family` — questBookEngine.takeBlock never offers it to an AI player) and is
// never offered a ride: an AI-only game plays the same with the switch ON or OFF (AI v2e's code untouched).
//
// BIKE V2 — „3 pola za 2 akcje” (rules.bike 'b2', the DEV pilot `bike2`; ChatGPT 22.11 GO on BIKE_V2_SURF_AUDIT_2211.md, Piotr's
// parameters P2 R1 · P3 J1 · P4 once a turn · P5 3 steps · P6 no Underground Path · P7 CR-1 · P8 Team Rocket stops it). No
// trails: from wherever the player stands, a ride `{ type: 'ride', to, path }` goes 3 BIKE STEPS along existing land edges to
// a place 3 walking steps away (the route is then the only one — the game shows it; data/bike.js). The Cycling Road downhill
// (Route 16 → 17 → 18) is ONE bike step (CR-1, Route 17 visited as usual), so Celadon → Fuchsia (4 walking steps) is a ride
// too; uphill the bike never goes. Each place on the way is an ordinary arrival (as b1). The 1st and the 2nd step are paid as
// they are ridden, the 3rd is free (R1): Team Rocket on the way (a battle at its entry, an ambush, a pitfall) stops the ride
// there and the player paid only the steps ridden. One ride a turn (state.turn.bikeRode, gone at the next turn), only with two
// actions left (J1). b1's trails, its quest and its saves are untouched.
import { BIKE } from '../data/bike.js';
import { getLocation } from '../data/locations.js';
import { pickVersion } from '../rules.js';
import { log } from './log.js';
import { vigilanceOnMove } from './captureEngine.js';
import { canStep } from './graphEngine.js';
import { getEdgeMeta, networkEdgeList } from './travelEngine.js';
import { recordQuestEvent } from './questEngine.js';
import { activePlot, plotCard, rocketOnArrive, usesRocketEntry } from './rocketEngine.js';
import { hasHealthyPokemon } from './gameState.js';

export const usesBike = (config) => config?.rules?.bike === 'b1' || config?.rules?.bike === 'b2';
export const usesBike2 = (config) => config?.rules?.bike === 'b2'; // BIKE V2
export const bikeSpec = (config) => pickVersion(BIKE, config.rules.bike, 'Bike rules');
export const isBikeQuest = (id) => Object.values(BIKE).some((v) => v.hmFrom === id);
export const hasBike = (player, config) => Boolean(player.questBook?.keyItems.includes(bikeSpec(config).keyItem));

// BIKE V2: the ride table of this game's network (computed once per config): from → [{ to, path, kind }] — `path` the places
// ridden through, the end last; kind 'downhill' when it uses the Cycling Road downhill (CR-1), else 'ride'. A bike step is a
// LAND edge (never water, Surf, an Underground Path), never uphill on Cycling Road; Route 16 ⇒ Route 18 (through 17) is one
// step. An end is a place at most `steps` bike steps away (the shortest way — always one) and at least `steps` WALKING steps
// away (land and the Underground Paths; nearer places are walked for the same actions).
const B2_TABLES = new WeakMap();
function b2Table(config) {
  let table = B2_TABLES.get(config);
  if (table) return table;
  const spec = bikeSpec(config);
  const [top, mid, bottom] = spec.downhill;
  const walk = new Map();
  const bike = new Map();
  const add = (m, a, b) => (m.get(a) ?? m.set(a, []).get(a)).push(b);
  for (const { a, b, meta } of networkEdgeList(config)) {
    if (meta.traversal !== 'water') {
      add(walk, a, b);
      add(walk, b, a);
    }
    if (meta.traversal !== 'land') continue;
    // CR-1: no step up the hill (18 → 17, 17 → 16), and no stop half-way down (16 → 17 alone): 16 ⇒ 18 below is the step
    if (!((a === mid && b === top) || (a === top && b === mid) || (a === bottom && b === mid))) add(bike, a, b);
    if (!((b === mid && a === top) || (b === top && a === mid) || (b === bottom && a === mid))) add(bike, b, a);
  }
  const bikeSteps = (at) => [...(bike.get(at) ?? []).map((x) => [x]), ...(at === top && bike.has(mid) ? [[mid, bottom]] : [])];
  const bfs = (from) => {
    const d = new Map([[from, 0]]);
    const q = [from];
    while (q.length) {
      const x = q.shift();
      for (const y of walk.get(x) ?? []) if (!d.has(y)) { d.set(y, d.get(x) + 1); q.push(y); }
    }
    return d;
  };
  table = new Map();
  for (const from of bike.keys()) {
    const walked = bfs(from);
    const best = new Map([[from, { n: 0, path: [] }]]);
    const q = [from];
    while (q.length) {
      const at = q.shift();
      const { n, path } = best.get(at);
      if (n >= spec.steps) continue;
      for (const step of bikeSteps(at)) {
        const end = step[step.length - 1];
        if (best.has(end) || step.some((x) => x === from || path.includes(x))) continue;
        best.set(end, { n: n + 1, path: [...path, ...step] });
        q.push(end);
      }
    }
    const rides = [];
    for (const [to, { n, path }] of best) {
      if (n === 0 || (walked.get(to) ?? Infinity) < spec.steps) continue;
      const way = [from, ...path];
      const i = way.indexOf(mid);
      rides.push({ to, path, kind: i >= 0 && way[i + 1] === bottom ? 'downhill' : 'ride' }); // down the Cycling Road
    }
    table.set(from, rides);
  }
  B2_TABLES.set(config, table);
  return table;
}

// Every ride that STARTS at `from` in this game's data (legality aside): b1 { via, to, kind: 'trail' | 'downhill' };
// b2 { to, path, kind: 'ride' | 'downhill' }
export function ridesFrom(config, from) {
  if (!usesBike(config)) return [];
  if (usesBike2(config)) return b2Table(config).get(from) ?? [];
  const spec = bikeSpec(config);
  const out = [];
  for (const [a, via, b] of spec.trails) {
    if (from === a) out.push({ via, to: b, kind: 'trail' });
    if (from === b) out.push({ via, to: a, kind: 'trail' });
  }
  const [top, mid, bottom] = spec.downhill;
  if (from === top) out.push({ via: mid, to: bottom, kind: 'downhill' });
  return out;
}

// The downhill's edges (one way: [from, to]) — the board's arrows
export const downhillLegs = (config) => {
  const [a, b, c] = bikeSpec(config).downhill;
  return [[a, b], [b, c]];
};

const landRoad = (state, a, b) => {
  try {
    return getEdgeMeta(a, b, state.config).traversal === 'land';
  } catch {
    return false;
  }
};

// What stands between this player and a ride, in a fixed order (the table says it in Polish):
//   'off'      this game has no bike
//   'phase'    another step first (a battle, a choice, the shop)
//   'bike'     no bicycle yet
//   'actions'  no action left this turn
//   'here'     no trail and no downhill starts here (`uphill`: on Route 18 / 17 — the downhill goes only down)
//   'road'     a trail starts here, but its road is closed now — `routes`: [{ to, via, at }] where `at` is the closed leg
// BIKE V2 (b2) also: 'actions2' one action left (J1: two needed) · 'once' this turn's ride is done (P4); 'here' — no place
// 3 steps away by bike from here; 'road' — every ride from here has a closed leg (`routes`: [{ to, path, at }])
export function bikeBlockers(state, player) {
  if (!usesBike(state.config)) return [{ code: 'off' }];
  const out = [];
  const busy = state.phase !== 'turn' || state.growthChoice || state.boxChoice || state.oakJobDraft || state.trade || state.pvp || state.battlePrep;
  if (busy) out.push({ code: 'phase' });
  if (!hasBike(player, state.config)) out.push({ code: 'bike' });
  if (state.turn.actionsRemaining <= 0) out.push({ code: 'actions' });
  if (usesBike2(state.config)) {
    const spec = bikeSpec(state.config);
    if (state.turn.actionsRemaining > 0 && state.turn.actionsRemaining < spec.minActions) out.push({ code: 'actions2', left: state.turn.actionsRemaining });
    if ((state.turn.bikeRode ?? 0) >= spec.perTurn) out.push({ code: 'once' });
    const routes = ridesFrom(state.config, player.location);
    if (!routes.length) out.push({ code: 'here', uphill: false });
    else {
      const closed = routes.map((r) => ({ ...r, at: closedLeg(state, player, player.location, r) })).filter((r) => r.at);
      if (closed.length === routes.length) out.push({ code: 'road', routes: closed });
    }
    return out;
  }
  const routes = ridesFrom(state.config, player.location);
  if (!routes.length) {
    const [, mid, bottom] = bikeSpec(state.config).downhill;
    out.push({ code: 'here', uphill: [mid, bottom].includes(player.location) });
  } else {
    const closed = routes.map((r) => ({ ...r, at: closedLeg(state, player, player.location, r) })).filter((r) => r.at);
    if (closed.length === routes.length) out.push({ code: 'road', routes: closed });
  }
  return out;
}

// the legs of a ride, in order ([a, b] — b1: through `via`; b2: along `path`)
const legsOf = (from, r) => (r.path ? r.path.map((b, i) => [i ? r.path[i - 1] : from, b]) : [[from, r.via], [r.via, r.to]]);
// the first leg of this ride that cannot be ridden now ([a, b]), or null
function closedLeg(state, player, from, r) {
  for (const [a, b] of legsOf(from, r)) if (!landRoad(state, a, b) || !canStep(state, player, a, b)) return [a, b];
  return null;
}

// The rides open now — b1 { type: 'ride', to, via }; b2 { type: 'ride', to, path } (a legal action). Never for an AI
// player (it has no bike anyway).
export function rideActions(state, player) {
  if (!usesBike(state.config) || player.controller === 'ai' || bikeBlockers(state, player).length) return [];
  const open = ridesFrom(state.config, player.location).filter((r) => !closedLeg(state, player, player.location, r));
  if (usesBike2(state.config)) return open.map((r) => ({ type: 'ride', to: r.to, path: [...r.path] }));
  return open.map((r) => ({ type: 'ride', to: r.to, via: r.via }));
}

// BIKE V2: the ride's route as bike steps — [[place], [route-17, route-18], …] (the downhill is ONE step, CR-1)
export function bikeStepsOf(config, from, path) {
  const [top, mid, bottom] = bikeSpec(config).downhill;
  const out = [];
  for (let i = 0; i < path.length; i++) {
    const prev = i ? path[i - 1] : from;
    if (prev === top && path[i] === mid && path[i + 1] === bottom) {
      out.push([mid, bottom]);
      i += 1;
    } else out.push([path[i]]);
  }
  return out;
}

// BIKE V2 (P8): where Team Rocket will stop this ride, as far as the table can tell before it starts — the active plot's
// place on the route when arriving there starts a battle (its entry, an ambush) or springs a pitfall; else null. The ride
// itself never trusts this: it stops wherever something really happens (ride below).
export function rideStopAt(state, player, path) {
  const active = activePlot(state);
  if (!active || !path.includes(active.location)) return null;
  const kind = plotCard(active).effect.kind;
  const stops = usesRocketEntry(state) ? hasHealthyPokemon(player) || kind === 'pitfall' : (kind === 'ambush' && hasHealthyPokemon(player)) || kind === 'pitfall';
  return stops ? active.location : null;
}

// One step of a ride: the ordinary arrival (as turnEngine's move, without its action — the ride paid one)
function arrive(state, player, to) {
  player.previousLocation = player.location;
  player.location = to;
  if (!player.visited.includes(to)) player.visited.push(to);
  vigilanceOnMove(state, player);
  recordQuestEvent(state, player, { kind: 'arrive', location: to });
  rocketOnArrive(state, player);
}

// whether the arrival just made stopped the ride: a battle (an ambush, Team Rocket at its entry), a choice, or Team Rocket's
// pitfall (the turn ends) — `left` / `pits` as they were before the arrival
const stoppedNow = (state, player, left, pits) => Boolean(state.encounter) || state.phase !== 'turn' || state.turn.actionsRemaining < left || (player.stats?.rocket?.pitfalls ?? 0) > pits || Boolean(state.battlePrep || state.growthChoice || state.boxChoice);

// BIKE V2: the ride along its path — the 1st and 2nd bike steps are paid as they are ridden (R1), the 3rd is free; every
// place is an ordinary arrival; the first one where something happens ends the ride there (P8). One ride a turn (P4).
function rideB2(state, player, to, path) {
  const spec = bikeSpec(state.config);
  const from = player.location;
  const r = ridesFrom(state.config, from).find((x) => x.to === to && x.path.join('>') === path.join('>'));
  state.turn.bikeRode = (state.turn.bikeRode ?? 0) + 1;
  const steps = bikeStepsOf(state.config, from, path);
  let paid = 0;
  let at = null;
  ride: for (let k = 0; k < steps.length; k++) {
    if (k < spec.paidSteps) {
      state.turn.actionsRemaining -= 1;
      paid += 1;
    }
    for (const place of steps[k]) {
      const left = state.turn.actionsRemaining;
      const pits = player.stats?.rocket?.pitfalls ?? 0;
      arrive(state, player, place);
      if (stoppedNow(state, player, left, pits)) {
        at = place;
        break ride;
      }
    }
  }
  const stopped = Boolean(at) && at !== to;
  const names = [from, ...path].map((id) => getLocation(id).name).join(' → ');
  log(state, 'action', `${player.name} rides the bicycle ${names}${stopped ? ` — and stops at ${getLocation(at).name}` : ''} (BIKE V2${r?.kind === 'downhill' ? ', Cycling Road downhill' : ''}: ${paid} action${paid === 1 ? '' : 's'})`, { ride: { player: player.id, from, to, path: [...path], kind: r?.kind ?? 'ride', stopped, at: stopped ? at : null, paid } });
}

// The ride (a legal action — turnEngine checked it): one action, the middle, then the end unless the middle stopped it.
export function ride(state, player, to, via, path = null) {
  if (usesBike2(state.config)) return rideB2(state, player, to, path ?? []);
  const from = player.location;
  const r = ridesFrom(state.config, from).find((x) => x.to === to && x.via === via);
  state.turn.actionsRemaining -= 1;
  const left = state.turn.actionsRemaining;
  const pits = player.stats?.rocket?.pitfalls ?? 0;
  arrive(state, player, via);
  // stopped in the middle: a battle (an ambush, Team Rocket at its entry), a choice, or Team Rocket's pitfall (the turn ends)
  const stopped = Boolean(state.encounter) || state.phase !== 'turn' || state.turn.actionsRemaining < left || (player.stats?.rocket?.pitfalls ?? 0) > pits || Boolean(state.battlePrep || state.growthChoice || state.boxChoice);
  log(state, 'action', `${player.name} rides the bicycle ${getLocation(from).name} → ${getLocation(via).name}${stopped ? ' — and stops there' : ` → ${getLocation(to).name}`} (${r?.kind === 'downhill' ? 'Cycling Road, downhill' : 'a bike trail'}: 1 action)`, { ride: { player: player.id, from, via, to, kind: r?.kind ?? 'trail', stopped } });
  if (stopped) return;
  arrive(state, player, to);
}

// explainIllegal (English, as the engine's other answers)
const BLOCKER_EN = {
  off: 'This game has no bicycle',
  phase: 'Finish the current step first',
  bike: 'Riding needs the bicycle (the Fan Club voucher, the Cerulean bike shop)',
  actions: 'No action left this turn',
  here: 'No bike trail or downhill starts here',
  road: 'The road of this ride is closed now',
  actions2: 'A ride takes two actions (one action left: walk one step)',
  once: 'One ride a turn',
};
// QA 21.11: never throws — a ride whose road is open but which is still not legal (an AI player, who never rides; a crafted
// action) gets its plain reason instead of reading a closed leg that is not there.
export function rideIllegalText(state, player, to, via, path = null) {
  const why = bikeBlockers(state, player).filter((b) => b.code !== 'road').map((b) => (b.code === 'here' && usesBike2(state.config) ? 'No place three bike steps away from here' : BLOCKER_EN[b.code]));
  if (why.length) return why.join('; ');
  const r = usesBike2(state.config)
    ? ridesFrom(state.config, player.location).find((x) => x.to === to && x.path.join('>') === (path ?? []).join('>'))
    : ridesFrom(state.config, player.location).find((x) => x.to === to && x.via === via);
  if (!r) return usesBike2(state.config) ? `There is no ride to ${to} along ${(path ?? []).join(' → ') || '(no path)'} from here` : `There is no ride to ${to} through ${via} from here`;
  const leg = closedLeg(state, player, player.location, r);
  if (leg) return `${BLOCKER_EN.road}: ${leg.join(' → ')}`;
  return player.controller === 'ai' ? 'The AI never rides' : 'This ride is not possible now';
}

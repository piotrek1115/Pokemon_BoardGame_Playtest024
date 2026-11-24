// The digital Kanto board: art + graph, pawns that glide between places,
// Poké Stop / gym / League / Team Rocket markers, legal destinations glowing.
// Tap a glowing place to move; tap a closed neighbour to hear why. Movement
// legality always comes from the engine; coordinates are presentation only.
import { getLocation, hasFeature, isLocationEnabled, topologyLocations } from '../data/locations.js';
import { MAP_LAYOUT } from '../data/mapLayout.js';
import { gymInCity } from '../data/gyms.js';
import { CAPABILITIES, CROSS_MAP_SHORTCUTS } from '../data/travelConnections.js';
import { getLegalActions } from '../engine/turnEngine.js';
import { currentPlayer } from '../engine/gameState.js';
import { edgeKey, networkEdgeList } from '../engine/travelEngine.js';
import { activePlot, challengeLocations, plotCard, rocketBlocks } from '../engine/rocketEngine.js';
import { incidentDef, incidentOnEdge, incidentsNow } from '../engine/incidentEngine.js';
import { closedNeighbors, worldBlocks } from '../engine/graphEngine.js';
import { gymsEnabled, hasBadge } from '../engine/gymEngine.js';
import { questLocations } from '../engine/questEngine.js';
import { hasPokeStop, healOnlySpot } from '../engine/pokeStopEngine.js';
import { placeFatigue } from '../engine/fatigueEngine.js';
import { rumourList } from '../engine/rumourEngine.js';
import { fieldOfferPlaces } from '../engine/livingKantoEngine.js';
import { pawnSvg } from './tokens.js';
import { patchKeyed, setHtml } from './patch.js';

// SVG markup parsed in an <svg> (the board's places and roads are SVG elements).
const svgBox = (html) => {
  const box = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  box.innerHTML = html;
  return box;
};
import { esc } from '../ui/dom.js';
import { BUSH_PL, campaignFlagPl, INCIDENT_PL, QUESTBOOK_PL, offerTitlePl, placeName, plotPl, rewardPl, surfBlockerPl } from './content-pl.js';
import { canSurf, surfBlockers } from '../engine/surfEngine.js';
import { bikeSpec, downhillLegs, hasBike, usesBike, usesBike2 } from '../engine/bikeEngine.js';
import { bushAt, cutDone } from '../engine/cutEngine.js';
import { occupiedAt } from '../engine/rocketCampaignEngine.js';
import { bookQuest } from '../engine/questBookEngine.js';
import { fieldQuestHints } from './journal.js';
import { usesUx } from './tracker.js';
import { incidentInfo, legendPlaces, placeListCard, placeMarkInfo } from './mapInfo.js';
// UX-2311 · MAP (rules.ux): the mark column, badges, portraits, the „?” by the Poké Stops (mapMarks.js)
import { MARK, MIN_PX, TAP_PX, nodeStopSvg, placeChip as chipGeometry, placeDisc, stepFor, badgeMarkSvg, boxAround, columnSvg, discSvg, incidentMarkSvg, labelBox, layoutColumns, mapIcon, nodeEdge, pawnSpot, portraitSvg } from './mapMarks.js';

const W = 1000;
const loc0 = (id) => getLocation(id);
// The family table plays on the hand-made Kanto board art only (Playtest Build
// 2 release gate). The schematic grid is a harness / debug view: no silent
// fallback here — without the art the board says so (BRAK GRAFIKI PLANSZY).
export const BOARD_ART = 'assets/boards/kanto-board.jpg';
const DEFAULT_ASPECT = 5000 / 3453;
const NEEDS_PL = { canTravelWater: 'Soul Badge (pływanie)', canClimbMountain: 'wspinaczki', canEnterCave: 'wejścia do jaskini', canFly: 'latania', leagueBadges: 'wszystkich odznak do Ligi (brama Route 23)' }; // + NIGHTSHIFT A: the Route 23 variant

// 3A-5 (DQ-85): the Underground Paths are not on the board art, so the overlay
// draws them — a dashed tunnel bowing around Saffron City. `bend`: how far the
// curve leaves the straight line, as a share of its length (+ = to the right of
// a → b as seen on the screen); `at`: where along it (0 = a, 1 = b) the tunnel
// icon and, while it is a move choice, its words sit — clear of other places.
// (11.10: Piotr's new layout moved Route 6 west, so Route 5 ↔ 6 bows west of Saffron.)
export const TUNNELS = { 'route-5|route-6': { bend: 0.2, at: 0.6 }, 'route-7|route-8': { bend: -0.08, at: 0.75 } };
const SHORTCUT_PLACES = new Set(CROSS_MAP_SHORTCUTS.map((s) => s.location));
// DQ-96 board: the Diglett's Cave shortcut crosses the whole map, and a
// straight line would run right over Route 7, so it swings south of it. Two
// control points [t, o] keyed like edgeKey (a = the first id): t along a → b
// (0…1), o off the straight line as a share of its length (+ = to the right of
// a → b on the screen, as TUNNELS' bend). Clear of every other place.
export const SHORTCUT_CURVES = { 'digletts-cave|route-11': [[0.35, 0.2], [0.4, 0.04]] };

// Family words for a travel edge (move choices, tunnel tags, taps).
export function travelLabelPl(meta) {
  if (meta.kind === 'sea') return { title: 'TRASA WODNA', cost: '1 akcja', text: '🌊 TRASA WODNA · 1 AKCJA' }; // SURF-0 (travelNetwork 'v3', DEC-05 12.11)
  if (meta.kind !== 'underground') return null;
  const actions = meta.actionCost === 1 ? '1 akcja' : `${meta.actionCost} akcje`;
  return { title: 'PODZIEMNE PRZEJŚCIE', cost: actions, text: `PODZIEMNE PRZEJŚCIE · ${actions.toUpperCase()}` };
}

// A move choice in family words: „Route 6 · PODZIEMNE PRZEJŚCIE · 1 akcja”, or
// just the place for an ordinary road.
export function moveChoicePl(state, from, to) {
  const tunnel = networkEdgeList(state.config).find((e) => edgeKey(e.a, e.b) === edgeKey(from, to) && (e.meta.kind === 'underground' || e.meta.kind === 'sea'));
  const name = placeName(to);
  if (!tunnel) return name;
  const label = travelLabelPl(tunnel.meta);
  return `${name} · ${label.title} · ${label.cost}`;
}

// A quadratic curve from a to b: its path, a point on it (`at`, t = 0…1; its
// middle is where it bends most) and the side it bows to (`out`).
export function tunnelCurve(a, b, bend) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len = Math.hypot(dx, dy) || 1;
  const nx = -dy / len;
  const ny = dx / len;
  const c = { x: (a.x + b.x) / 2 + 2 * nx * bend * len, y: (a.y + b.y) / 2 + 2 * ny * bend * len };
  const at = (t) => ({ x: (1 - t) ** 2 * a.x + 2 * (1 - t) * t * c.x + t ** 2 * b.x, y: (1 - t) ** 2 * a.y + 2 * (1 - t) * t * c.y + t ** 2 * b.y });
  const r = (v) => Math.round(v * 10) / 10;
  return { d: `M${r(a.x)} ${r(a.y)} Q${r(c.x)} ${r(c.y)} ${r(b.x)} ${r(b.y)}`, at, out: { x: Math.sign(bend) * nx, y: Math.sign(bend) * ny } };
}

// A cubic curve from a to b through two control points [t, o] (see SHORTCUT_CURVES).
export function shortcutCurve(a, b, [[t1, o1], [t2, o2]]) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len = Math.hypot(dx, dy) || 1;
  const nx = -dy / len;
  const ny = dx / len;
  const c = (t, o) => ({ x: a.x + t * dx + o * len * nx, y: a.y + t * dy + o * len * ny });
  const r = (v) => Math.round(v * 10) / 10;
  const [c1, c2] = [c(t1, o1), c(t2, o2)];
  return `M${r(a.x)} ${r(a.y)} C${r(c1.x)} ${r(c1.y)} ${r(c2.x)} ${r(c2.y)} ${r(b.x)} ${r(b.y)}`;
}

function readOverrides() {
  try {
    return JSON.parse(localStorage.getItem('kanto.layoutOverrides.v1')) ?? {};
  } catch {
    return {};
  }
}

// Why a neighbour can't be entered, in family language.
// Where „Wyzwij Team Rocket” works, in family words: a closed place is left
// out (nobody can enter it) unless the player stands inside.
export function rocketPlacesPl(state, player) {
  const closed = worldBlocks(state)?.locations ?? [];
  return challengeLocations(state).filter((id) => !closed.includes(id) || id === player.location).map(placeName).join(' albo ');
}

export function blockedReason(state, player, to) {
  const b = closedNeighbors(state, player).find((x) => x.to === to); // the one effective graph
  if (!b) return null;
  if (b.rocket) {
    const inc = incidentOnEdge(state, rocketBlocks(state), player.location, to); // NIGHTSHIFT D (pilot): a closure of the world
    if (inc) return `${INCIDENT_PL[inc].icon} ${INCIDENT_PL[inc].name}: ${INCIDENT_PL[inc].text}`;
    return `🎈 Team Rocket zamknął drogę: ${plotPl(activePlot(state).plotId).title}`;
  }
  // SURF-1: a water route that needs Surf names every missing piece (the HM, the badge, a swimmer) — the Fly sheet's words
  if (b.missing.includes('surf')) return `🌊 Ta trasa wodna wymaga Surfa. ${surfBlockers(player, state.config).map(surfBlockerPl).join(' ')}`;
  const needs = b.missing.map((c) => NEEDS_PL[c] ?? CAPABILITIES[c]?.name ?? c).join(' + ');
  return `${b.missing.map((c) => CAPABILITIES[c]?.icon ?? '').join('')} Ta droga wymaga: ${needs}.`;
}

export class BoardView {
  constructor(root, { onMove, onInfo, onRocket = null, onRide = null, onRidePreview = null, onFlyPick = null }) {
    this.root = root;
    this.onMove = onMove;
    this.onRide = onRide; // BIKE-1
    this.onRidePreview = onRidePreview; // BIKE V2: the route and its card first
    this.onFlyPick = onFlyPick; // FLY ON THE MAP (rules.ux)
    this.onInfo = onInfo;
    this.onRocket = onRocket;
    this.state = null;
    this.aspect = DEFAULT_ASPECT;
    this.overrides = readOverrides();
    root.dataset.boardArt = 'loading';
    // Build 3.2 hotfix (a walking pawn lost frames on the tablet): the board art is an
    // <img> on its own layer under the SVG, fitted exactly as the SVG's viewBox is
    // (object-fit: contain = xMidYMid meet, the same aspect), so the pawn's animation
    // repaints only the light SVG, never the 2400 px picture. The SVG <image> keeps
    // the address (the release checks read it) but is not painted.
    root.innerHTML = `<img class="board-art-img" alt="" draggable="false" decoding="async" hidden>
      <svg class="board-svg" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid meet">
      <defs><filter id="ux-grey" color-interpolation-filters="sRGB"><feColorMatrix type="saturate" values="0"/></filter></defs>
      <image class="board-art" x="0" y="0" width="${W}"/>
      <g class="b-edges"></g><g class="b-nodes"></g><g class="b-marks"></g><g class="b-rocket"></g><g class="b-pawns"></g></svg>
      <div class="board-missing" role="alert" hidden>
        <b>BRAK GRAFIKI PLANSZY</b>
        <p>Nie udało się wczytać mapy Kanto (<code>${BOARD_ART}</code>). Ta wersja gry nie ma planszy — gra na schemacie jest wyłączona.</p>
        <p class="small">Jeśli tablet jest offline: połącz go z internetem i odśwież stronę. Jeśli to nowa wersja: zbuduj ją z grafiką planszy (<code>npm run build:tablet</code>).</p>
      </div>`;
    this.svg = root.querySelector('svg');
    this.image = root.querySelector('.board-art');
    this.layer = root.querySelector('.board-art-img');
    this.loadArt();
    // UX-2311 · MAP: the mark columns are laid out for the names' size (Ustawienia → Mapa) and the screen's size (the hit
    // areas) — when either changes, the board lays them out again (only with the pilot; nothing else is redrawn)
    const relayout = () => { if (usesUx(this.state?.config) && this.layoutKey !== this.uxLayoutKey()) this.render(); };
    if (typeof MutationObserver !== 'undefined') new MutationObserver(relayout).observe(root, { attributes: true, attributeFilter: ['style', 'class'] });
    if (typeof window !== 'undefined') window.addEventListener('resize', () => { clearTimeout(this.relayoutTimer); this.relayoutTimer = setTimeout(relayout, 150); });
    // the names are measured in the board's own font: once it has loaded, measure again
    if (typeof document !== 'undefined' && document.fonts?.ready) document.fonts.ready.then(() => { this.fontsReady = true; this.labelCache = null; if (usesUx(this.state?.config)) this.render(); });
    this.svg.addEventListener('click', (e) => {
      const node = e.target.closest('[data-node]');
      if (node && this.flyOf(node.dataset.node)) return this.tap(node.dataset.node); // FLY ON THE MAP: a green town's marks fly too
      // UX-2211 (rules.ux 'u1'): an incident on a road, the Cycling Road's arrows, a place's rumour / 🎯 / 📌 / shut gym — a card
      // that says what it is (mapInfo.js), never a move
      if (usesUx(this.state?.config)) {
        const inc = e.target.closest('[data-incident]');
        if (inc) return this.onInfo(incidentInfo(this.state, inc.dataset.incident) ?? INCIDENT_PL[inc.dataset.incident]?.text ?? '');
        if (e.target.closest('[data-downhill]')) return this.onInfo(placeMarkInfo(this.state, 'downhill'));
        const mark = node && e.target.closest('[data-mark]');
        // UX-2311 pass 2: a crowded place's one marker — the place card (the list of every mark there)
        if (mark?.dataset.mark === 'place') return this.onInfo(this.placeCard(node.dataset.node));
        const card = mark && placeMarkInfo(this.state, mark.dataset.mark, node.dataset.node);
        if (card) return this.onInfo(card);
      }
      // PLAYTEST_017 PT017-03: a tap on the 📋 mark itself says what it is — never a move (the place's own tap still moves)
      if (node && e.target.closest('.field-mark')) return this.onInfo(this.fieldInfo(node.dataset.node));
      if (node && e.target.closest('.hm-mark')) return this.onInfo(this.hmInfo(node.dataset.node)); // PT019-01: the same — words, never a move
      if (node && e.target.closest('.campaign-flag')) { const ch = occupiedAt(this.state, node.dataset.node); return this.onInfo(campaignFlagPl(node.dataset.node, ch, bookQuest(ch.frees.quest)?.takeAt ?? node.dataset.node)); } // ROCKET-2: words, never a move
      if (node && e.target.closest('.bush-mark')) return this.onInfo(this.bushInfo(node.dataset.node)); // CUT-1: words, never a move
      if (node && e.target.closest('.bike-mark')) return this.onInfo('🚲 Szlak rowerowy: z rowerem przejedziesz z miasta do miasta jedną akcją.'); // BIKE-1: words, never a move
      if (node) this.tap(node.dataset.node);
      else if (e.target.closest('[data-tunnel]')) this.tapTunnel(e.target.closest('[data-tunnel]').dataset.tunnel);
    });
  }

  loadArt() {
    const img = new Image();
    img.onload = () => {
      this.aspect = img.naturalWidth / img.naturalHeight || DEFAULT_ASPECT;
      this.image.setAttribute('href', BOARD_ART);
      this.layer.src = BOARD_ART;
      this.layer.hidden = false;
      this.root.dataset.boardArt = 'ok';
      // Absolute: a relative url() in a custom property resolves against the stylesheet.
      this.root.style.setProperty('--board-art', `url("${new URL(BOARD_ART, document.baseURI).href}")`);
      this.render();
    };
    img.onerror = () => {
      this.root.dataset.boardArt = 'missing';
      this.svg.style.display = 'none';
      this.root.querySelector('.board-missing').hidden = false;
    };
    img.src = BOARD_ART;
  }

  // NIGHTSHIFT_015 E2 (pilot): a place with field cards says what hangs there — how many, which, how hard, the reward
  fieldPl(id) {
    const state = this.state;
    const player = currentPlayer(state);
    const fieldAt = fieldOfferPlaces(state, player).get(id);
    return fieldAt ? ` · 📋 ${fieldAt.length === 1 ? 'zlecenie' : `${fieldAt.length} zlecenia`}: ${fieldAt.map((o) => `${offerTitlePl(o.quest.lk)} ${'★'.repeat(o.difficulty)} (${rewardPl(o.quest.reward)}, odbiór: ${o.quest.claimAt === o.stop ? placeName(o.stop) : 'dowolny Poké Stop'})`).join('; ')}${id === player.location ? ' — weź w Dzienniku' : ' — weź je na miejscu'}` : '';
  }
  // PLAYTEST_019 PT019-01: an HM / TM quest's mark (🪽 / 🌊 / 💿) — what waits there (a tap on it)
  hmInfo(id) {
    const state = this.state;
    return fieldQuestHints(state, currentPlayer(state)).filter((h) => h.place === id).map((h) => h.text).join(' ');
  }
  // CUT-1 (rules.cut): a bush's mark — what it is, or the stump. UX-2311 A6 (a spoiler, for everyone): what hides behind the
  // bush is NEVER said before it is cut — only the cut's own result (flow.js) and the log tell it
  bushInfo(id) {
    const state = this.state;
    const bush = bushAt(state.config, id);
    if (!bush) return placeName(id);
    return cutDone(currentPlayer(state)).includes(bush.id) ? `🪵 ${placeName(id)}: ten krzaczek już ścięty.` : `🌳 ${placeName(id)}: krzaczek — ${BUSH_PL[bush.id] ?? ''}. Zetnij go z HM Cut (1 akcja) — za krzaczkiem coś czeka.`;
  }

  // PLAYTEST_017 PT017-03: the 📋 mark's own words (a tap on it)
  fieldInfo(id) {
    return `📋 Zlecenie dostępne w terenie — ${placeName(id)}${this.fieldPl(id).replace(/^ · 📋 [^:]+: /, ': ')}`;
  }

  // A place of an older board without a marker of its own is drawn where the
  // board has it (kanto43's Route 10 / Rock Tunnel at Rock Tunnel — `drawnAt`).
  pos(id) {
    const p = this.overrides[id] ?? MAP_LAYOUT.positions[id] ?? MAP_LAYOUT.positions[getLocation(id).drawnAt];
    return { x: p.x * W, y: (p.y * W) / this.aspect };
  }

  tap(id) {
    const state = this.state;
    if (!state) return;
    const player = currentPlayer(state);
    if (this.fly && this.interactive) { // FLY ON THE MAP: only a green town answers; no walk and no ride meanwhile
      const flight = this.flyOf(id);
      if (flight) this.onFlyPick?.(flight);
      else this.onInfo('Tam nie polecisz. Dotknij zielonego miasta albo jeszcze raz przycisku Lot.');
      return;
    }
    const legal = this.legalTargets();
    const loc = getLocation(id);
    if (legal.has(id)) {
      const via = moveChoicePl(state, player.location, id);
      if (via !== placeName(id)) this.onInfo(via); // through an Underground Path: say so
      this.onMove(id);
      return;
    }
    // BIKE-1 (rules.bike): a ride's end glows too — one tap rides there (the engine's action, as the Rower view's button)
    // BIKE V2 (b2): the tap shows the route first — „🚲 Jedź” on its card rides (bikePreview.js)
    const ride = this.rideTargets().get(id);
    if (ride && usesBike2(state.config) && this.onRidePreview) {
      this.onRidePreview(ride);
      return;
    }
    if (ride && this.onRide) {
      this.onRide(ride);
      return;
    }
    const fieldPl = this.fieldPl(id);
    if (player.controller !== 'human' || state.phase !== 'turn') {
      this.onInfo(`${placeName(id)}${fieldPl}`);
      return;
    }
    if (id === player.location) {
      this.onInfo(`Tu jesteś: ${placeName(id)}${fieldPl}`);
      return;
    }
    if (fieldPl) {
      const why = blockedReason(state, player, id);
      this.onInfo(`${placeName(id)}${fieldPl}${why ? ` · ${why}` : ''}`);
      return;
    }
    // Macro 01 (family playtest: Diglett's Cave closed by Rocket, the challenge
    // not found): a tap on Team Rocket's place opens its card with „Wyzwij” when
    // the challenge is possible here, else says where it is possible.
    const active = activePlot(state);
    if (active?.location === id) {
      if (this.onRocket && getLegalActions(state).some((a) => a.type === 'challengeRocket')) {
        this.onRocket();
        return;
      }
      const here = challengeLocations(state).includes(player.location);
      const why = !here ? '' : player.team.every((m) => m.hp === 0) ? ' Najpierw wylecz drużynę.' : state.turn.actionsRemaining <= 0 ? ' Brak akcji w tej turze.' : '';
      this.onInfo(`🎈 ${plotPl(active.plotId).title} — wyzwij Team Rocket z: ${rocketPlacesPl(state, player)}.${why}`);
      return;
    }
    const why = blockedReason(state, player, id);
    if (why) this.onInfo(why);
    else if (state.turn.actionsRemaining <= 0) this.onInfo('Brak akcji — zakończ turę.');
    else this.onInfo(`${placeName(id)} — za daleko. Idziesz tylko do sąsiedniego miejsca.`);
  }

  // Macro 02 M02-1 (the Pokédex's „Gdzie szukać”): show a place — a pulsing
  // ring and its name for a few seconds. Nothing else: no move, no action, the
  // game state is never touched.
  locate(id) {
    this.located = id;
    clearTimeout(this.locateTimer);
    this.root.querySelector('.node.located')?.classList.remove('located');
    this.root.querySelector(`[data-node="${id}"]`)?.classList.add('located');
    this.locateTimer = setTimeout(() => {
      this.located = null;
      this.root.querySelector('.node.located')?.classList.remove('located');
    }, 5000);
  }

  // A tap on a tunnel tells where it goes; moving is still a tap on the place.
  tapTunnel(key) {
    const [a, b] = key.split('|').map((id) => getLocation(id).name);
    const tunnel = networkEdgeList(this.state.config).find((e) => edgeKey(e.a, e.b) === key);
    this.onInfo(`Podziemne przejście: ${a} ↔ ${b} · ${travelLabelPl(tunnel.meta).cost}, bez opłat.`);
  }

  // BIKE V2: where the ride's card covers less of its route — 'top' when the route lies in the map's lower half, else 'bottom'
  rideSide(places) {
    const H = W / this.aspect;
    const ys = places.map((id) => this.pos(id).y);
    return ys.reduce((t, y) => t + y, 0) / Math.max(1, ys.length) > H / 2 ? 'top' : 'bottom';
  }

  // FLY ON THE MAP (rules.ux): the legal flight to this place while „Lot” is open, else null
  flyOf(id) {
    return this.fly?.flights.find((a) => a.to === id) ?? null;
  }

  // BIKE-1 (rules.bike): where a ride can take this player now — Map(end → the legal `ride` action)
  rideTargets() {
    const state = this.state;
    if (this.fly) return new Map(); // FLY ON THE MAP: the towns only
    const player = currentPlayer(state);
    const humanTurn = player.controller === 'human' && state.phase === 'turn' && this.interactive;
    return new Map(humanTurn && usesBike(state.config) ? getLegalActions(state).filter((a) => a.type === 'ride').map((a) => [a.to, a]) : []);
  }

  legalTargets() {
    const state = this.state;
    if (this.fly) return new Set(); // FLY ON THE MAP: the towns only
    const player = currentPlayer(state);
    const humanTurn = player.controller === 'human' && state.phase === 'turn' && this.interactive;
    return new Set(humanTurn ? getLegalActions(state).filter((a) => a.type === 'move').map((a) => a.to) : []);
  }

  // UX-2211: `track` — the places of the HUD player's tracked quest (main.js; a gold ring and 📌), none without the pilot
  // BIKE V2: `ride` — the previewed ride { from, path, stopAt } (main.js; its route lights up), none without one
  // FLY ON THE MAP: `fly` — { from, flights, to } while „Lot” is open (main.js; its towns glow green), none without the pilot
  render(state = this.state, { interactive = true, track = this.track ?? [], ride = this.ride ?? null, fly = this.fly ?? null } = {}) {
    this.state = state;
    this.interactive = interactive;
    this.track = track;
    this.ride = ride;
    this.fly = fly;
    if (!state) return;
    const H = W / this.aspect;
    this.svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
    this.image.setAttribute('height', H);
    const cfg = state.config;
    const ux = usesUx(cfg); // UX-2211
    this.root.classList.toggle('ux', ux);
    const tracked = new Set(ux ? this.track : []);
    const player = currentPlayer(state);
    const legal = this.legalTargets();
    const rides = this.rideTargets(); // BIKE-1
    const water = Boolean(player.capabilities?.canTravelWater);
    const enabled = topologyLocations(cfg).filter((l) => isLocationEnabled(l.id, cfg));
    const blocks = worldBlocks(state); // the one effective graph's closures
    const closed = new Set(blocks?.locations ?? []);
    const targets = new Set((player.quests ?? []).flatMap((q) => questLocations(q)));
    const rumours = new Set(rumourList(state, player).filter((r) => r.status === 'go').map((r) => r.start)); // PLAYTEST_006 C5: where a heard rumour is taken
    const field = fieldOfferPlaces(state, player); // NIGHTSHIFT_015 E2 (pilot): where a board card hangs in the field
    // PLAYTEST_019 PT019-01: where an HM / TM quest waits for this player (Route 16, the Safari Zone, Saffron) — seen before
    // anyone gets there; gone once taken
    // PLAYTEST_021 (rules.questHints): + the epic lines (⭐) — one mark a place: an HM / TM first, then a line to take now,
    // then one a badge away (dimmed)
    const rank = (h) => (h.epic ? (h.soon ? 2 : 1) : 0);
    const hmQuests = new Map();
    for (const h of fieldQuestHints(state, player)) if (!hmQuests.has(h.place) || rank(h) < rank(hmQuests.get(h.place))) hmQuests.set(h.place, h);

    // One graph: the game's travel network (canonical roads + its shortcuts).
    const edges = [];
    const tunnels = [];
    for (const { a: from, b: to, meta } of networkEdgeList(cfg)) {
      const a = this.pos(from);
      const b = this.pos(to);
      const active = (from === player.location && legal.has(to)) || (to === player.location && legal.has(from));
      if (meta.kind === 'underground') {
        tunnels.push(this.tunnel(from, to, meta, active));
        continue;
      }
      const isWater = meta.requires.includes('canTravelWater');
      const isSurf = meta.requires.includes('surf'); // SURF-0 lane (travelNetwork 'v3', DEC-05 12.11): open while this player can surf
      const shortcut = SHORTCUT_PLACES.has(from) || SHORTCUT_PLACES.has(to);
      const cls = ['edge', meta.traversal, isWater ? (water ? 'water-open' : 'water-locked') : '', isSurf ? `surf ${canSurf(player, cfg) ? 'water-open' : 'water-locked'}` : '', shortcut ? 'shortcut' : '', active ? 'active' : ''].filter(Boolean).join(' ');
      const curve = shortcut && SHORTCUT_CURVES[edgeKey(from, to)];
      const [p, q] = from < to ? [a, b] : [b, a];
      edges.push(curve ? `<path class="${cls}" d="${shortcutCurve(p, q, curve)}"/>` : `<line class="${cls}" x1="${a.x}" y1="${a.y}" x2="${b.x}" y2="${b.y}"/>`);
    }
    edges.push(...tunnels);
    const hit = ux ? this.hitUnits() : 44; // UX-2311: a tap area of TAP_PX (≥ 44 CSS px) on this screen, in the map's units
    const roadMarks = []; // UX-2311: what the mark columns keep clear of on the roads
    const roadHits = []; // … and the road marks' tap areas (never covered by a column's)
    // NIGHTSHIFT D (pilot): an incident's mark on its closed road (💤 / 🪨 / 🌧️) and by a swarm's places (🐝)
    // UX-2311 A4 / A5: with the pilot no emoji — a road blocked by a Pokémon shows its portrait (the sleeping Snorlax on
    // Route 11 ↔ 12, the ONE block), the other incidents a game icon; Lavender's Snorlax QUEST is a quest flag (its column)
    for (const inc of incidentsNow(state, rocketBlocks(state)).filter((i) => !i.held)) {
      const def = incidentDef(inc.id);
      const spots = def.kind === 'closeEdges' ? def.edges.map(([p1, p2]) => [this.pos(p1), this.pos(p2)]).map(([a, b]) => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }))
        : def.kind === 'swarm' ? def.places.map((id) => this.pos(id)).map((a) => ({ x: a.x + 16, y: a.y - 16 })) : [];
      spots.forEach((pt, k) => {
        if (!ux) return edges.push(`<g class="incident-mark" transform="translate(${pt.x} ${pt.y})"><circle r="12"/><text dy="5">${INCIDENT_PL[inc.id].icon}</text></g>`);
        roadMarks.push(boxAround(pt.x, pt.y, 15));
        roadHits.push(boxAround(pt.x, pt.y, hit / 2));
        edges.push(`<g class="incident-mark ux-incident" data-incident="${inc.id}" role="button" aria-label="${esc(INCIDENT_PL[inc.id].name)}" transform="translate(${pt.x} ${pt.y})"><title>${esc(INCIDENT_PL[inc.id].name)}</title><circle class="mark-hit" r="${Math.round(hit / 2)}"/>${incidentMarkSvg(inc.id, `${inc.id}-${k}`)}</g>`);
      });
    }

    // BIKE-1 (rules.bike): the Cycling Road downhill — arrows pointing DOWN the road (one way), always on the map of a bike game
    if (usesBike(cfg)) {
      for (const [p1, p2] of downhillLegs(cfg)) {
        const a = this.pos(p1);
        const b = this.pos(p2);
        const deg = (Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI;
        if (ux) roadMarks.push(boxAround((a.x + b.x) / 2, (a.y + b.y) / 2, 10));
        if (ux) roadHits.push(boxAround((a.x + b.x) / 2, (a.y + b.y) / 2, hit / 2));
        // UX-2311 pass 2: the arrows' tap area a finger wide (a circle under them; the arrows alone are a thin line)
        edges.push(`<g class="downhill-mark"${ux ? ' data-downhill="1" role="button" aria-label="Cycling Road — zjazd w dół"' : ''} transform="translate(${(a.x + b.x) / 2} ${(a.y + b.y) / 2}) rotate(${deg.toFixed(1)})">${ux ? `<circle class="mark-hit" r="${Math.round(hit / 2)}"/>` : ''}<path d="M-11,-7 L-3,0 L-11,7 M-1,-7 L7,0 L-1,7"/></g>`);
      }
    }
    const trailMid = new Set(usesBike(cfg) && hasBike(player, cfg) ? bikeSpec(cfg).trails.map((t) => t[1]) : []); // BIKE-1: 🚲 on a trail's route, once the player has the bike
    // BIKE V2: the previewed ride's route — a bright line from the pawn along every place to the end; 🎈 where Team Rocket stops it
    const rideWay = ride ? [ride.from, ...ride.path] : [];
    if (rideWay.length > 1) {
      const pts = rideWay.map((id) => { const p = this.pos(id); return `${p.x},${p.y}`; }).join(' ');
      edges.push(`<polyline class="ride-route-casing" points="${pts}"/><polyline class="ride-route" points="${pts}"/>`);
      if (ride.stopAt) {
        const p = this.pos(ride.stopAt);
        edges.push(`<g class="ride-stop-mark" transform="translate(${p.x - 22} ${p.y - 22})"><circle r="13"/>${ux ? mapIcon('rocket', 0, 0, 15) : '<text dy="5">🎈</text>'}</g>`); // UX-2311: no emoji
      }
    }
    if (fly?.to) edges.push(`<polyline class="ride-route-casing" points="${[fly.from, fly.to].map((id) => { const p = this.pos(id); return `${p.x},${p.y}`; }).join(' ')}"/><polyline class="ride-route fly-route" points="${[fly.from, fly.to].map((id) => { const p = this.pos(id); return `${p.x},${p.y}`; }).join(' ')}"/>`); // FLY ON THE MAP: the way through the air
    const rideOn = new Set(ride ? ride.path : []);
    const rideEnd = ride?.path.at(-1) ?? null;

    if (ux) {
      this.renderUx({ state, player, enabled, legal, rides, closed, blocks, targets, rumours, field, hmQuests, tracked, trailMid, rideOn, rideEnd, hit, roadMarks, roadHits });
      setHtml(this.root.querySelector('.b-edges'), edges.join(''));
      this.renderRocket(state);
      this.renderPawns(state, player, true);
      return;
    }
    const nodes = enabled.map((loc) => {
      const { x, y } = this.pos(loc.id);
      const big = loc.type === 'city' || loc.type === 'town';
      const r = big ? 13 : loc.type === 'special' ? 10 : 8;
      const cls = ['node', loc.type, legal.has(loc.id) ? 'legal' : '', !legal.has(loc.id) && rides.has(loc.id) ? 'legal ride' : '', rideOn.has(loc.id) ? 'ride-way' : '', loc.id === rideEnd ? 'ride-pick' : '', loc.id === player.location ? 'current' : '', closed.has(loc.id) ? 'closed' : '', loc.id === this.located ? 'located' : ''].filter(Boolean).join(' ');
      const shape = loc.type === 'special' ? `<rect class="shape" x="${-r}" y="${-r}" width="${2 * r}" height="${2 * r}" rx="3" transform="rotate(45)"/>` : `<circle class="shape" r="${r}"/>`;
      const halo = legal.has(loc.id) || rides.has(loc.id) ? `<circle class="halo" r="${r + 12}"/>` : '';
      const bushHere = bushAt(cfg, loc.id); // CUT-1: 🌳 until this player cuts it, then a stump 🪵 — top-left, clear of the „P”
      const bush = bushHere ? `<g class="bush-mark${cutDone(player).includes(bushHere.id) ? ' cut' : ''}" transform="translate(${-r - 6} ${-r - 8})"><circle class="mark-hit" r="18"/><circle r="10"/><text dy="4">${cutDone(player).includes(bushHere.id) ? '🪵' : '🌳'}</text></g>` : '';
      const flagR = occupiedAt(state, loc.id) ? `<g class="campaign-flag" transform="translate(${r + 4} ${r + 2})"><circle class="mark-hit" r="18"/><rect x="-11" y="-11" width="22" height="22" rx="5"/><text dy="5">R</text></g>` : ''; // ROCKET-2 R1.1: the city under Team Rocket — a red „R” flag
      const bike = rides.has(loc.id) && !legal.has(loc.id) ? `<g class="ride-mark" transform="translate(${r + 4} ${r + 4})"><circle r="10"/><text dy="4">🚲</text></g>` : trailMid.has(loc.id) ? `<g class="bike-mark" transform="translate(${r + 2} ${-r - 2})"><circle r="9"/><text dy="4">🚲</text></g>` : ''; // BIKE-1: a ride's end / a trail's route
      const ring = `<circle class="locate-ring" r="${r + 16}"/>`; // shown only while the place is located
      // NIGHTSHIFT_015 D / E (DEV pilots): a heal-only place wears a heart instead of the „P”
      const stop = hasPokeStop(loc.id, cfg) ? `<g class="stop-mark" transform="translate(${r + 2} ${-r - 2})"><circle r="9"/><text dy="4">P</text></g>` : healOnlySpot(loc.id, cfg) ? `<g class="stop-mark heal-only" transform="translate(${r + 2} ${-r - 2})"><circle r="9"/><text dy="4">♥</text></g>` : '';
      const gym = gymsEnabled(state) ? gymInCity(loc.id, state.config) : null; // NIGHTSHIFT 18.10: the game's gyms
      const gymMark = gym ? `<g class="gym-mark${hasBadge(player, gym.id) ? ' earned' : ''}${blocks?.gyms?.includes(gym.id) ? ' shut' : ''}"${ux && blocks?.gyms?.includes(gym.id) ? ' data-mark="gym"' : ''} transform="translate(${-r - 4} ${r + 3})"><circle r="11"/>${mapIcon(`type.${gym.type}`, 0, 0, 14)}</g>` : '';
      const league = gymsEnabled(state) && hasFeature(loc.id, 'league') ? `<g class="league-mark">${mapIcon('league', -r - 10, r + 6, 14)}</g>` : '';
      const flag = targets.has(loc.id) ? `<g class="target-mark"${ux ? ' data-mark="target"' : ''}>${mapIcon('target', r - 2, r + 10, 14)}</g>` : '';
      const rumour = rumours.has(loc.id) ? `<g class="rumour-mark"${ux ? ' data-mark="rumour"' : ''} transform="translate(${-r - 8} ${-r - 6})"><circle r="12"/>${mapIcon('missions', 0, 0, 16)}</g>` : ''; // top-left: clear of the Poké Stop „P”
      // E2: 📋 a field card to take here — on the left of the place, where no pawn ever stands (the pawns fan out above,
      // right and below); no counter on the map (kid-simple): a tap says how many
      const fieldAt = field.get(loc.id);
      const fieldMark = fieldAt ? `<g class="field-mark" transform="translate(${-r - 25} 0)"><circle class="mark-hit" r="22"/><circle r="12"/><text dy="5">📋</text></g>` : ''; // PT017-03: a finger-size hit area
      // M02-2: a place this player has searched — 1 footprint tired, 2 exhausted (no numbers).
      // On the left of the place: clear of the pawns (above it), the gym mark and the name (below).
      const hmAt = hmQuests.get(loc.id);
      const hmMark = hmAt ? `<g class="hm-mark${hmAt.epic ? ' epic' : ''}${hmAt.soon ? ' soon' : ''}" transform="translate(${-r - 25 - (fieldAt ? 36 : 0)} 0)"><circle class="mark-hit" r="22"/><circle r="12"/><text dy="5">${hmAt.icon}</text></g>` : ''; // left, beside a 📋
      const lvl = placeFatigue(player, loc.id, cfg);
      const tired = lvl ? `<g class="tired-mark lvl-${lvl}" transform="translate(${-r - 15 - 36 * ((fieldAt ? 1 : 0) + (hmAt ? 1 : 0))} 0)"><rect x="${-10 - (lvl - 1) * 16}" y="-10" width="${20 + (lvl - 1) * 16}" height="20" rx="10"/>${lvl === 1 ? mapIcon('fatigue', 0, 0, 14) : mapIcon('fatigue', -16, 0, 14) + mapIcon('fatigue', 0, 0, 14)}</g>` : '';
      // DQ-96: a merged place is one marker with both names, on two lines. The
      // line offsets are in em so a bigger name (Ustawienia → Mapa) moves down
      // with its size (at the default size: 20 below the marker, 15 between lines).
      // Any other route has its name too, shown only when the settings ask for it.
      const label = loc.subtitle
        ? `<text class="label merged" y="${r}" dy="1.54em">${esc(loc.name)}<tspan class="sub" x="0" dy="1.364em">${esc(loc.subtitle)}</tspan></text>`
        : big || loc.type === 'special' ? `<text class="label${big ? ' big' : ''}" y="${r}" dy="${big ? '1.333em' : '1.54em'}">${esc(loc.name)}</text>`
          : `<text class="label plain" y="${r}" dy="1.54em">${esc(loc.name)}</text>`;
      // 3A-5: a cross-map shortcut place says so (Diglett's Cave).
      const shortcut = SHORTCUT_PLACES.has(loc.id) ? `<g class="shortcut-mark" transform="translate(0 ${-r - 14})">${mapIcon('travel.shortcut', -30, 0, 14)}<text x="-20" dy="4">SKRÓT</text></g>` : '';
      // UX-2211: the tracked quest's place — a gold ring round it and 📌 above (a tap: what is tracked)
      const trackMark = tracked.has(loc.id) ? `<circle class="track-ring" r="${r + 9}"/><g class="track-mark" data-mark="track" transform="translate(0 ${-r - 17})"><circle class="mark-hit" r="16"/><circle r="10"/><text dy="4">📌</text></g>` : '';
      return `<g class="${cls}${tracked.has(loc.id) ? ' tracked' : ''}" data-node="${loc.id}" transform="translate(${x} ${y})"><circle class="hit" r="26"/>${ring}${halo}${trackMark}${shape}${stop}${gymMark}${league}${flag}${rumour}${fieldMark}${hmMark}${tired}${bike}${bush}${flagR}${label}${shortcut}</g>`;
    });
    // Build 3.2 hotfix: the roads are written only when they changed, the places one by one
    // (patch.js) — a walking pawn no longer rebuilds the whole board.
    setHtml(this.root.querySelector('.b-edges'), edges.join(''));
    patchKeyed(this.root.querySelector('.b-nodes'), nodes.map((html, i) => ({ key: enabled[i].id, html })), 'data-node', svgBox);
    setHtml(this.root.querySelector('.b-marks'), '');
    this.renderRocket(state);
    this.renderPawns(state, player);
  }

  // UX-2311 · MAP: the map's REAL scale on this screen — CSS px per map unit (the SVG keeps the board's aspect, `meet`): the
  // viewport, the board's size; every tap area is decided from it (pass 2: ≥ 44 CSS px, never in theory only)
  unitPx() {
    const box = this.svg.getBoundingClientRect?.();
    const H = W / this.aspect;
    const u = box && box.width ? Math.min(box.width / W, box.height / H) : 1;
    return Math.round((u || 1) * 1000) / 1000;
  }
  hitUnits() {
    return Math.min(80, TAP_PX / this.unitPx()); // TAP_PX on the screen
  }
  // the names' size (Ustawienia → Mapa: CSS variables on the board, every route's name)
  mapPrefs() {
    const v = (name) => Number.parseFloat(this.root.style.getPropertyValue(name)) || 1;
    return { city: v('--map-city-names'), route: v('--map-route-names'), allRouteNames: this.root.classList.contains('route-names') };
  }
  // A place's name box (relative to the place): measured on the board (getBBox, cached per name size), else estimated
  // (mapMarks.labelBox) — a hidden route name (Ustawienia → Mapa) is none.
  labelBoxOf(loc, prefs) {
    const est = labelBox(loc, prefs);
    if (!est) return null;
    const key = `${loc.id}|${prefs.city}|${prefs.route}|${this.fontsReady ? 1 : 0}`;
    this.labelCache ??= new Map();
    if (this.labelCache.has(key)) return this.labelCache.get(key);
    let box = est;
    try {
      const bb = this.root.querySelector(`.b-nodes [data-node="${loc.id}"] .label`)?.getBBox?.();
      if (bb && bb.width > 0) box = { x0: bb.x - 2, x1: bb.x + bb.width + 2, y0: bb.y - 1, y1: bb.y + bb.height + 1 };
    } catch { /* not laid out yet: the estimate */ }
    if (box !== est || this.fontsReady) this.labelCache.set(key, box);
    return box;
  }
  uxLayoutKey() {
    const p = this.mapPrefs();
    return `${p.city}|${p.route}|${p.allRouteNames}|${this.unitPx()}`;
  }

  // UX-2311 · MAP pass 3 (PT024 live, „map first”): each place ONE disc at most (the most important mark for this player, „+N”
  // when there is more — its tap: the place card), the Poké Stop's „P” on the place itself, no disc for a ride's end or a trail.
  // UX-2311 · MAP (rules.ux; ChatGPT 23.11 A4 / A5, owner points 4, 6, 7, 9, 10, 11): the places as before, their marks in ONE
  // column on the left (mapMarks.js: the order, the spacing, the collisions) in their own layer above every place (a mark is
  // never under a neighbour's tap area); a column carries its place's id, so every tap of a mark works as before.
  renderUx(c) {
    const { state, player, enabled, legal, rides, closed, blocks, targets, rumours, field, hmQuests, tracked, trailMid, rideOn, rideEnd, hit } = c;
    const cfg = state.config;
    const prefs = this.mapPrefs();
    this.layoutKey = this.uxLayoutKey();
    const legends = legendPlaces(state, player);
    const H = W / this.aspect;
    const places = [];
    const labels = [];
    const groups = new Map(); // pass 3: a place's marks behind its one disc (the place card)
    const stopBoxes = []; // the „P”s: no tap area covers them (a tap there is the place's)
    // the tunnels' icons (Underground Paths) are on the roads too
    const tunnelMarks = networkEdgeList(cfg).filter((e) => e.meta.kind === 'underground').map((e) => {
      const t = TUNNELS[edgeKey(e.a, e.b)] ?? { bend: 0.2, at: 0.5 };
      const m = tunnelCurve(this.pos(e.a), this.pos(e.b), t.bend).at(t.at);
      return boxAround(m.x, m.y, 14);
    });
    const obstacles = [...c.roadMarks, ...tunnelMarks];
    const nodes = enabled.map((loc) => {
      const { x, y } = this.pos(loc.id);
      const big = loc.type === 'city' || loc.type === 'town';
      const r = big ? 13 : loc.type === 'special' ? 10 : 8;
      const edge = nodeEdge(loc.type);
      const cls = ['node', loc.type, legal.has(loc.id) ? 'legal' : '', !legal.has(loc.id) && rides.has(loc.id) ? 'legal ride' : '', rideOn.has(loc.id) ? 'ride-way' : '', loc.id === rideEnd ? 'ride-pick' : '', this.flyOf(loc.id) ? 'fly-to' : '', this.fly?.to === loc.id ? 'fly-pick' : '', loc.id === player.location ? 'current' : '', closed.has(loc.id) ? 'closed' : '', loc.id === this.located ? 'located' : ''].filter(Boolean).join(' ');
      const shape = loc.type === 'special' ? `<rect class="shape" x="${-r}" y="${-r}" width="${2 * r}" height="${2 * r}" rx="3" transform="rotate(45)"/>` : `<circle class="shape" r="${r}"/>`;
      const halo = legal.has(loc.id) || rides.has(loc.id) || this.flyOf(loc.id) ? `<circle class="halo" r="${r + 12}"/>` : '';
      const ring = `<circle class="locate-ring" r="${r + 16}"/>`;
      const label = loc.subtitle
        ? `<text class="label merged" y="${r}" dy="1.54em">${esc(loc.name)}<tspan class="sub" x="0" dy="1.364em">${esc(loc.subtitle)}</tspan></text>`
        : big || loc.type === 'special' ? `<text class="label${big ? ' big' : ''}" y="${r}" dy="${big ? '1.333em' : '1.54em'}">${esc(loc.name)}</text>`
          : `<text class="label plain" y="${r}" dy="1.54em">${esc(loc.name)}</text>`;
      const shortcut = SHORTCUT_PLACES.has(loc.id) ? `<g class="shortcut-mark" transform="translate(0 ${-r - 14})">${mapIcon('travel.shortcut', -30, 0, 14)}<text x="-20" dy="4">SKRÓT</text></g>` : '';
      const trackRing = tracked.has(loc.id) ? `<circle class="track-ring" r="${r + 9}"/>` : '';
      // what the columns keep clear of: this place, its name, the SKRÓT tag
      obstacles.push({ ...boxAround(x, y, edge + 3), w: 3 }); // a mark over another place is the worst
      labels.push({ loc, x, y });
      if (shortcut) obstacles.push({ x0: x - 38, x1: x + 22, y0: y - r - 23, y1: y - r - 8 });
      // pass 3 (PT024 live: map first): ONE disc a place — the most important mark for this player now (+N: the place card)
      const all = this.uxMarks(loc, { state, player, cfg, legal, rides, blocks, targets, rumours, field, hmQuests, tracked, trailMid, legends });
      const pd = placeDisc(all, loc.name);
      if (pd.count > 1) groups.set(loc.id, pd.list);
      places.push({ id: loc.id, x, y, edge, marks: pd.disc ? [pd.disc] : [] });
      // the Poké Stop's „P” is the place's own symbol (top-left; no tap of its own — the place moves); its words: the place card
      const stopMark = all.find((m) => m.kind === 'stop');
      const p = stopMark ? nodeStopSvg(loc.type, stopMark.cls.includes('heal-only')) : null;
      if (p) {
        obstacles.push({ x0: x + p.box.x0, x1: x + p.box.x1, y0: y + p.box.y0, y1: y + p.box.y1, w: 3 });
        stopBoxes.push({ x0: x + p.box.x0, x1: x + p.box.x1, y0: y + p.box.y0, y1: y + p.box.y1 });
      }
      return `<g class="${cls}${tracked.has(loc.id) ? ' tracked' : ''}" data-node="${loc.id}" transform="translate(${x} ${y})"><circle class="hit" r="26"/>${ring}${halo}${trackRing}${shape}${p ? p.svg : ''}${label}${shortcut}</g>`;
    });
    // the pawns (on the right / top of their place) and Team Rocket's balloon
    const byLoc = {};
    for (const p of state.players) (byLoc[p.location] ??= []).push(p);
    for (const [id, ps] of Object.entries(byLoc)) {
      const at = this.pos(id);
      ps.forEach((p, i) => { const s = pawnSpot(i); obstacles.push({ ...boxAround(at.x + s.x, at.y + s.y, 17), w: 2 }); });
    }
    const plot = activePlot(state);
    if (plot) { const at = this.pos(plot.location); obstacles.push({ x0: at.x + 8, x1: at.x + 36, y0: at.y - 58, y1: at.y - 12 }); }
    // the places first: their names are measured as drawn (the font, the size setting), estimated where they cannot be
    patchKeyed(this.root.querySelector('.b-nodes'), nodes.map((html, i) => ({ key: enabled[i].id, html })), 'data-node', svgBox);
    for (const { loc, x, y } of labels) {
      const lb = this.labelBoxOf(loc, prefs);
      if (lb) obstacles.push({ x0: x + lb.x0, x1: x + lb.x1, y0: y + lb.y0, y1: y + lb.y1 });
    }
    const u = this.unitPx();
    const step = stepFor(hit);
    const lay = layoutColumns(places, obstacles, { W, H, hit, step, need: MIN_PX / u, blockers: [...c.roadHits, ...stopBoxes] });
    this.lastLayout = lay;
    // UX-2311 pass 2: a crowded place (its marks' taps would not all keep 44 px here) shows ONE marker — the place card
    // (pass 3: every place has one disc at most, so this stays for a disc whose tap could not fit — none on the family's board)
    this.groups = groups;
    const byId = new Map(places.map((p) => [p.id, p]));
    const cols = [...lay.keys()].map((id) => {
      const p = byId.get(id);
      const l = lay.get(id);
      if (l.group) this.groups.set(id, p.marks);
      const marks = l.group ? [this.placeChip(loc0(id), p.marks)] : p.marks;
      return { key: id, html: columnSvg(p, marks, l) };
    }); // in the layout's order: a later column is drawn above
    patchKeyed(this.root.querySelector('.b-marks'), cols, 'data-node', svgBox);
  }

  // UX-2311 pass 2 — the place card's marker: a small pile of discs, the place's most important mark in front (the first in
  // the column's order), a „…” dot; its tap area a finger wide (laid out like any mark). No count (kid-simple).
  placeChip(loc, marks) {
    const R = MARK.R;
    const front = marks[0];
    const back = marks.length > 2 ? [[-10, -8], [-5, -4]] : [[-6, -5]];
    const aria = `Znaki: ${loc.name} — dotknij, a zobaczysz listę`;
    return {
      ...chipGeometry(marks), cls: 'place-chip', attrs: ' data-mark="place"', aria,
      body: `${back.map(([x, y]) => `<circle class="chip-back" cx="${x}" cy="${y}" r="${R}"/>`).join('')}<g class="${front.cls}">${front.body}</g><circle class="chip-more" cx="-10" cy="9" r="7"/>${mapIcon('more', -10, 9, 12)}`,
    };
  }
  // the place card itself (mapInfo.placeListCard): every mark of a crowded place, one row each
  placeCard(id) {
    return placeListCard(this.state, id, this.groups?.get(id) ?? []);
  }

  // UX-2311 · MAP: a place's marks, in the column's order (mapMarks.js MARK_ORDER) — no emoji: game icons, the badge, portraits.
  uxMarks(loc, { state, player, cfg, legal, rides, blocks, targets, rumours, field, hmQuests, tracked, trailMid, legends }) {
    const id = loc.id;
    const marks = [];
    const add = (m) => marks.push(m);
    const R = MARK.R;
    // rocket — the city under Team Rocket (its tap: the campaign's words, as before)
    // (each mark: `aria` its button's name, `label` / `icon` its row on the place card)
    if (occupiedAt(state, id)) add({ kind: 'rocket', cls: 'campaign-flag', attrs: ' data-mark="rocket"', tap: true, aria: 'Team Rocket rządzi tym miastem', icon: { letter: 'R', cls: 'rocket' }, body: `<rect x="${-R + 1}" y="${-R + 1}" width="${2 * R - 2}" height="${2 * R - 2}" rx="5"/><text dy="5">R</text>` });
    // gym — the badge: earned in colour, not yet grey; shut by an incident / Team Rocket keeps its look and its card
    const gym = gymsEnabled(state) ? gymInCity(id, cfg) : null;
    if (gym) {
      const earned = hasBadge(player, gym.id);
      const shut = Boolean(blocks?.gyms?.includes(gym.id));
      add({ kind: 'gym', prio: earned ? 'gym-earned' : 'gym-new', cls: `gym-mark badge${earned ? ' earned' : ''}${shut ? ' shut' : ''}`, attrs: ' data-mark="gym"', tap: true, aria: `${gym.badge}${earned ? ' — masz ją' : ''}`, label: `Sala — ${gym.badge}${earned ? ' (masz ją)' : ''}${shut ? ' — zamknięta' : ''}`, icon: { badge: gym.id, earned, type: gym.type }, body: badgeMarkSvg(gym, { earned }) });
    }
    // stop — the „P” (a heal-only place: a heart) and its „?” on the left: a tap on the „?” says what it is and what it costs
    const heal = hasPokeStop(id, cfg) ? null : healOnlySpot(id, cfg);
    if (hasPokeStop(id, cfg) || heal) {
      const help = `<circle class="help-dot" cx="-20" r="8.5"/>${mapIcon('help', -20, 0, 17)}`;
      add({
        kind: 'stop', cls: `stop-mark${heal ? ' heal-only' : ''}`, tap: true, left: 2.6, hitAt: -20,
        aria: heal ? 'Leczenie — co to jest?' : 'Poké Stop — co to jest?', icon: heal ? { key: 'hp', cls: 'stop' } : { letter: 'P', cls: 'stop' },
        wrapHit: (rect, scale) => `<g class="stop-help" data-mark="stop" role="button" aria-label="${heal ? 'Leczenie — co to jest?' : 'Poké Stop — co to jest?'}">${rect}${scale === 1 ? help : `<g transform="scale(${scale})">${help}</g>`}</g>`,
        body: `<circle class="stop-disc" r="9.5"/>${heal ? mapIcon('hp', 0, 0, 12) : '<text dy="4">P</text>'}`,
      });
    }
    // quest — a quest to take here (HM / TM / bike / Cut, an epic line, a city to free, the Snorlax quest's flag)
    const h = hmQuests.get(id);
    if (h) add({ kind: 'quest', prio: h.soon || h.full ? 'quest-later' : 'quest', cls: `hm-mark${h.epic ? ' epic' : ''}${h.soon ? ' soon' : ''}${h.iconKey === 'quest.field' ? ' world-quest' : ''}`, attrs: ' data-mark="quest"', tap: true, aria: `Misja: ${h.title}`, icon: { key: h.iconKey ?? 'quest.field' }, body: discSvg(h.iconKey ?? 'quest.field') });
    // legend (UX-2311 pass 2: the two never look alike) — where its QUEST STARTS: a gold quest disc with a small portrait and a
    // quest flag tag (its card: „Tu zaczyna się misja …”); where the legend WAITS (the encounter, a step of a line held): the
    // whole portrait in a gold ring with a star; a road BLOCK (Snorlax) is a portrait in a red ring on the road itself
    const lg = legends.get(id);
    if (lg?.kind === 'take') {
      const title = QUESTBOOK_PL[lg.quest.id]?.title ?? QUESTBOOK_PL[lg.quest.replaces]?.title ?? lg.name;
      add({ kind: 'legend', prio: 'legend-take', cls: 'legend-mark take', attrs: ' data-mark="legend"', tap: true, aria: `Misja do legendy: ${title}`, label: `Misja: ${title} (legenda ${lg.name})`, icon: { art: lg.species, tag: true }, body: `<circle class="disc quest-disc" r="${R}"/>${portraitSvg(lg.species, { r: 7, id: `lg-${id}`, icon: 'star' })}<circle class="tag-dot" cx="7.5" cy="7.5" r="5.5"/>${mapIcon('quest.field', 7.5, 7.5, 8)}` });
    } else if (lg) add({ kind: 'legend', prio: 'legend-meet', cls: 'legend-mark meet', attrs: ' data-mark="legend"', tap: true, aria: `Legenda: ${lg.name}`, icon: { art: lg.species }, body: `<circle class="meet-glow" r="${R + 2.5}"/>${portraitSvg(lg.species, { r: R, id: `lg-${id}`, icon: 'star' })}<circle class="tag-dot star" cx="8" cy="-8" r="5.5"/>${mapIcon('star', 8, -8, 8)}` });
    // field — a board card in the field
    if (field.get(id)) add({ kind: 'field', cls: 'field-mark', attrs: ' data-mark="field"', tap: true, aria: 'Zlecenie do wzięcia', icon: { key: 'quest.offer' }, body: discSvg('quest.offer') });
    // track / target — the tracked quest's place (the gold ring stays round the place), a mission card's target
    if (tracked.has(id)) add({ kind: 'track', cls: 'track-mark', attrs: ' data-mark="track"', tap: true, aria: 'Śledzona misja', icon: { key: 'track' }, body: discSvg('track') });
    if (targets.has(id)) add({ kind: 'target', cls: 'target-mark', attrs: ' data-mark="target"', tap: true, aria: 'Cel karty misji', icon: { key: 'target' }, body: discSvg('target') });
    // rumour — where a heard rumour is taken
    if (rumours.has(id)) add({ kind: 'rumour', cls: 'rumour-mark', attrs: ' data-mark="rumour"', tap: true, aria: 'Plotka', icon: { key: 'rumour' }, body: discSvg('rumour') });
    // bush — to cut, or the stump (its card never names what hides behind it)
    const bush = bushAt(cfg, id);
    if (bush) {
      const cut = cutDone(player).includes(bush.id);
      add({ kind: 'bush', prio: cut ? 'stump' : 'bush', cls: `bush-mark${cut ? ' cut' : ''}`, attrs: ' data-mark="bush"', tap: true, aria: cut ? 'Ścięty krzaczek' : 'Krzaczek do ścięcia', icon: { key: cut ? 'stump' : 'bush' }, body: discSvg(cut ? 'stump' : 'bush') });
    }
    // bike — a ride's end (the place glows; its tap is the place's) / a trail's route (its words)
    if (rides.has(id) && !legal.has(id)) add({ kind: 'ride', cls: 'ride-mark', tap: false, label: 'Rower: tu dojedziesz — pokaż przejazd', icon: { key: 'bike' }, body: discSvg('bike', { size: 13 }) });
    else if (trailMid.has(id)) add({ kind: 'bike', cls: 'bike-mark', attrs: ' data-mark="bike"', tap: true, aria: 'Szlak rowerowy', icon: { key: 'bike' }, body: discSvg('bike', { size: 13 }) });
    // fatigue — 1 footprint tired, 2 exhausted (no numbers)
    const lvl = placeFatigue(player, id, cfg);
    if (lvl) add({ kind: 'fatigue', cls: `tired-mark lvl-${lvl}`, tap: false, label: lvl === 1 ? 'Przeszukane miejsce — Pokémony już cię znają' : 'Bardzo przeszukane miejsce — ruszaj dalej', icon: { key: 'fatigue' }, left: lvl === 1 ? 1 : 2.45, body: `<rect x="${lvl === 1 ? -R : -R - 16}" y="${-R + 1}" width="${lvl === 1 ? 2 * R : 2 * R + 16}" height="${2 * R - 2}" rx="${R - 1}"/>${lvl === 1 ? mapIcon('fatigue', 0, 0, 14) : mapIcon('fatigue', -16, 0, 14) + mapIcon('fatigue', 0, 0, 14)}` });
    // league — the trophy
    if (gymsEnabled(state) && hasFeature(id, 'league')) add({ kind: 'league', cls: 'league-mark', tap: false, label: 'Liga Pokémon', icon: { key: 'league' }, body: discSvg('league') });
    return marks;
  }

  // An Underground Path: a dashed tunnel with its icon; while it is a move
  // choice it glows and says what it is and where it goes.
  tunnel(from, to, meta, active) {
    const key = edgeKey(from, to);
    const shape = TUNNELS[key] ?? { bend: 0.2, at: 0.5 };
    const { d, at, out } = tunnelCurve(this.pos(from), this.pos(to), shape.bend);
    const mark = at(shape.at);
    const label = travelLabelPl(meta);
    let tag = '';
    if (active) {
      const dest = getLocation(currentPlayer(this.state).location === from ? to : from).name;
      const anchor = out.x > 0.4 ? 'start' : out.x < -0.4 ? 'end' : 'middle';
      const tx = mark.x + out.x * 22;
      const ty = mark.y + out.y * 22 + (anchor === 'middle' && out.y < 0 ? -14 : 0);
      tag = `<text class="tunnel-tag" text-anchor="${anchor}" x="${tx}" y="${ty}"><tspan x="${tx}">${esc(label.title)}</tspan><tspan class="sub" x="${tx}" dy="15">→ ${esc(dest)} · ${esc(label.cost)}</tspan></text>`;
    }
    return `<g class="tunnel${active ? ' active' : ''}" data-tunnel="${key}"><title>${esc(label.text)}</title><path class="tunnel-casing" d="${d}"/><path class="tunnel-line" d="${d}"/>`
      + `<g class="tunnel-mark" transform="translate(${mark.x} ${mark.y})"><circle r="13"/>${mapIcon('travel.underground', 0, 0, 16)}</g>${tag}</g>`;
  }

  // The balloon persists between renders so a roaming plot visibly drifts;
  // a roaming card also shows the rest of its route.
  renderRocket(state) {
    const layer = this.root.querySelector('.b-rocket');
    const plot = activePlot(state);
    let route = layer.querySelector('.rocket-route');
    let balloon = layer.querySelector('.rocket-mark');
    if (!plot) {
      layer.innerHTML = '';
      return;
    }
    const steps = plotCard(plot).movement?.route.slice(plot.step) ?? [];
    if (!route) {
      route = document.createElementNS('http://www.w3.org/2000/svg', 'polyline');
      route.classList.add('rocket-route');
      layer.append(route);
    }
    route.setAttribute('points', steps.length > 1 ? steps.map((id) => { const p = this.pos(id); return `${p.x},${p.y}`; }).join(' ') : '');
    const { x, y } = this.pos(plot.location);
    if (!balloon || balloon.dataset.plot !== plot.plotId) {
      balloon?.remove();
      balloon = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      balloon.classList.add('rocket-mark');
      balloon.dataset.plot = plot.plotId;
      balloon.innerHTML = '<g class="balloon-body"><path class="balloon-string" d="M0 1q-4 6 0 12"/><ellipse class="balloon" cx="0" cy="-15" rx="14" ry="16"/><circle cx="0" cy="-16" r="9"/><text class="r" y="-11">R</text></g>';
      balloon.style.transform = `translate(${x + 22}px, ${y - 26}px)`;
      layer.append(balloon);
    }
    balloon.style.transform = `translate(${x + 22}px, ${y - 26}px)`;
  }

  // Pawns persist between renders so a move glides (CSS transition).
  renderPawns(state, player, ux = false) {
    const layer = this.root.querySelector('.b-pawns');
    const byLoc = {};
    for (const p of state.players) (byLoc[p.location] ??= []).push(p);
    const seen = new Set();
    for (const [locId, ps] of Object.entries(byLoc)) {
      const { x, y } = this.pos(locId);
      ps.forEach((p, i) => {
        const angle = ((-120 + i * 80) * Math.PI) / 180;
        // 25: the portrait pawns (r 15 + edge) side by side without overlapping
        // UX-2311 · MAP: with the pilot the pawns stand on the right / top — the left side is the mark column's
        const spot = ux ? pawnSpot(i) : { x: Math.cos(angle) * 25, y: Math.sin(angle) * 25 };
        const tx = x + spot.x;
        const ty = y + spot.y;
        let g = layer.querySelector(`[data-pawn="${p.id}"]`);
        if (!g) {
          g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
          g.dataset.pawn = p.id;
          // the character's portrait token (tokens.js), the initial on the colour without one
          g.innerHTML = `<g class="pawn-body"><ellipse class="pawn-shadow" cx="0" cy="15" rx="12" ry="4"/>${pawnSvg(p)}</g>`;
          g.style.transform = `translate(${tx}px, ${ty}px)`;
          layer.append(g);
        }
        g.classList.toggle('active', p.id === player.id);
        g.style.transform = `translate(${tx}px, ${ty}px)`;
        seen.add(p.id);
      });
    }
    for (const g of [...layer.children]) if (!seen.has(g.dataset.pawn)) g.remove();
  }
}

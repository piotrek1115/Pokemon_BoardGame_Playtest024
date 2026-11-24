// UX-2311 · MAP (PLAYTEST_023 → ChatGPT 23.11 A4 / A5, owner points 4, 6, 7, 9, 10, 11; rules.ux 'u1' — a DEV pilot of the
// table): the marks of a place drawn as ONE vertical COLUMN on the place's LEFT, in a fixed order, with no emoji — the game's
// icons (icons.js), the badge pictures (badgeArt.js) and round Pokémon portraits from the game's own local art (cardArt.js).
// Presentation only: the engine never imports it, nothing of it is saved. Without the pilot the board keeps its old marks
// (board.js) — this module is not used.
//
// PASS 3 (PT024 live playtest, ChatGPT 23.11 21:14 (4) — „map first”): a place now shows AT MOST ONE disc (placeDisc — the
// priority MARK_PRIORITY below, a „+N” pip, the place card), the Poké Stop's „P” is drawn on the place (nodeStopSvg), a ride's
// end / a trail only by its halo. The column machinery below still lays out that one disc (its spot, its 44 px tap area).
// THE COLUMN (documented order, from the place OUTWARD — the bottom row sits beside the place, the next rows above it):
//   rocket  the city under Team Rocket („R”) — the place's state: what works there changes, so it sits right by the place
//   gym     the gym's badge (earned: in colour; not yet: grey) — a city's identity
//   stop    the Poké Stop „P” (a heal-only place: ♥) with its „?” on the left (a tap: what a Poké Stop is, what it costs now)
//   quest   a quest to take here (HM / TM / bike / Cut, an epic line ⭐, a city to free, the Snorlax quest's flag)
//   legend  a legend's line or encounter here — that legend's portrait
//   field   a board card in the field (📋)
//   track   the tracked quest's place (📌; the gold ring round the place stays)
//   target  a mission card's target (🎯)
//   rumour  where a heard rumour is taken
//   bush    a bush to cut / the stump
//   bike    a bike trail's route / a ride's end
//   fatigue a searched place (footprints)
//   league  the League (trophy)
// The pawns stand on the place's right and top (UX_PAWN_ANGLES) — the column's side stays theirs alone.
//
// SPACING: a mark is a disc of radius MARK.R (SVG units of the 1000-wide board), rows a finger apart (44 px on this screen,
// stepFor: MARK.STEP … MARK.STEP_MAX units — so on an iPad in landscape every row's tap area is 44 px tall), MARK.GAP from the
// place's edge; the bottom row's centre is level with the place's lower half, so the column never reaches the place's own
// name (drawn below it at every name size).
// COLLISIONS (layoutColumns): every place's column tries, in order, one column → pushed further left → two columns → centred
// → the same at 85 % and 72 % size; each try is scored by how much it covers other places, their names, the pawns, the marks
// on the roads, columns already laid out and the map's edge — the first try that covers nothing wins, else the least bad.
// Places with more marks are laid out first. The map's size (it scales with the screen) and Ustawienia → Mapa (name sizes,
// every route's name) are inputs: the names' boxes grow with them.
// TAPS (UX-2311 pass 2, ChatGPT review 23.11 P0): every tap area of a mark is ≥ 44 × 44 CSS px ON THIS SCREEN — measured
// from the board's real scale (CSS px per map unit: the viewport, the board's size); rows of a column tile it, never
// overlapping each other, another column's tap area, another place's disc or a road mark's tap area (cut back where they
// would). THE PLACE CARD („karta miejsca”): when a place's marks cannot ALL keep a 44 × 44 px tap area there (a crowded spot,
// a small screen — e.g. iPad portrait), its column becomes ONE marker — a small pile of discs with the most important mark
// in front — with its own ≥ 44 × 44 px tap area; a tap opens a compact list card of every mark of the place (each row ≥ 44 px,
// opening that mark's own card). Where there is room the marks stay single. THE CROWDING RULE (layoutColumns): a place's
// single marks are kept when some spot gives EVERY one of its tap areas ≥ MIN_PX × MIN_PX CSS px (cut back as above) and
// covers nothing; otherwise the place card's marker is tried (one tap area) and taken when it fits (or fits better). Decided
// per screen: the board passes its real scale (CSS px per unit — board.js unitPx), so a crowded spot on iPad portrait is a
// place card while the same spot on a laptop may keep its marks. A place that still misses goes first in a second pass.
import { esc } from '../ui/dom.js';
import { gi } from './icons.js';
import { CARD_ART } from './cardArt.js';
import { ART, ownArtUrl } from './art.js';
import { BADGE_ART, BADGE_ART_DIR } from './badgeArt.js';

export const MARK = Object.freeze({ R: 11, STEP: 26, STEP_MAX: 40, GAP: 4 });
// A finger: 44 CSS px. Tap areas are made TAP_PX (a little margin for the screen's rounding); a place whose marks would get
// less than MIN_PX becomes a place card.
export const TAP_PX = 46;
export const MIN_PX = 44.5;
// The rows' spacing on this screen: a row as tall as a finger where the map is big enough, within STEP … STEP_MAX units.
// `tapUnits`: TAP_PX in map units on this screen.
export const stepFor = (tapUnits) => Math.min(MARK.STEP_MAX, Math.max(MARK.STEP, tapUnits));
export const MARK_ORDER = Object.freeze(['rocket', 'gym', 'stop', 'quest', 'legend', 'field', 'track', 'target', 'rumour', 'bush', 'bike', 'ride', 'fatigue', 'league']);
// The pawns' places round a place under the pilot (degrees; 0 = right, -90 = up): top, right, lower right, lower left.
export const UX_PAWN_ANGLES = Object.freeze([-60, 0, 60, 120]); // pass 3: clear of the node's „P” (top-left) too
export const PAWN_RING = 25;

// A game icon placed in the map's SVG, centred on (x, y).
export const mapIcon = (key, x, y, size) => gi(key, { size }).replace('<svg ', `<svg x="${x - size / 2}" y="${y - size / 2}" `);
const r1 = (v) => Math.round(v * 10) / 10;
const r2 = (v) => Math.round(v * 100) / 100;

// The half-size of a place's marker (its disc, or the diamond of a special place) — what a column keeps clear of.
export const nodeEdge = (type) => (type === 'city' || type === 'town' ? 13 : type === 'special' ? 14.2 : 8);
export const nodeRadius = (type) => (type === 'city' || type === 'town' ? 13 : type === 'special' ? 10 : 8);

// The box of a place's name (relative to the place), as table.css draws it — or null when it is not shown.
// prefs: { city, route } the name sizes (Ustawienia → Mapa, 1 = 100 %), allRouteNames.
export function labelBox(loc, prefs = {}) {
  const city = prefs.city ?? 1;
  const route = prefs.route ?? 1;
  const big = loc.type === 'city' || loc.type === 'town';
  const r = nodeRadius(loc.type);
  const isRoute = loc.type === 'route';
  if (!loc.subtitle && !big && loc.type !== 'special' && !prefs.allRouteNames) return null;
  const f = big ? 15 * city : 13 * (isRoute ? route : city);
  const base = r + (big ? 1.333 : 1.54) * f;
  const w = (text, size) => 0.56 * size * String(text).length + 4;
  let width = w(loc.name, f);
  let bottom = base + 0.25 * f;
  if (loc.subtitle) {
    const fs = 11 * route;
    width = Math.max(width, w(loc.subtitle, fs));
    bottom = base + 1.364 * fs + 0.25 * fs;
  }
  return { x0: -width / 2, x1: width / 2, y0: base - 0.78 * f, y1: bottom };
}

// Where the pawns stand round a place (relative), as board.js draws them under the pilot.
export const pawnSpot = (i) => {
  const a = ((UX_PAWN_ANGLES[i % UX_PAWN_ANGLES.length]) * Math.PI) / 180;
  return { x: Math.cos(a) * PAWN_RING, y: Math.sin(a) * PAWN_RING };
};

const overlap = (a, b) => Math.max(0, Math.min(a.x1, b.x1) - Math.max(a.x0, b.x0)) * Math.max(0, Math.min(a.y1, b.y1) - Math.max(a.y0, b.y0));
const shift = (b, x, y) => ({ x0: b.x0 + x, x1: b.x1 + x, y0: b.y0 + y, y1: b.y1 + y });
export const boxAround = (x, y, r) => ({ x0: x - r, x1: x + r, y0: y - r, y1: y + r });

// The tries for a column of `marks` (each { left }: how far it reaches left of its centre, in R units — a „P” with its „?”
// reaches further) beside a place of half-size `edge`, in the order they are preferred: by the place → pushed left → two
// columns → two columns, the outer one a row higher → one row up → centred → down → … then at 85 % and 72 % size.
// → [{ scale, rows: [{ x, y, top, bottom, col, cols, colW, capR }] }] (relative to the place).
export function columnTries(marks, edge, step = MARK.STEP) {
  const n = marks.length;
  const tries = [];
  for (const scale of [1, 0.85, 0.72]) {
    const R = MARK.R * scale;
    const S = step * scale;
    const x0 = -(edge + MARK.GAP + R);
    const yb = edge - R;
    const build = (cols, x, bottom, outerUp = 0, down = false, free = false) => {
      const h = Math.ceil(n / cols);
      const colW = 2 * R + 4 * scale + (cols > 1 ? Math.max(...marks.slice(0, h).map((m) => (m.left ?? 1) - 1)) * R : 0);
      // two columns: the tap areas meet halfway between the outer column's discs and the inner column's (a „?” reaches left)
      const capL = (m) => (-colW + R - (m.left ?? 1) * R) / 2;
      const outerCap = colW + Math.min(...marks.slice(0, h).map(capL));
      return {
        scale,
        crowded: cols > 1 || scale < 1,
        rows: marks.map((m, i) => {
          const col = Math.floor(i / h);
          const row = i % h;
          const inCol = Math.min(h, n - col * h);
          const cx = x - col * colW;
          const k = row + (col ? outerUp : 0);
          return { x: cx, y: down ? bottom + k * S : bottom - k * S, S, top: down ? row === 0 : row === inCol - 1, bottom: down ? row === inCol - 1 : row === 0, col, cols, colW, capR: free ? Number.MAX_VALUE : col === 0 ? -edge - 1 - cx : outerCap, capL: cols > 1 && col === 0 ? capL(m) : null };
        }),
      };
    };
    tries.push(build(1, x0, yb));
    tries.push(build(1, x0 - 12 * scale, yb));
    if (n >= 2) tries.push(build(2, x0, yb));
    if (n >= 2) tries.push(build(2, x0, yb, 1));
    tries.push(build(1, x0, yb - S));
    if (n >= 2) tries.push(build(2, x0, yb - S));
    tries.push(build(1, x0, ((n - 1) / 2) * S));
    if (n >= 2) tries.push(build(1, x0, yb, 0, true)); // down from the place (a route without its name shown below)
    if (n >= 2) tries.push(build(2, x0 - 12 * scale, yb, 1));
    if (n === 1) { // one mark (or a place card): more spots round the left side, then above and below the place
      for (const [dx, dy] of [[-24, 0], [0, 1], [-12, -1], [-12, 1], [0, -2], [-24, -1], [-24, 1], [-36, 0], [-12, -2], [-24, -2], [-12, 2]]) tries.push(build(1, x0 + dx * scale, yb + dy * S));
      tries.push(build(1, 0, -edge - MARK.GAP - R - 6, 0, false, true)); // right above the place (its tap area cut off its disc)
      tries.push(build(1, 0, edge + MARK.GAP + R + 24 * scale, 0, false, true)); // below its name
    }
  }
  return tries;
}

// A mark's visible box at a row (relative to its place).
const markBox = (m, row, scale) => ({ x0: row.x - (m.left ?? 1) * MARK.R * scale - 1, x1: row.x + MARK.R * scale + 1, y0: row.y - (m.up ?? 1) * MARK.R * scale - 1, y1: row.y + (m.down ?? 1) * MARK.R * scale + 1 });

// A tappable mark's hit rectangle (relative to the MARK's centre): ≥ `hit` wide; rows of a column never overlap; the first
// column stops at the place's own disc. `m.hitAt`: the hit's centre x (the „?” of a Poké Stop sits left of its „P”).
export function hitRect(m, row, try_, hit) {
  const S = row.S ?? MARK.STEP * try_.scale;
  // rows tile the column; an inner edge keeps a hair's gap (0.15 units) so two rows never share a drawn pixel
  const up = row.top ? Math.max(S / 2, hit / 2) : S / 2 - 0.15;
  const down = row.bottom ? Math.max(S / 2, hit / 2) : S / 2 - 0.15;
  const cx = (m.hitAt ?? 0) * try_.scale;
  const right = Math.min(cx + hit / 2, row.capR);
  const left = row.capL !== null && row.capL !== undefined ? Math.max(Math.min(cx - hit / 2, right - hit), row.capL) : Math.min(cx - hit / 2, right - hit);
  return { x0: left, x1: right, y0: -up, y1: down };
}

// A hit rectangle `h` cut back so it never covers `o` (another place's disc, another column's mark or tap area, a road mark's
// tap area) — on the side that keeps the most of it, never into the mark's own visible box `own` (all absolute).
function trimHit(h, own, o) {
  if (!overlap(h, o)) return h;
  const cuts = [];
  if (o.x0 >= own.x1 - 0.5) cuts.push({ ...h, x1: Math.min(h.x1, o.x0) });
  if (o.x1 <= own.x0 + 0.5) cuts.push({ ...h, x0: Math.max(h.x0, o.x1) });
  if (o.y0 >= own.y1 - 0.5) cuts.push({ ...h, y1: Math.min(h.y1, o.y0) });
  if (o.y1 <= own.y0 + 0.5) cuts.push({ ...h, y0: Math.max(h.y0, o.y1) });
  const size = (b) => Math.max(0, b.x1 - b.x0) * Math.max(0, b.y1 - b.y0);
  return cuts.sort((a, b) => size(b) - size(a))[0] ?? { ...h, x0: own.x0, x1: own.x1, y0: own.y0, y1: own.y1 };
}

// How much a try covers (0 = nothing an eye would see): other places and their names, the pawns, the marks on the roads,
// columns laid out before, the map's edge. And its tap areas as they would be drawn — cut back off every other place's disc,
// every mark and tap area laid out before, the road marks' tap areas and the map's edge — `ok` when each is ≥ `need` units
// both ways (MIN_PX on this screen); `short` how many units they miss together.
export function scoreTry(p, t, { obstacles = [], placed = [], placedHits = [], shapes = [], blockers = [], W = 1000, H = 690, hit = 44, need = 0 } = {}) {
  let score = 0;
  let short = 0;
  const hits = t.rows.map((row, k) => {
    const m = p.marks[k];
    const own = shift(markBox(m, row, t.scale), p.x, p.y);
    for (const o of obstacles) score += overlap(own, o) * (o.w ?? 1);
    for (const o of placed) score += overlap(own, o);
    for (const o of placedHits) score += overlap(own, o) * 0.5;
    score += (own.x1 - own.x0) * (own.y1 - own.y0) - overlap(own, { x0: 0, x1: W, y0: 0, y1: H });
    if (!m.tap) return null;
    let abs = shift(hitRect(m, row, t, hit), p.x + row.x, p.y + row.y);
    for (const s of shapes) abs = trimHit(abs, own, s); // its own place's disc too: the place stays the place's
    for (const o of [...placed, ...placedHits, ...blockers]) abs = trimHit(abs, own, o);
    abs = { x0: Math.max(abs.x0, 0), x1: Math.min(abs.x1, W), y0: Math.max(abs.y0, 0), y1: Math.min(abs.y1, H) };
    short += Math.max(0, need - (abs.x1 - abs.x0)) + Math.max(0, need - (abs.y1 - abs.y0));
    return shift(abs, -(p.x + row.x), -(p.y + row.y));
  });
  return { score: score < 6 ? 0 : score, hits, ok: short < 0.01, short }; // a sliver no eye sees (a mark's disc is ~480 units²)
}

// The place card's marker (one disc for a crowded place's marks).
export const placeChip = (marks) => ({ kind: 'place', tap: true, left: 1.95, up: 1.75, down: 1.5, group: marks });

// Lay out every place's column. places: [{ id, x, y, edge, marks: [{ kind, left?, tap?, hitAt? }] }] (absolute x, y);
// obstacles: [{ x0, x1, y0, y1, w? }] (absolute; w = weight, 1 by default); blockers: tap areas no mark may cover (absolute);
// bounds { W, H }; hit = TAP_PX in units, need = MIN_PX in units (this screen); step = the rows' spacing.
// → Map(id → { scale, rows, hits, score, try, crowded, group, marks }) in the layout's order (a later column is drawn above)
// — rows relative to the place, hits relative to their mark. `group`: the place's marks did not all fit with 44 px taps —
// `marks` is then the one place-card marker (its `group` holds the place's marks).
export function layoutColumns(places, obstacles, opts = {}) {
  const withMarks = places.filter((p) => p.marks.length);
  const first = [...withMarks].sort((a, b) => b.marks.length - a.marks.length || a.x - b.x || a.y - b.y);
  let best = layoutPass(places, first, obstacles, opts);
  // a place whose taps did not all fit (or that covers something) goes first next time — it then picks its spot before its
  // neighbours; up to 3 passes, the best kept
  for (let pass = 0; pass < 2 && (best.short > 0.01 || best.score > 0); pass++) {
    const failing = first.filter((p) => !best.out.get(p.id).ok || best.out.get(p.id).score > 0);
    const order = [...failing, ...best.order.filter((p) => !failing.includes(p))];
    const next = layoutPass(places, order, obstacles, opts);
    if (next.short < best.short - 0.01 || (Math.abs(next.short - best.short) <= 0.01 && next.score < best.score)) best = next;
    else break;
  }
  return best.out;
}

function layoutPass(places, ordered, obstacles, { W = 1000, H = 690, hit = 44, need = 0, step = MARK.STEP, blockers = [] } = {}) {
  const placed = [];
  const placedHits = [];
  const out = new Map();
  const shapes = places.map((p) => ({ id: p.id, ...boxAround(p.x, p.y, p.edge + 2) })); // a tap area stops 2 units off a place's disc
  const ctx = { obstacles, placed, placedHits, shapes, blockers, W, H, hit, need };
  const best = (p) => {
    let b = null;
    columnTries(p.marks, p.edge, step).forEach((t, i) => {
      if (b?.ok && b.score === 0) return;
      const r = { ...scoreTry(p, t, ctx), t, i };
      // a layout whose taps all fit beats one that does not; then the least covered; then the earlier try
      const key = (x) => (x.ok ? 0 : 1e9 + x.short * 1e4) + x.score + x.i;
      if (!b || key(r) < key(b)) b = r;
    });
    return b;
  };
  let short = 0;
  let score = 0;
  for (const p of ordered) {
    let pick = best(p);
    let marks = p.marks;
    let group = false;
    if (p.marks.length > 1 && !(pick.ok && pick.score === 0)) {
      const chip = { ...p, marks: [placeChip(p.marks)] };
      const alt = best(chip);
      if ((alt.ok && (!pick.ok || alt.score < pick.score)) || (!pick.ok && alt.short < pick.short)) {
        pick = alt;
        marks = chip.marks;
        group = true;
      }
    }
    const t = pick.t;
    short += pick.short;
    score += pick.score;
    out.set(p.id, { scale: t.scale, rows: t.rows, hits: pick.hits, score: Math.round(pick.score), try: pick.i, crowded: t.crowded, ok: pick.ok, group, marks });
    t.rows.forEach((row, k) => {
      placed.push(shift(markBox(marks[k], row, t.scale), p.x, p.y));
      if (pick.hits[k]) placedHits.push(shift(pick.hits[k], p.x + row.x, p.y + row.y));
    });
  }
  return { out, short, score, order: ordered };
}

// One place's column (SVG; absolute position). Each mark: { kind, cls, attrs, body, tap, aria, left?, hitAt?, wrapHit? }
// — `body` drawn round (0, 0) at full size; a tappable mark's hit rectangle under it (inside `wrapHit(rect, scale)` — the
// Poké Stop's „?” — when set: then only the „?” is the mark's button, the „P” itself stays the place's).
export function columnSvg(place, marks, lay) {
  // pass 3: ONE disc a place — the column group and its mark are one element (its place's id on it: every tap works as before)
  if (marks.length === 1) {
    const m = marks[0];
    const row = lay.rows[0];
    const h = lay.hits[0];
    const rect = h ? `<rect class="mark-hit" x="${r2(h.x0)}" y="${r2(h.y0)}" width="${r2(r2(h.x1) - r2(h.x0))}" height="${r2(r2(h.y1) - r2(h.y0))}"/>` : '';
    const scaled = lay.scale === 1 ? m.body : `<g transform="scale(${lay.scale})">${m.body}</g>`;
    const aria = m.tap && m.aria ? ` role="button" aria-label="${esc(m.aria)}"` : '';
    return `<g class="mark-col col-mark ${m.cls}" data-node="${place.id}"${m.attrs ?? ''}${aria} data-kind="${m.kind}"${m.top ? ` data-top="${m.top}"` : ''} data-try="${lay.try ?? 0}" data-score="${lay.score ?? 0}" transform="translate(${r2(place.x + row.x)} ${r2(place.y + row.y)})">${m.aria ? `<title>${esc(m.aria)}</title>` : ''}${rect}${scaled}</g>`;
  }
  const rows = lay.rows.map((row, k) => {
    const m = marks[k];
    const h = lay.hits[k];
    const rect = h ? `<rect class="mark-hit" x="${r2(h.x0)}" y="${r2(h.y0)}" width="${r2(r2(h.x1) - r2(h.x0))}" height="${r2(r2(h.y1) - r2(h.y0))}"/>` : '';
    const scaled = lay.scale === 1 ? m.body : `<g transform="scale(${lay.scale})">${m.body}</g>`;
    const inner = m.wrapHit ? `${m.wrapHit(rect, lay.scale)}${scaled}` : `${rect}${scaled}`;
    const aria = m.tap && !m.wrapHit && m.aria ? ` role="button" aria-label="${esc(m.aria)}"` : '';
    return `<g class="col-mark ${m.cls}"${m.attrs ?? ''}${aria} data-kind="${m.kind}" transform="translate(${r2(row.x)} ${r2(row.y)})">${m.aria ? `<title>${esc(m.aria)}</title>` : ''}${inner}</g>`;
  }).join('');
  return `<g class="mark-col" data-node="${place.id}" data-try="${lay.try ?? 0}" data-score="${lay.score ?? 0}"${lay.crowded ? ' data-crowded="1"' : ''} transform="translate(${r2(place.x)} ${r2(place.y)})">${rows}</g>`;
}

// ---- pass 3: ONE disc a place (ChatGPT 23.11 21:14, the PT024 live playtest: „the board is cluttered — map first”) -------
// Under the pilot a place shows AT MOST ONE mark: the most important one for THIS player now, with a tiny „+N” pip when the
// place has more; a tap on it opens the place card (every mark of the place, the Poké Stop's too) — or, with one mark only,
// that mark's own card. The Poké Stop is a small „P” drawn on the place itself (like the printed board's symbol; tapping the
// place still moves); a ride's end and a bike trail are told by the blue halo and its tap, never by a disc.
// THE PRIORITY (first wins the disc; the place card lists them in this order):
//   1  track · legend-meet · target   the player's own focus: the tracked quest's place, a legend's encounter step of a line
//                                      held, a mission card's target
//   2  quest · legend-take · field     something to take HERE now: a quest (HM / TM / bike / Cut, an epic line, a city to free,
//                                      the Snorlax quest), a legend's line, a board card in the field
//   3  rocket                          the city under Team Rocket
//      stop                            (the „P” — on the place itself; its row in the place card comes here)
//   4  gym-new                         a badge still to win
//   5  rumour                          a heard rumour starts here
//   6  quest-later                     a quest a badge away, or with no free slot yet
//   7  bush                            a bush to cut
//   8  gym-earned                      a badge the player has
//   9  fatigue · stump                 a searched place, a cut bush
//   10 league                          the League
export const MARK_PRIORITY = Object.freeze(['track', 'legend-meet', 'target', 'quest', 'legend-take', 'field', 'rocket', 'stop', 'gym-new', 'rumour', 'quest-later', 'bush', 'gym-earned', 'fatigue', 'stump', 'league']);
export const markRank = (m) => { const i = MARK_PRIORITY.indexOf(m.prio ?? m.kind); return i < 0 ? MARK_PRIORITY.length : i; };
// never a disc on the map: the „P” is the place's own symbol, a ride's end / a trail is its halo
export const OFF_MAP = Object.freeze(['stop', 'ride', 'bike']);
const LIST_SKIP = new Set(['ride', 'bike']);

// The „+N” pip on a disc (top-left, outward): N more marks in the place card.
export const pipSvg = (n) => `<g class="mark-pip"><rect x="-21" y="-18" width="17" height="12" rx="6"/><text x="-12.5" y="-9">+${n}</text></g>`;

// A place's ONE disc. marks: board.js uxMarks (each with `prio` where its kind's rank depends on the state). → { disc, list,
// count } — `disc` the most important mark (as it looks; with several: a „+N” pip and its tap opens the place card), `list`
// the place card's rows (every mark but a ride's end / a trail, in priority), `count` the marks a disc stands for.
export function placeDisc(marks, name) {
  const ranked = [...marks].sort((a, b) => markRank(a) - markRank(b));
  const list = ranked.filter((m) => !LIST_SKIP.has(m.kind));
  const content = ranked.filter((m) => !OFF_MAP.includes(m.kind));
  if (!content.length) return { disc: null, list, count: 0 };
  const top = content[0];
  if (content.length === 1) return { disc: top, list, count: 1 };
  const more = content.length - 1;
  const disc = {
    ...top, kind: 'place', top: top.kind, cls: `${top.cls} place-top`, attrs: ' data-mark="place"', tap: true, wrapHit: undefined, hitAt: undefined,
    aria: `${name}: ${top.aria ?? top.label ?? ''} i jeszcze ${more} — dotknij, a zobaczysz wszystkie znaki`,
    left: Math.max(top.left ?? 1, 21 / MARK.R), up: Math.max(top.up ?? 1, 18 / MARK.R), body: `${top.body}${pipSvg(more)}`,
  };
  return { disc, list, count: content.length };
}

// The Poké Stop's „P” on the place itself (top-left of its disc, outward from the pawns): a small red disc; a heal-only place
// a heart. Part of the place (no tap of its own). → { svg, box } (box relative to the place).
export function nodeStopSvg(type, heal = false) {
  const r = nodeRadius(type);
  const d = type === 'special' ? 7.5 : r * 0.74;
  const R = 6.6;
  const body = heal ? mapIcon('hp', 0, 0, 9) : '<text dy="3.3">P</text>';
  return { svg: `<g class="node-p${heal ? ' heal-only' : ''}" transform="translate(${-d} ${-d})" aria-hidden="true"><circle r="${R}"/>${body}</g>`, box: { x0: -d - R - 1, x1: -d + R + 1, y0: -d - R - 1, y1: -d + R + 1 } };
}

// ---- pictures --------------------------------------------------------------------------------------------------------

// A round portrait of a species from the game's OWN local art (assets/cards/, cardArt.js; framed by its card crop) — never a
// remote picture. Without one (or with the art off): a neutral disc with a game icon (`icon`). `id`: a unique clip id.
export function portraitSvg(species, { r = 12, id, icon = 'world' } = {}) {
  const own = ART.source !== 'off' && CARD_ART[species] ? ownArtUrl(species) : null;
  const f = CARD_ART[species]?.card ?? { x: 50, y: 45, scale: 1.2 };
  const size = 2 * r * f.scale;
  const img = own ? `<clipPath id="${id}"><circle r="${r - 1}"/></clipPath><image class="portrait-art" href="${esc(own)}" x="${r1((-size * f.x) / 100)}" y="${r1((-size * f.y) / 100)}" width="${r1(size)}" height="${r1(size)}" clip-path="url(#${id})" preserveAspectRatio="xMidYMid slice"/>` : '';
  return `<circle class="portrait-bg" r="${r}"/>${mapIcon(icon, 0, 0, Math.round(r * 1.2))}${img}<circle class="portrait-ring" r="${r}"/>`;
}
export const hasPortrait = (species) => ART.source !== 'off' && Boolean(CARD_ART[species]);

// A gym's badge (badgeArt.js): earned in colour, not yet — grey (the board's #ux-grey filter) and faint. Without a picture:
// the old type icon in its disc.
export function badgeMarkSvg(gym, { earned = false, R = MARK.R } = {}) {
  const file = BADGE_ART[gym.id];
  if (!file) return `<circle r="${R}"/>${mapIcon(`type.${gym.type}`, 0, 0, 14)}`;
  const s = R * 2 - 2;
  return `<circle class="badge-disc" r="${R}"/><image class="badge-img" href="${BADGE_ART_DIR}${file}" x="${-s / 2}" y="${-s / 2}" width="${s}" height="${s}"${earned ? '' : ' filter="url(#ux-grey)"'}/>`;
}

// The marks on the roads (incidents): a species blocking the road shows its portrait; the others a game icon (never emoji).
export const INCIDENT_SPECIES = Object.freeze({ snorlax: 'snorlax' });
export const INCIDENT_ICON = Object.freeze({ snorlax: 'rest', 'beedrill-swarm': 'type.bug', downpour: 'biome.water', landslide: 'biome.cave', 'gym-closed': 'lock' });
export function incidentMarkSvg(id, uid) {
  const species = INCIDENT_SPECIES[id];
  if (species) return portraitSvg(species, { r: 13, id: `inc-${uid}`, icon: INCIDENT_ICON[id] ?? 'world' });
  return `<circle r="12"/>${mapIcon(INCIDENT_ICON[id] ?? 'world', 0, 0, 15)}`;
}

// A plain disc with a game icon (most column marks).
export const discSvg = (key, { R = MARK.R, size = 14 } = {}) => `<circle class="disc" r="${R}"/>${mapIcon(key, 0, 0, size)}`;

// Text emoji (and the like) found in SVG markup — the pilot's board has none (the Rocket „R”, the „P” and names are letters).
const EMOJI_RE = /\p{Extended_Pictographic}/u;
export const svgTextEmoji = (html) => [...String(html).matchAll(/<text[^>]*>([\s\S]*?)<\/text>/g)].map((m) => m[1].replace(/<[^>]+>/g, '')).filter((t) => EMOJI_RE.test(t));

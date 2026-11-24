// UX-2211 (ChatGPT 22.11 §6; rules.ux 'u1' — a DEV pilot of the table): every mechanical mark of the map, and the world's
// pill at the top, says what it is — one card: the name, a short description, what it changes in the game now and, when
// the player can do something about it, how. Words only: no move, no action, the game state untouched. Nothing hidden is
// told (a hunt without a clue: its region only; an incident's next week is never said; a bush's find before it is cut).
// Without the pilot the map keeps its toasts (board.js).
// UX-2311 A6 (PLAYTEST_023, owner point 8 — progressive disclosure): the card shows the title, ONE line of what this is and
// ONE step the player can take; the rest waits behind a small „Więcej” (only when there is more).
// A card: { icon, iconKey?, art?, badge?, title, text, effect, how, more?, buttons: [{ ui, label, data }] }
//   text   what this is (one line)          how / effect   the step: `how` when there is one, else `effect`
//   more   extra words for „Więcej” (with `effect` when `how` is the step)
//   art    a species: its round portrait (local art) · badge { gym, earned }: the badge · iconKey: a game icon
import { GYMS_BY_ID, gymInCity } from '../data/gyms.js';
import { getSpecies } from '../data/pokemon.js';
import { hasBadge } from '../engine/gymEngine.js';
import { incidentDef, incidentsNow } from '../engine/incidentEngine.js';
import { rocketBlocks } from '../engine/rocketEngine.js';
import { currentPlayer } from '../engine/gameState.js';
import { hasPokeStop, healOnlySpot, pokeStopV2, shopChargesOnTransaction } from '../engine/pokeStopEngine.js';
import { questLocations } from '../engine/questEngine.js';
import { bookQuest, bookQuests, legendStep, questOf, takeBlock } from '../engine/questBookEngine.js';
import { rumourList } from '../engine/rumourEngine.js';
import { fieldOfferPlaces } from '../engine/livingKantoEngine.js';
import { occupiedAt, shopClosedByRocket } from '../engine/rocketCampaignEngine.js';
import { bushAt, cutAbilityBlockers, cutDone } from '../engine/cutEngine.js';
import { esc } from '../ui/dom.js';
import { BUSH_PL, INCIDENT_PL, QUESTBOOK_PL, campaignFlagPl, cutBlockerPl, offerTitlePl, placeName, questPl, rewardPl } from './content-pl.js';
import { fieldQuestHints, journal } from './journal.js';
import { trackedEntry, trackable } from './tracker.js';
import { badgeArt } from './badgeArt.js';
import { ART, ownArtUrl } from './art.js';
import { CARD_ART } from './cardArt.js';
import { gi } from './icons.js';

const btnOf = (ui, label, data = {}) => ({ ui, label, data });
const locate = (place) => btnOf('locate-place', `📍 ${placeName(place)}`, { place });

// The Journal's entry of a quest for this player (taken, heard or a hint) — „📖 Misja” and „📌 Śledź” on a card.
function questButtons(state, player, questId) {
  if (!player || player.controller === 'ai') return [];
  const e = journal(state, player).entries.find((x) => x.questId === questId && trackable(x));
  if (!e) return [];
  const on = trackedEntry(state, player)?.activityId === e.activityId;
  return [btnOf('journal-open', '📖 Misja', { id: e.activityId }), on ? btnOf('track-off', '📌 Śledzisz ✓', { player: player.id }) : btnOf('track', '📌 Śledź', { player: player.id, id: e.activityId })];
}

const untilPl = (x) => (x.to ? `do tygodnia ${x.to - 1}` : '');
const edgesPl = (def) => def.edges.map(([a, b]) => `${placeName(a)} ↔ ${placeName(b)}`).join(', ');

// An incident of the living world (the pill at the top, its mark on the map): what, where, until when, what helps.
export function incidentInfo(state, id) {
  const player = currentPlayer(state);
  const x = incidentsNow(state, rocketBlocks(state)).find((i) => i.id === id && !i.held);
  const def = incidentDef(id);
  const pl = INCIDENT_PL[id];
  if (!x || !def || !pl) return null;
  const card = { icon: pl.icon, title: pl.name, text: pl.text, effect: '', how: '', buttons: [] };
  if (id === 'snorlax') {
    // UX-2311 A5: the ROAD BLOCK's card (Snorlax's portrait) — Lavender's quest mark has its own card (the quest)
    card.art = 'snorlax';
    card.text = `Snorlax śpi na drodze ${edgesPl(def)} — tędy nie przejdziesz.`;
    card.effect = `Blokuje przejście: ${edgesPl(def)}. Do Lavender i na trasę 12 dojdziesz inną drogą (trasą 8 albo 13).`;
    card.how = 'Pan Fuji w Lavender Town może pomóc: misja „Śpiący Snorlax” — Wieża Pokémon, Team Rocket, Poké Flute.';
    card.buttons = [...questButtons(state, player, 'epic-snorlax'), locate('lavender-town')];
    return card;
  }
  if (def.kind === 'closeEdges') card.effect = `Zamknięte: ${edgesPl(def)}${untilPl(x) ? ` — ${untilPl(x)}` : ''}.`;
  if (def.kind === 'swarm') card.effect = `Eksploracja na: ${def.places.map(placeName).join(', ')}${untilPl(x) ? ` — ${untilPl(x)}` : ''}.`;
  if (def.kind === 'closeGym' && x.gym) {
    const g = GYMS_BY_ID[x.gym];
    card.effect = `Sala w ${placeName(g.city)} zamknięta${untilPl(x) ? ` ${untilPl(x)}` : ''} — miasto i Poké Stop działają.`;
    card.how = 'Wróć do tej sali później albo idź do innej.';
  }
  if (id === 'downpour' || id === 'landslide') card.how = 'Idź inną drogą — to minie samo.';
  return card;
}

// The world's pill (top): one card per incident shown in it — the first one's card; the pill names them all.
export const worldPillIds = (state) => incidentsNow(state, rocketBlocks(state)).filter((x) => !x.held).map((x) => x.id);

// UX-2311 A4 (owner point 7): where a LEGEND waits for this player — its line to take (where the engine would let them take
// it now: takeBlock at its place, as the Journal's hints ask) or its encounter, the current step of a line they hold.
// → Map(place → { species, name, quest, kind: 'take' | 'meet' }). Both are public: the Journal shows the line's reward
// („złapanie: Zapdos”) and its steps.
export function legendPlaces(state, player) {
  const out = new Map();
  if (!player?.questBook) return out;
  const active = player.questBook.active ?? [];
  const nameOf = (species) => getSpecies(species)?.name ?? species;
  for (const a of active) {
    const q = questOf(a);
    const o = q?.stages?.[a.stage]?.objectives?.find((x) => x.kind === 'encounter' && x.legend);
    if (o?.place && !out.has(o.place)) out.set(o.place, { species: o.species, name: nameOf(o.species), quest: q, kind: 'meet' });
  }
  for (const q of bookQuests(state.config)) {
    const step = legendStep(q);
    if (!step || active.some((a) => a.questId === q.id) || out.has(q.takeAt)) continue;
    if (takeBlock(state, { ...player, location: q.takeAt }, q)) continue;
    out.set(q.takeAt, { species: step.species, name: nameOf(step.species), quest: q, kind: 'take' });
  }
  return out;
}

// the Poké Stop's step: what healing and the shop cost under THIS game's rules
function stopCostsPl(state, place) {
  const closed = shopClosedByRocket(state, place);
  if (!pokeStopV2(state)) return closed ? 'Wizyta — 1 akcja: leczy drużynę. Sklep zamknął Team Rocket.' : 'Wizyta — 1 akcja: leczy drużynę i otwiera sklep.';
  if (closed) return 'Leczenie — 1 akcja. Sklep zamknął Team Rocket.';
  return shopChargesOnTransaction(state.config) ? 'Leczenie — 1 akcja. Sklep: oglądasz za darmo, akcję płacisz przy pierwszym zakupie.' : 'Leczenie — 1 akcja. Sklep — 1 akcja.';
}

const ranked = (h) => (h.epic ? (h.soon ? 2 : 1) : 0);
const firstUp = (t) => (t ? t[0].toUpperCase() + t.slice(1) : t);

// The marks of a place (board.js `data-mark`): a rumour to take, a mission card's target, the tracked quest's place, a gym,
// the Poké Stop's „?”, a bush, a quest to take, a legend, a board card in the field.
export function placeMarkInfo(state, kind, place) {
  const player = currentPlayer(state);
  const here = place === player.location;
  if (kind === 'rumour') {
    const list = rumourList(state, player).filter((r) => r.status === 'go' && r.start === place);
    const titles = list.map((r) => `„${QUESTBOOK_PL[r.quest]?.title ?? r.quest}”`).join(', ');
    return { icon: '📜', iconKey: 'rumour', title: 'Plotka', text: `${placeName(place)}: tutaj można wziąć misję ${titles}.`, effect: '', how: here ? 'Weź ją w Dzienniku albo na pasku akcji.' : 'Idź tam i weź ją na miejscu.', buttons: [...(list[0] ? questButtons(state, player, list[0].quest) : []), locate(place)] };
  }
  if (kind === 'target') {
    const cards = (player.quests ?? []).filter((m) => questLocations(m, state.config).includes(place));
    return { icon: '🎯', title: 'Cel karty misji', text: cards.map((m) => `„${questPl(m.questId).title}” — ${questPl(m.questId).text ?? ''}`).join(' '), effect: '', how: '', buttons: [locate(place)] };
  }
  if (kind === 'track') {
    const e = trackedEntry(state, player);
    return e ? { icon: '📌', title: `Śledzona misja: ${e.title}`, text: e.nextStep, effect: '', how: '', buttons: [btnOf('journal-open', '📖 Misja', { id: e.activityId }), btnOf('track-off', 'Przestań śledzić', { player: player.id })] } : null;
  }
  if (kind === 'gym') {
    const g = gymInCity(place, state.config);
    if (!g) return null;
    const shut = incidentsNow(state, rocketBlocks(state)).find((x) => x.gym === g.id && !x.held);
    const has = hasBadge(player, g.id);
    return { icon: '🏟️', badge: { gym: g.id, earned: has }, title: `Sala: ${placeName(place)}`, text: `Odznaka: ${g.badge}${has ? ' — masz ją ✓' : ' — jeszcze jej nie masz'}.`, effect: shut ? `Zamknięta${untilPl(shut) ? ` ${untilPl(shut)}` : ''}.` : '', how: shut || has ? '' : here ? 'Jesteś tu — możesz wyzwać lidera sali.' : 'Idź tam i wyzwij lidera sali.', buttons: [locate(place)] };
  }
  if (kind === 'stop') {
    // UX-2311 (owner point 9): the „?” by every Poké Stop — what it is and what it costs under this game's rules
    const heal = healOnlySpot(place, state.config);
    if (!hasPokeStop(place, state.config) && !heal) return null;
    if (heal) return { icon: '♥', title: heal === 'oak' ? 'Leczenie u Profesora Oaka' : 'Poké Center', text: 'Tu wyleczysz drużynę. Sklepu tu nie ma.', effect: '', how: 'Leczenie — 1 akcja.', buttons: [] };
    const closed = shopClosedByRocket(state, place);
    return { icon: '🏪', iconKey: 'pokestop', title: 'Poké Stop', text: closed ? 'Tu wyleczysz drużynę. Sklep zamknął Team Rocket.' : 'Tu wyleczysz drużynę i zrobisz zakupy.', effect: '', how: stopCostsPl(state, place), more: pokeStopV2(state) && !closed ? 'Leczenie i sklep to dwie osobne akcje — w jednej turze możesz zrobić obie.' : '', buttons: [] };
  }
  if (kind === 'bush') {
    // CUT-1 + UX-2311 A6: what it is and how to cut it — NEVER what hides behind it (the cut's own result tells that)
    const bush = bushAt(state.config, place);
    if (!bush) return null;
    if (cutDone(player).includes(bush.id)) return { icon: '🪵', iconKey: 'stump', title: 'Ścięty krzaczek', text: `${placeName(place)}: ten krzaczek już ściąłeś — zostaje pieniek.`, effect: '', how: '', buttons: [] };
    const missing = cutAbilityBlockers(player, state.config);
    return { icon: '🌳', iconKey: 'bush', title: 'Krzaczek', text: `${placeName(place)}: ${BUSH_PL[bush.id] ?? 'krzaczek'} — za krzaczkiem coś czeka.`, effect: '', how: missing.length ? cutBlockerPl(missing[0]) : here ? 'Jesteś tu — możesz go ściąć (1 akcja).' : 'Idź tam i zetnij go z HM Cut (1 akcja).', buttons: here ? [] : [locate(place)] };
  }
  if (kind === 'quest') {
    // a quest to take at this place (the Journal's hint: HM / TM / bike / Cut, an epic line, a city to free, Snorlax)
    const hints = fieldQuestHints(state, player).filter((h) => h.place === place).sort((a, b) => ranked(a) - ranked(b));
    const h = hints[0];
    if (!h) return null;
    // the hint's words without its icon, its place and the quest's name (the card's title says them)
    const what = firstUp(h.text.replace(/^\S+\s+[^:]+:\s*/, '').replace(/\.$/, '').replace(/ — misja „[^”]*”/, '').replace(/^wielkie zadanie „[^”]*”/, 'Wielkie zadanie'));
    const step = h.soon ? `Najpierw zdobądź ${h.soon} odznaki.` : h.full ? 'Najpierw zrób albo oddaj jedną misję — teraz nie masz wolnego miejsca.' : here ? 'Weź ją w Dzienniku.' : `Idź do: ${placeName(place)} i weź ją na miejscu.`;
    const others = hints.slice(1).map((x) => `„${x.title}”`).join(', ');
    return { icon: h.icon, iconKey: h.iconKey, title: h.title, text: `${what}.`, effect: '', how: step, more: others ? `Tu też: ${others}.` : '', buttons: [...questButtons(state, player, h.quest.id), ...(here ? [] : [locate(place)])] };
  }
  if (kind === 'legend') {
    const lg = legendPlaces(state, player).get(place);
    if (!lg) return null;
    const title = QUESTBOOK_PL[lg.quest.id]?.title ?? QUESTBOOK_PL[lg.quest.replaces]?.title ?? lg.quest.id;
    // UX-2311 pass 2: a quest's START is told as a quest (never „tu złapiesz / tu spotkasz”); the legend's own step as its encounter
    return lg.kind === 'meet'
      ? { icon: '⭐', art: lg.species, title: `Legenda: ${lg.name}`, text: `${lg.name} czeka tutaj — to krok misji „${title}”.`, effect: '', how: here ? 'Jesteś na miejscu — szczegóły w Dzienniku.' : `Idź do: ${placeName(place)}.`, buttons: [...questButtons(state, player, lg.quest.id), ...(here ? [] : [locate(place)])] }
      : { icon: '⭐', art: lg.species, artTag: 'Misja', title: `Misja: ${title}`, text: `Tu zaczyna się misja „${title}” — na jej końcu czeka legenda: ${lg.name}.`, effect: '', how: here ? 'Weź ją w Dzienniku.' : `Idź do: ${placeName(place)} i weź ją na miejscu.`, buttons: [...questButtons(state, player, lg.quest.id), ...(here ? [] : [locate(place)])] };
  }
  if (kind === 'field') {
    const offers = fieldOfferPlaces(state, player).get(place);
    if (!offers?.length) return null;
    return { icon: '📋', iconKey: 'quest.offer', title: 'Zlecenie w terenie', text: `${placeName(place)}: tu wisi zlecenie z tablicy.`, effect: '', how: here ? 'Weź je w Dzienniku.' : 'Idź tam i weź je na miejscu.', more: offers.map((o) => `${offerTitlePl(o.quest.lk)} ${'★'.repeat(o.difficulty)} — nagroda: ${rewardPl(o.quest.reward)}, odbiór: ${o.quest.claimAt === o.stop ? placeName(o.stop) : 'dowolny Poké Stop'}.`).join(' '), buttons: here ? [] : [locate(place)] };
  }
  if (kind === 'rocket') { // the city under Team Rocket (the world card's words — main.js campaign-info)
    const ch = occupiedAt(state, place);
    if (!ch) return null;
    const takeAt = bookQuest(ch.frees.quest)?.takeAt ?? place;
    return { icon: '🚩', title: `Team Rocket: ${placeName(place)}`, text: campaignFlagPl(place, ch, takeAt), effect: '', how: '', buttons: [locate(takeAt)] };
  }
  if (kind === 'bike') return { icon: '🚲', iconKey: 'bike', title: 'Szlak rowerowy', text: 'Tędy prowadzi szlak rowerowy.', effect: '', how: state.config.rules.bike === 'b2' ? 'Z rowerem: 3 pola za 2 akcje, raz na turę.' : 'Z rowerem przejedziesz z miasta do miasta jedną akcją.', buttons: [] };
  if (kind === 'downhill') return { icon: '🚲', iconKey: 'bike', title: 'Cycling Road', text: state.config.rules.bike === 'b2' ? 'Zjazd tylko w dół (strzałki pokazują kierunek). Rowerem z górki jedziesz szybciej: Route 16 → 18 to jedno pole.' : 'Zjazd tylko w dół (strzałki pokazują kierunek).', effect: '', how: '', buttons: [] }; // BIKE V2: CR-1
  return null;
}

// The card's picture: a species' round portrait (local art only), a badge, a game icon, or the card's emoji (iconText).
function cardIcon(c) {
  if (c.art) {
    const url = ART.source !== 'off' && CARD_ART[c.art] ? ownArtUrl(c.art) : null;
    const pic = url ? `<img class="mi-portrait" src="${esc(url)}" alt="" draggable="false" decoding="async">` : gi('star');
    return c.artTag ? `<span class="mi-art-quest">${pic}<span class="mi-tag">${gi('quest.field', { size: 14 })}${esc(c.artTag)}</span></span>` : pic; // pass 2: a quest's start
  }
  if (c.badge) return badgeArt(c.badge.gym, { earned: c.badge.earned, cls: 'mi-badge' }) || esc(c.icon);
  if (c.iconKey) return gi(c.iconKey);
  return esc(c.icon);
}

// UX-2311 pass 2 (ChatGPT review 23.11 P0) — THE PLACE CARD („karta miejsca”): a crowded place's marks, one row each (≥ 44 px):
// a row opens that mark's own card (main.js map-mark; the card then has „← Wszystkie znaki”), the ride's end does what its
// mark did (the place's tap: the ride's preview), a searched place / the League are words only. `marks`: board.js uxMarks.
const ROW_KINDS_INFO = new Set(['fatigue', 'league']);
export function placeListCard(state, place, marks) {
  const rows = marks.map((m) => ({
    kind: m.kind,
    label: m.label ?? m.aria ?? m.kind,
    icon: m.icon ?? { key: 'help' },
    ui: m.kind === 'ride' ? 'map-place-tap' : ROW_KINDS_INFO.has(m.kind) || !m.tap ? null : 'map-mark',
  }));
  return { icon: '📍', iconKey: 'here', title: placeName(place), text: 'Tu jest kilka znaków. Dotknij jednego — powie, co znaczy.', effect: '', how: '', place, rows, buttons: [] };
}
function rowIcon(i) {
  if (i.badge) return badgeArt(i.badge, { earned: i.earned, cls: 'mi-row-badge' }) || gi(`type.${i.type ?? 'normal'}`);
  if (i.art) {
    const url = ART.source !== 'off' && CARD_ART[i.art] ? ownArtUrl(i.art) : null;
    return `${url ? `<img class="mi-row-portrait" src="${esc(url)}" alt="" draggable="false" decoding="async">` : gi('star')}${i.tag ? `<span class="mi-row-tag">${gi('quest.field', { size: 11 })}</span>` : ''}`;
  }
  if (i.letter) return `<b>${esc(i.letter)}</b>`;
  return gi(i.key ?? 'help');
}

// The card (in the notice layer, like an important notice — it stays until OK). UX-2311 A6: the title, one line, one step;
// „Więcej” (a <details> — no game state, opened in place) only when there is more to say. Pass 2: a place card's rows.
export function mapInfoCard(c) {
  const line = (cls, t) => (t ? `<p class="${cls}">${esc(t)}</p>` : '');
  const data = (d) => Object.entries(d).map(([k, v]) => ` data-${k}="${esc(v)}"`).join('');
  const buttons = c.buttons.map((b) => `<button class="mi-btn" data-ui="${b.ui}"${data(b.data)}>${esc(b.label)}</button>`).join('');
  const step = c.how || c.effect;
  const more = [c.how ? c.effect : '', c.more].filter(Boolean);
  const details = more.length ? `<details class="mi-more"><summary>Więcej</summary>${more.map((t) => line('mi-extra', t)).join('')}</details>` : '';
  const row = (r) => {
    const inner = `<span class="mi-row-ic ${esc(r.icon.cls ?? r.kind)}" aria-hidden="true">${rowIcon(r.icon)}</span><span class="mi-row-t">${esc(r.label)}</span>`;
    return r.ui ? `<li><button class="mi-row" data-ui="${r.ui}" data-kind="${esc(r.kind)}" data-place="${esc(c.place)}" data-from="place">${inner}<span class="mi-row-go" aria-hidden="true">›</span></button></li>` : `<li><div class="mi-row info">${inner}</div></li>`;
  };
  const rows = c.rows?.length ? `<ul class="mi-rows" aria-label="Znaki: ${esc(c.title)}">${c.rows.map(row).join('')}</ul>` : '';
  return `<div class="notice-card map-info${rows ? ' place-list' : ''}"><div class="n-icon">${cardIcon(c)}</div><h2>${esc(c.title)}</h2>${line('mi-text', c.text)}${line('mi-step', step)}${rows}${details}${buttons ? `<div class="row center mi-btns">${buttons}</div>` : ''}<button data-ui="map-info-ok">OK</button></div>`;
}

// UX-2211 (ChatGPT 22.11 „POST-PLAYTEST_022 — UX CLEANUP” §2, §3; rules.ux 'u1' — a DEV pilot of the TABLE only, OFF in every
// set, ?dev=ux; docs/design/UX_AUDIT_2211.md). „Śledź misję”: ONE tracked activity a player — a READ-ONLY projection of the
// Trainer Journal (table/journal.js), like the Journal itself: no progress is copied, every step, place and reason is the
// engine's (questBookEngine.nextStep / takeBlock). The only thing kept is WHICH entry a player follows:
//   state.tableUx.track[playerId] = { id, questId }   the Journal's activityId (+ its quest, so a rumour that becomes a taken
//                                                      quest — 'rumour:…' → 'book:…' — is still followed)
//   state.tableUx.seenTms[playerId] = { tm: count }    the TMs the player has seen in the Plecak's 💿 TM tab („NOWA” = more now)
// The engine never reads `state.tableUx`; an older save has none (nothing tracked) and an older build ignores it.
import { bookQuest, bookQuests } from '../engine/questBookEngine.js';
import { questLocations } from '../engine/questEngine.js';
import { heldTms } from '../engine/tmEngine.js';
import { esc } from '../ui/dom.js';
import { QUESTBOOK_PL, placeName } from './content-pl.js';
import { journal } from './journal.js';

export const usesUx = (config) => config?.rules?.ux === 'u1';

const bag = (state) => (state.tableUx ??= {});
export const trackRef = (state, playerId) => state.tableUx?.track?.[playerId] ?? null;

// What can be followed: a taken activity not yet finished (a book quest, a mission card, an expedition, a board card, an HM /
// TM / Rocket quest) and one only heard of (a rumour, an HM / epic hint) — then its place is where to take it.
export const trackable = (e) => e.section !== 'done' && ['accepted', 'inProgress', 'ready', 'heard'].includes(e.completionStatus);
const TAKEN = new Set(['mine', 'expeditions']);

export function setTrack(state, playerId, entry) {
  const t = (bag(state).track ??= {});
  if (entry) t[playerId] = { id: entry.activityId, questId: entry.questId ?? null };
  else delete t[playerId];
}

// The tracked entry NOW: the same activity; else the same quest taken (a heard rumour was taken); else the same quest still
// heard. Null when it is finished, given up or gone.
export function trackedEntry(state, player, J = null) {
  const ref = player ? trackRef(state, player.id) : null;
  if (!ref) return null;
  const live = (J ?? journal(state, player)).entries.filter(trackable);
  return live.find((e) => e.activityId === ref.id)
    ?? (ref.questId ? live.find((e) => e.questId === ref.questId && TAKEN.has(e.section)) ?? live.find((e) => e.questId === ref.questId) : null)
    ?? null;
}

// A finished / given-up activity is followed no more (called before a save — never while drawing).
export function pruneTracker(state) {
  const t = state.tableUx?.track;
  if (!t) return;
  for (const id of Object.keys(t)) {
    const p = state.players.find((x) => x.id === id);
    if (!p || !trackedEntry(state, p)) delete t[id];
  }
}

// The current stage's objectives as the quest data has them (a board card: its own quest; a mission card: none).
function stageObjectives(player, e) {
  if (e.sourceSystem === 'missionCard') return [];
  const q = e.def ?? (e.questId ? bookQuest(e.questId) : null);
  if (!q) return [];
  const at = e.completionStatus === 'heard' ? 0 : Math.max(0, (e.currentStage || 1) - 1);
  return q.stages[at]?.objectives ?? [];
}

// The places of the next step: where it happens (or where to take it), every unfinished objective of the stage with a place,
// a catch's places (where to look — never a promise of an encounter), a mission card's places. „Any Poké Stop” is no place.
export function trackPlaces(state, player, e) {
  if (!e) return [];
  const out = new Set();
  const add = (p) => p && p !== 'pokeStop' && out.add(p);
  add(e.destination);
  if (e.completionStatus === 'ready') return [...out];
  for (const o of e.objectives) if (o.stage === 'now' && !o.done) add(o.place);
  for (const o of stageObjectives(player, e)) for (const p of o.places ?? []) add(p);
  const card = e.sourceSystem === 'missionCard' ? (player.quests ?? []).find((m) => m.questId === e.questId) : null;
  if (card) for (const p of questLocations(card, state.config)) add(p);
  return [...out];
}

// A step that is a catch: the tracker shows where to look, and says it is not sure.
const isCatchStep = (player, e) => e.completionStatus !== 'ready' && (e.sourceSystem === 'missionCard' || stageObjectives(player, e).some((o) => ['catch', 'encounter'].includes(o.kind)));

const progressPl = (e) => (e.completionStatus === 'ready' ? '✓ gotowe' : e.completionStatus === 'heard' ? 'jeszcze nie przyjęta'
  : `${e.stages > 1 ? `etap ${e.currentStage}/${e.stages} · ` : ''}${e.progress.done}/${e.progress.total}`);

// The widget (top left, under the Rocket / world pills): 📌 the title, the progress, the next step, its places (a tap shows
// one on the map), ✕ to stop following. A tap on the title opens the activity in the Journal. The HUD's player only — never an
// AI's (main.js passes the human whose widget is shown).
// UX-2311 (PLAYTEST_023 point 3 — ChatGPT 23.11 A3): `open: false` — one slim line (📌 the title · the progress ›); a tap
// unfolds the whole widget, „▴” folds it again (main.js ui.trackerOpen). Never the 360 px card open all the time.
export function trackerWidget(state, player, { open = true } = {}) {
  if (!usesUx(state.config) || !player || player.controller === 'ai') return '';
  const e = trackedEntry(state, player);
  if (!e) return '';
  if (!open) return `<div class="tracker glass tr-chip1" style="--pc:${esc(player.color)}"><button class="tr-chip" data-ui="tracker-toggle" aria-expanded="false" aria-label="Śledzona misja: ${esc(e.title)} — ${esc(progressPl(e))}. Pokaż, co dalej"><span class="tr-pin" aria-hidden="true">📌</span><b>${esc(e.title)}</b><small>${esc(progressPl(e))}</small><span class="tr-chev" aria-hidden="true">›</span></button></div>`;
  const places = trackPlaces(state, player, e);
  const step = e.completionStatus === 'heard' ? e.nextStep : e.nextStep || (e.completionStatus === 'ready' ? '🎁 Odbierz nagrodę' : '');
  const where = places.slice(0, 3).map((p) => `<button class="tr-place" data-ui="locate-place" data-place="${esc(p)}" aria-label="Pokaż na mapie: ${esc(placeName(p))}">📍 ${esc(placeName(p))}</button>`).join('')
    + (places.length > 3 ? `<small class="tr-more">+${places.length - 3}</small>` : '')
    + (!places.length && e.destination === 'pokeStop' ? '<span class="tr-place any">📍 dowolny Poké Stop</span>' : '');
  const look = isCatchStep(player, e) && places.length ? '<small class="tr-note">Szukaj tam — spotkanie nie jest pewne.</small>' : '';
  return `<div class="tracker glass" style="--pc:${esc(player.color)}" aria-label="Śledzona misja: ${esc(e.title)}">
    <button class="tr-main" data-ui="journal-open" data-id="${esc(e.activityId)}"><span class="tr-pin" aria-hidden="true">📌</span><span class="tr-text"><b>${esc(e.title)}</b><small>${esc(progressPl(e))}</small>${step ? `<span class="tr-step">${esc(step)}</span>` : ''}</span></button>
    ${where || look ? `<div class="tr-where">${where}${look}</div>` : ''}
    <button class="tr-x" data-ui="track-off" data-player="${esc(player.id)}" aria-label="Przestań śledzić">✕</button><button class="tr-fold" data-ui="tracker-toggle" aria-expanded="true" aria-label="Zwiń">▴</button></div>`;
}

// The Journal's button: „📌 Śledź” — or „📌 Śledzisz” (a tap stops it). `owner`: whose Journal it is.
export function trackButton(state, owner, e) {
  if (!usesUx(state.config) || !owner || owner.controller === 'ai' || !trackable(e)) return '';
  const on = trackedEntry(state, owner)?.activityId === e.activityId;
  return on
    ? `<button class="ghost small track-btn on" data-ui="track-off" data-player="${esc(owner.id)}">📌 Śledzisz ✓</button>`
    : `<button class="ghost small track-btn" data-ui="track" data-player="${esc(owner.id)}" data-id="${esc(e.activityId)}">📌 Śledź</button>`;
}

// What the activity opens next (the data's own links — never a new rule): the quest that the world flag of this one unlocks
// (`needsWorld`) or that names it its waker (`wakerOf`). Snorlax: „Śpiący Snorlax” → „Obudzony Snorlax”.
export function followUps(config, questId) {
  const q = questId ? bookQuest(questId) : null;
  if (!q) return [];
  return bookQuests(config).filter((x) => x.id !== q.id && (x.wakerOf === q.id || (q.world && x.needsWorld === q.world)));
}

// The whole way of a quest the Journal told too briefly (PLAYTEST_022: „Śpiący Snorlax” — nobody knew where it starts).
// Presentation only: the same steps the quest has.
export const UX_ABOUT_PL = Object.freeze({
  'epic-snorlax': 'Snorlax śpi na drodze między trasą 11 a 12 i nikogo nie przepuszcza. Idź do Lavender Town: Pan Fuji poprosi o pomoc — zbadaj Wieżę Pokémon (Eksploruj), potem pokonaj Team Rocket w wieży, a dostaniesz Poké Flute. Zanieś flet na trasę 12 i odbierz nagrodę: Snorlax się budzi, a droga otwiera się dla wszystkich.',
});
export const followUpPl = (config, questId) => followUps(config, questId).map((q) => `„${QUESTBOOK_PL[q.id]?.title ?? q.id}”${q.id === 'snorlax-meet' ? ' — każdy gracz może potem spotkać Snorlaxa na trasie 12 i spróbować go złapać' : ''}`).join(' · ');

// The Plecak's 💿 TM tab: a disc is NEW while the player holds more of it than when they last opened the tab.
export function newTms(state, player) {
  const seen = state.tableUx?.seenTms?.[player.id] ?? {};
  return heldTms(state, player).filter((tm) => (player.tms[tm] ?? 0) > (seen[tm] ?? 0));
}
export function markTmsSeen(state, player) {
  const all = (bag(state).seenTms ??= {});
  all[player.id] = Object.fromEntries(heldTms(state, player).map((tm) => [tm, player.tms[tm]]));
}

// PLAYTEST_010 — the pictures of the table's world moments (PT010-05: „Drużyna wyleczona”, Team Rocket, „Cisza…”, a
// world event, a quest's moment) and of the Living Kanto 2.0 board cards, one per ARCHETYPE (PT010-03).
// Only ALIASES to approved art: data/sceneArt.js is the Studio's („Ilustracje kart” writes it; never edited from here) —
// an alias names a picture already there (SCENE_ART) or nothing (null). The Studio's OWN binding of a world moment / an
// archetype (SCENE_ART_WORLD / SCENE_ART_ARCHETYPE) is shown first (worldArt / archetypeArt below), the alias only after it.
// No picture at all → a PLACEHOLDER in the moment's (or the archetype's) own colour with its icon: never a broken image,
// never two archetypes alike.
import { SCENE_ART, SCENE_ART_DIR, sceneArtFor } from '../data/sceneArt.js';
import { EVENTS_BY_ID } from '../data/events.js';
import { STORY_SLOT_OF } from '../data/sceneSlots.js';
import { QUEST_VERSIONS } from '../engine/questVersions.js';
import { esc } from '../ui/dom.js';

// The world's moments: { art: an alias — an approved picture's id | null, icon, cls (the placeholder's colour) }.
export const WORLD_ART = Object.freeze({
  heal: { art: 'evt-nurse-joy-v2', icon: '❤', cls: 'heal' }, // Nurse Joy and Pikachu — the „Siostra Joy” event's picture
  rocket: { art: 'q-oak-rocket', icon: '🎈', cls: 'rocket' }, // Jessie, James, Meowth — the „Oak: Team Rocket” quest's picture
  quiet: { art: null, icon: '🍃', cls: 'quiet' }, // „Cisza… nic się nie dzieje” — no alias: its own picture world-quiet (SCENE_ART_WORLD)
  poison: { art: null, icon: '☠️', cls: 'poison' }, // poison on the map (Combat 2.1) — no alias: its own picture world-poison (SCENE_ART_WORLD)
  event: { art: null, icon: '❗', cls: 'event' }, // a world event without its picture
  quest: { art: null, icon: '📜', cls: 'quest' }, // a quest without its picture
  mission: { art: null, icon: '🎯', cls: 'card' }, // a mission card without its picture
});

// PT010-03: the 12 archetypes of the Living Kanto boards — one picture each. `art: null` = no alias: every one has its OWN
// picture, lk-<archetype> (Build 3.8.1 — data/sceneArt.js SCENE_ART_ARCHETYPE, shown by archetypeArt below); the icon on the
// archetype's own colour is only the placeholder when a picture is not there.
export const ARCHETYPE_ART = Object.freeze({
  'catch-species': { art: null, icon: '🔴', cls: 'a-catch-species' },
  'catch-type': { art: null, icon: '🔷', cls: 'a-catch-type' },
  'catch-biome': { art: null, icon: '🏞️', cls: 'a-catch-biome' },
  'deliver-pokemon': { art: null, icon: '🤝', cls: 'a-deliver-pokemon' },
  'deliver-item': { art: null, icon: '📦', cls: 'a-deliver-item' },
  'collect-resources': { art: null, icon: '🧺', cls: 'a-collect-resources' },
  'explore-places': { art: null, icon: '🗺️', cls: 'a-explore-places' },
  'observe-species': { art: null, icon: '👀', cls: 'a-observe-species' },
  'defeat-trainers': { art: null, icon: '🥊', cls: 'a-defeat-trainers' },
  'defeat-rocket': { art: null, icon: '🎈', cls: 'a-defeat-rocket' },
  'evolve-pokemon': { art: null, icon: '✨', cls: 'a-evolve-pokemon' },
  'complete-challenge': { art: null, icon: '🏆', cls: 'a-complete-challenge' },
});
// The archetypes' artIds (Studio „Ilustracje kart”: 600 × 800, 3 : 4, the art direction of the other cards). The Studio's
// „Zlecenia Living Kanto” saves each one (lk-<id>) and binds it in data/sceneArt.js SCENE_ART_ARCHETYPE — all 12 in the game since Build 3.8.1 (19.10).
export const ARCHETYPE_ART_WANTED = Object.freeze(Object.keys(ARCHETYPE_ART).map((id) => `lk-${id}`));

const urlOf = (artId) => (artId && SCENE_ART[artId] ? `${SCENE_ART_DIR}/${SCENE_ART[artId].file}` : null);

// One picture spec: { url | null, icon, cls } — `url` null means the placeholder.
// Studio 18.10 (ChatGPT 21:15): a picture the Studio saved for a world moment / an archetype (data/sceneArt.js
// SCENE_ART_WORLD / SCENE_ART_ARCHETYPE — „Zapisz w grze”) is shown at once; else the alias above; else the placeholder.
export const worldArt = (key) => ({ url: sceneArtFor('world', key)?.url ?? urlOf(WORLD_ART[key]?.art), icon: WORLD_ART[key]?.icon ?? '❗', cls: WORLD_ART[key]?.cls ?? 'event' });
export const archetypeArt = (id) => ({ url: sceneArtFor('archetype', id)?.url ?? urlOf(ARCHETYPE_ART[id]?.art), icon: ARCHETYPE_ART[id]?.icon ?? '📋', cls: ARCHETYPE_ART[id]?.cls ?? 'board' });
// A quest card's picture — THE one lookup for a quest's art on the table (the Journal, the quest notices, the rumour pop-up —
// ART-1: never sceneArtFor('quest', …) directly, a rumour or a card may hold a version's id), in this order:
//   1  its own (SCENE_ART_QUEST — a version too is a Studio target since ART-1);
//   2  PLAYTEST_016 PT016-07 / INDIGO A: a version (`replaces`) without its own — the picture of the quest it replaces (one step
//      back, like an event's `artOf`);
//   3  NIGHTSHIFT_014 C: its story line's (SCENE_ART_STORY: one picture for the line — the Dojo's two quests show the same);
//   else null (the card as today: the 📜 placeholder).
const REPLACED = Object.fromEntries(QUEST_VERSIONS.map((q) => [q.id, q.replaces]));
// ART-2: WHOSE picture a quest card shows — { kind, id, art } (kind 'quest' with the quest's own id: its own picture; else the
// card it inherits from), or null. `art` is the binding lookup (sceneArtFor; the Studio passes the same over the registry it
// shows): ONE order for the table (questArt) and the Studio's „dziedziczy: …” (tools/scene-art-core.js libraryRows).
export function questArtSource(id, art = sceneArtFor) {
  for (const [kind, from] of [['quest', id], ['quest', REPLACED[id]], ['story', STORY_SLOT_OF[id]]]) {
    const found = from ? art(kind, from) : null;
    if (found) return { kind, id: from, art: found };
  }
  return null;
}
export const questArt = (id) => questArtSource(id)?.art ?? null;
// NIGHTSHIFT_014 C: a world incident's picture (Piotr's — the Studio's „Incydenty świata”, data/sceneArt.js SCENE_ART_INCIDENT;
// pilot only: no set has incidents), else the placeholder with the incident's icon.
export const incidentArt = (id, icon = '🌍') => ({ url: sceneArtFor('incident', id)?.url ?? null, icon, cls: 'event' });
// A world event's picture: its own (the Studio's binding), else its `artOf`'s (rustling-backpack shows lost-backpack's until
// it has its own — ART-1: it is a Studio target, evt-rustling-backpack).
// ART-2: WHOSE picture an event card shows — { kind: 'event', id, art } (its own id, or its `artOf`'s), or null; `art` as questArtSource's.
export function eventArtSource(id, art = sceneArtFor) {
  for (const from of [id, EVENTS_BY_ID[id]?.artOf]) {
    const found = from ? art('event', from) : null;
    if (found) return { kind: 'event', id: from, art: found };
  }
  return null;
}
export const eventArt = (id) => ({ url: eventArtSource(id)?.art.url ?? null, icon: '❗', cls: 'event' });
// A Journal entry's picture (its quest / mission card art, a board card's archetype), or its placeholder.
export function entryArt(e, fallback = { icon: '📜', cls: 'quest' }) {
  if (e?.def?.lk?.archetype || e?.cardArt?.kind === 'archetype') return archetypeArt(e.def?.lk?.archetype ?? e.cardArt.id);
  const art = e?.cardArt ? (e.cardArt.kind === 'quest' ? questArt(e.cardArt.id) : sceneArtFor(e.cardArt.kind, e.cardArt.id)) : null;
  return { url: art?.url ?? null, icon: fallback.icon, cls: fallback.cls };
}

// The 3 : 4 picture or its placeholder (the class names are the caller's: one frame for every card that uses it).
export function artFrame(spec, cls = 'wa-art') {
  return spec.url
    ? `<div class="${cls}"><img src="${esc(spec.url)}" alt="" draggable="false"></div>`
    : `<div class="${cls} wa-ph ph-${esc(spec.cls)}"><span aria-hidden="true">${spec.icon}</span></div>`;
}

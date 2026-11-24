// PLAYTEST_007 stage 4 — the TRAINER JOURNAL („Dziennik Trenera”, ChatGPT night-shift handoff §6 + addendum §8).
// Piotr: the missions were spread over several screens (the 📜 book, the player popup's mission cards, the rumours).
// The Journal is ONE place — and a READ-ONLY PROJECTION of the data that already exists (the quest book's
// occurrences and records, the rumours heard, the two mission cards). It keeps no state and copies no progress:
// every action on an entry is a legal action of the engine, every reason is the engine's (questBookEngine.nextStep
// / takeBlock), every id is the real one (the occurrence 'safari-scyther#1', the rumour 'opp-scyther', the mission
// card's quest id). No new rule: availability is exactly today's.
//
// The UNIFIED ACTIVITY MODEL — one entry per thing a player does or could do:
//   activityId        'book:<occ>' · 'rumour:<rumourId>' · 'card:<questId>' · 'offer:<questId>' · 'record:<occ>'
//   sourceSystem      'questBook' | 'expedition' | 'rumour' | 'missionCard'
//   owner             the player's id
//   title, description, cardArt { kind: 'quest' | 'mission' | 'archetype', id } (worldArt.entryArt: an approved picture, or
//                     the tile's fallback; a Living Kanto board card: its archetype's — PT010-03)
//   currentStage, stages          (1-based for the table; 0 / 0 when it has none)
//   objectives        [{ text, progress, target, done, place, stage: 'past' | 'now' | 'later' }]
//   progress          { done, total } — objectives of the current stage (a mission card: its count)
//   destination       the place the NEXT step happens at, or null
//   availableActions  the engine's legal actions for it, now
//   blockedReason     why its next action is not open here and now ('' when it is, or when nothing waits)
//   blockedCode       the engine's code for it ('goTo' = only „not here”: the place says it already) or null
//   nextStep          what to do next, in one sentence
//   completionStatus  'heard' · 'available' · 'accepted' · 'inProgress' · 'ready' · 'completed' · 'abandoned'
//   section           'mine' · 'expeditions' · 'rumours' · 'available' · 'done'
//   rewardPreview     the reward, in words
//   since             the round it was taken (a book occurrence: startedRound; a mission card: acquiredRound) or null
// HEARD (a rumour) ≠ ACCEPTED (in the book, nothing done) ≠ IN PROGRESS ≠ READY (collect) ≠ COMPLETED.
import { EXPEDITIONS, STORY_QUESTS } from '../data/questBook.js';
import { getSpecies } from '../data/pokemon.js';
import { getLegalActions } from '../engine/turnEngine.js';
import { questCapOf, adventuresHeld, bookQuest, bookQuests, isDone, isSpecialQuest, maxActive, nextStep, objectiveProgress, objectiveTarget, questOf, questsHere, rewardLines, rumourSlotMax, takeBlock, usesQuestCap } from '../engine/questBookEngine.js';
import { getLocation } from '../data/locations.js';
import { offersHere, usesLivingKanto } from '../engine/livingKantoEngine.js';
import { swapReady, swapReadyWeek, usesQuestSwap } from '../engine/questSwapEngine.js';
import { rumourList, usesRumours } from '../engine/rumourEngine.js';
import { questLocations, questReward } from '../engine/questEngine.js';
import { QUESTS_BY_ID } from '../data/quests.js';
import { isFlyQuest } from '../engine/flyEngine.js';
import { isSurfQuest } from '../engine/surfEngine.js';
import { isBikeQuest } from '../engine/bikeEngine.js';
import { isCutQuest } from '../engine/cutEngine.js';
import { isCampaignQuest } from '../engine/rocketCampaignEngine.js';
import { isTmQuest } from '../engine/tmEngine.js';
import { isScoreQuest } from '../engine/scoreEngine.js';
import { QUESTBOOK_PL, bookStepPl, rumourPl, nextStepPl, offerBlockPl, offerStarsPl, offerTitlePl, offerWeekPl, placeName, questPl, rewardPl, takeBlockPl } from './content-pl.js';

export const JOURNAL_SECTIONS = Object.freeze([
  { key: 'mine', label: 'Moje misje' },
  { key: 'expeditions', label: 'Wyprawy' },
  { key: 'rumours', label: 'Plotki' },
  { key: 'available', label: 'Dostępne' },
  { key: 'done', label: 'Ukończone' },
]);
export const STATUS_PL = Object.freeze({ taken: 'ZABRANE', heard: 'USŁYSZANA', available: 'DOSTĘPNA', accepted: 'PRZYJĘTA', inProgress: 'W TRAKCIE', ready: 'GOTOWE — ODBIERZ', completed: 'UKOŃCZONA', abandoned: 'PORZUCONA' });

// PLAYTEST_008 (Piotr 15.10): the kind of an activity — the same on its Journal tile and on its HUD card
export const ACTIVITY_KINDS = Object.freeze({
  questBook: { cls: 'quest', label: 'Misja', icon: '📖' },
  missionCard: { cls: 'card', label: 'Karta misji', icon: '🎯' },
  expedition: { cls: 'exp', label: 'Wyprawa', icon: '🧭' },
  rumour: { cls: 'rumour', label: 'Plotka', icon: '📜' },
  board: { cls: 'board', label: 'Zlecenie', icon: '📋' }, // Living Kanto 2.0: a card from a Poké Stop board — PT010-08: its own colour
});
export const activityKind = (e) => (e.deck ? DECK_KINDS[e.deck] : ACTIVITY_KINDS[e.section === 'expeditions' ? 'expedition' : e.sourceSystem] ?? ACTIVITY_KINDS.questBook);

// PLAYTEST_016 PT016-03 (rules.twoDecks 'v1', a DEV pilot; Piotr: too many names, colours and systems): the family sees
// TWO decks — MISJE (everything taken or to take here: the two personal mission cards, Oak, the regional missions, the
// boards, the stories, the expeditions) and PLOTKI (what was heard and not taken yet). A rumour taken IS a mission (the
// quest book already holds it; its rumour entry is gone — never twice). One frame and colour per deck; the origin is a
// small tag only. The table only: every entry, action and reason is the engine's, as before.
export const usesTwoDecks = (config) => config.rules.twoDecks === 'v1';
// PLAYTEST_019 PT019-01: the field abilities' quests — the HM Lot (rules.fly), the HM Surf (rules.surf), the Dojo's TM
// (rules.tms 't2') — and their picture on the map / the hint
export const fieldQuestIcon = (id) => (isFlyQuest(id) ? '🪽' : isSurfQuest(id) ? '🌊' : isTmQuest(id) ? '💿' : isBikeQuest(id) ? '🚲' : isCutQuest(id) ? '✂️' : null); // + BIKE-1: the bike's voucher; CUT-1: the HM Cut
// UX-2311 (rules.ux, A4 — no emoji on the map): the same meanings as the game's icons (icons.js gi keys) for the map's marks
export const fieldQuestIconKey = (id) => (isFlyQuest(id) ? 'fly' : isSurfQuest(id) ? 'surf' : isTmQuest(id) ? 'tm' : isBikeQuest(id) ? 'bike' : isCutQuest(id) ? 'cut' : null);
const FIELD_QUEST_PL = (id) => (isFlyQuest(id) ? 'czeka HM Lot — z nim polecisz do miasta, w którym już byłeś' : isSurfQuest(id) ? 'czeka HM Surf — z nim popłyniesz nowymi trasami wodnymi' : id === 'bike-fanclub' ? 'czeka rower — raz na turę przejedziesz nim 3 pola za 2 akcje' : isBikeQuest(id) ? 'czeka kupon na rower — z rowerem przejedziesz dwa pola za jedną akcję' : isCutQuest(id) ? 'czeka HM Cut — z nim zetniesz krzaczki 🌳 z bonusem' : 'czeka płyta TM — uczy Pokémona nowego ruchu');
// PLAYTEST_021 (rules.questHints 'e1', a DEV pilot): the epic lines (Dojo, Porygon, Dratini, Lapras, Charizard, Venusaur,
// the Mewtwo story — scoreEngine.isScoreQuest) are told the same way, with a ⭐ — and one badge before they open, what
// they need („od 2 odznak”). The Dojo's two lines (one per player) are one hint.
export const usesQuestHints = (config) => config?.rules?.questHints === 'e1';
const EPIC_HINT_ICON = '⭐';
// UX-2211 (rules.ux 'u1', a DEV pilot of the table): a world incident's quest (`world` — „Śpiący Snorlax”) is told the same way —
// nobody found where it starts (PLAYTEST_022)
const usesUxHints = (config) => config?.rules?.ux === 'u1';
const hintIcon = (config, q) => fieldQuestIcon(q.id) ?? (isCampaignQuest(config, q.id) ? '🚩' : null) ?? (usesQuestHints(config) && isScoreQuest(q) ? EPIC_HINT_ICON : null) ?? (usesUxHints(config) && q.world === 'snorlaxAwake' ? '📜' : null); // + ROCKET-2; UX-2311 (A5): a quest's scroll, never the road block's 💤 R1.1: the city to free
const DOJO_TITLE = 'Mistrz Dojo: Hitmonlee albo Hitmonchan';
// Where such a quest can be taken by this player and is not taken yet, asked AS IF they stood at its place (the
// engine's takeBlock there: null = it can be taken) — so a quest finished, given up for good or taken by the Dojo's other
// line is never hinted again (PLAYTEST_021: before, a finished HM Lot quest came back as „Weź zadanie” away from Route
// 16). At its place the „Dostępne tutaj” offer (or the swap offer, with a full limit) says it instead. `full`: it waits
// until a place frees up; `soon`: an epic line one badge away (the badges it needs).
export function fieldQuestHints(state, player) {
  if (!player?.questBook) return [];
  const out = [];
  const groups = new Set();
  for (const q of bookQuests(state.config)) {
    const icon = hintIcon(state.config, q);
    if (!icon) continue;
    const epic = !fieldQuestIcon(q.id) && !isCampaignQuest(state.config, q.id);
    const here = player.location === q.takeAt;
    const need = q.unlock?.badges ?? 0;
    const locked = need > player.badges.length && !(q.unlock?.orWeek && state.turn.round >= q.unlock.orWeek);
    const b = takeBlock(state, { ...player, location: q.takeAt }, q);
    let kind = null;
    if (epic && locked) kind = need - player.badges.length === 1 && (!b || ['capFull', 'slotFull', 'needBadges'].includes(b.code)) ? 'soon' : null;
    else if (!b) kind = here ? null : 'take';
    else if (['capFull', 'slotFull'].includes(b.code)) kind = here ? null : 'full';
    if (!kind) continue;
    if (q.exclusive) {
      if (groups.has(q.exclusive)) continue;
      groups.add(q.exclusive);
    }
    const title = q.exclusive === 'dojo' ? DOJO_TITLE : titleOf(q.id);
    const what = q.world === 'snorlaxAwake' ? `Pan Fuji pomoże obudzić Snorlaxa, który śpi na drodze między trasą 11 a 12 — misja „${title}”` : epic ? `wielkie zadanie „${title}”` : isCampaignQuest(state.config, q.id) ? `Team Rocket rządzi miastem — misja „${title}” uwolni je dla wszystkich` : `${FIELD_QUEST_PL(q.id)} — misja „${title}”`;
    const when = kind === 'soon' ? ` — od ${need} odznak (masz ${player.badges.length})` : '';
    // UX-2311: `iconKey` — the map's icon (the Snorlax quest: a quest flag, never the sleepy road block's picture)
    const iconKey = fieldQuestIconKey(q.id) ?? (isCampaignQuest(state.config, q.id) ? 'rocket' : q.world ? 'quest.field' : 'star');
    out.push({ quest: q, place: q.takeAt, icon, iconKey, epic, full: kind === 'full', soon: kind === 'soon' ? need : null, title, text: `${icon} ${placeName(q.takeAt)}: ${what}${when}.` });
  }
  return out;
}
export const DECK_KINDS = Object.freeze({
  misje: { cls: 'quest', label: 'Misja', icon: '📖' },
  plotki: { cls: 'rumour', label: 'Plotka', icon: '📜' },
});
export const MISSION_TABS = Object.freeze([{ key: 'aktywne', label: 'Aktywne' }, { key: 'dostepne', label: 'Dostępne tutaj' }, { key: 'ukonczone', label: 'Ukończone' }]);
export const deckOf = (e) => (['rumour', 'hint'].includes(e.sourceSystem) && ['heard', 'abandoned'].includes(e.completionStatus) ? 'plotki' : 'misje'); // PT019-01: + an HM / TM quest's hint
export const missionTabOf = (e, cap = false) => (e.section === 'done' ? 'ukonczone' : e.section === 'available' ? 'dostepne' : cap && e.completionStatus === 'ready' ? 'doodbioru' : 'aktywne');
// PLAYTEST_017 PT017-02 (rules.questCap): a finished adventure waits under „Do odbioru” — it no longer takes a place
export const missionTabsFor = (config) => (usesQuestCap(config) ? [MISSION_TABS[0], { key: 'doodbioru', label: '🎁 Do odbioru' }, ...MISSION_TABS.slice(1)] : MISSION_TABS);
export function missionTag(e) {
  if (e.sourceSystem === 'missionCard') return 'Zwykła';
  const q = e.def ? null : bookQuest(e.questId);
  if (q?.epic) return 'Epicka';
  if (e.sourceSystem === 'expedition' || q?.legend || q?.special || q?.rumour || STORY_IDS.has(e.questId)) return 'Fabuła';
  return 'Miejsce'; // Oak's contracts, the authored and pack quests, the regional missions, the board cards: a place's quest
}

// KANTO WORLD DISTRIBUTION (rules.worldDist 'w1', PT014-07): what can be taken here, in groups — Professor Oak's contracts,
// the regional missions, the board's cards, the stories and epic lines, the other quests — and „Do odbioru” first in
// „Moje misje”. The table only sorts (nothing is hidden: every entry stays, with its own take button).
export const usesJournalGroups = (config) => config.rules.journalGroups === 'v1'; // KANTO WORLD re-review 25.10 §5: its own switch
export const JOURNAL_GROUPS = Object.freeze([
  { key: 'ready', label: '🎁 Do odbioru' },
  { key: 'oak', label: '🔬 Zlecenia Profesora Oaka' },
  { key: 'regional', label: '🗺️ Misje regionalne' },
  { key: 'board', label: '📋 Tablica zleceń' },
  { key: 'story', label: '📜 Historie i wielkie zadania' },
  { key: 'quest', label: '📖 Inne zadania' },
]);
export function groupOf(e) {
  if (e.completionStatus === 'ready') return 'ready';
  if (e.sourceSystem === 'board') return 'board';
  const q = e.questId ? bookQuest(e.questId) : null;
  if (q?.area) return 'regional';
  if (q?.giver === 'oak' && q.takeAt === 'pokeStop') return 'oak';
  if (q?.epic || q?.legend || q?.special) return 'story';
  return 'quest';
}

const isExpedition = (questId) => EXPEDITIONS.v1.some((q) => q.id === questId);
const STORY_IDS = new Set([...STORY_QUESTS.v1, ...STORY_QUESTS.v2].map((q) => q.id));
const titleOf = (questId) => QUESTBOOK_PL[questId]?.title ?? questId;

// UX-2 (NIGHTSHIFT, 19.10): a line whose Pokémon comes from an Expedition encounter says so beside any other reward
// (Smoczy szlak: „złapanie: Dratini (niepewne) + 💰2”, not only 💰2)
export const encounterHint = (q) => {
  const meet = q?.stages?.flatMap((st) => st.objectives).find((o) => o.kind === 'encounter');
  return meet ? `złapanie: ${getSpecies(meet.species).name} (niepewne)` : '';
};
function rewardOf(state, player, q) {
  const hint = encounterHint(q);
  if (hint && !q.reward.length) return hint;
  return [hint, rewardPl(rewardLines(state, player, q))].filter(Boolean).join(' + ');
}

// Every objective of a quest, past / now / later, with the occurrence's progress for the current stage.
function objectivesOf(player, q, a) {
  return q.stages.flatMap((st, si) => st.objectives.map((o, i) => {
    const when = !a ? (si === 0 ? 'now' : 'later') : si < a.stage ? 'past' : si === a.stage ? 'now' : 'later';
    const target = objectiveTarget(o);
    const progress = when === 'past' ? target : when === 'now' && a ? Math.min(target, objectiveProgress(player, a, o, i)) : 0;
    // PLAYTEST_006 C4: an expedition encounter that got away waits for a new trail (R2)
    const lost = when === 'now' && a?.lost?.[i];
    const text = lost ? `Poszukaj go jeszcze raz: eksploruj ${placeName(o.place)} (1×) — potem ${getSpecies(o.species).name} wróci` : bookStepPl(o, progress, target);
    return { text, progress, target, done: progress >= target, place: o.place ?? null, stage: when };
  }));
}

// PLAYTEST_017 C2: why an offer the limit stops can still be taken
const SWAP_WHY = 'Masz już komplet przygód — możesz oddać jedną nierozpoczętą i wziąć tę (🔄 zamiana raz na 4 tygodnie).';
const actionsFor = (legal, pred) => legal.filter(pred);

// The Journal of one player: { limits, entries }.
export function journal(state, player) {
  const legal = state.phase === 'turn' || state.phase === 'encounter' ? getLegalActions(state) : [];
  const mine = state.players[state.turn.playerIndex]?.id === player.id;
  const myLegal = mine ? legal : [];
  const entries = [];
  const book = player.questBook;
  const rumours = usesRumours(state.config) && player.rumours ? rumourList(state, player) : [];
  const rumourText = (questId) => {
    const r = rumours.find((x) => x.quest === questId);
    return r ? rumourPl(state.config, r.id) : QUESTBOOK_PL[questId]?.about ?? ''; // no rumour: the quest's own words, if it has them (SNORLAX-1 C)
  };
  // the quest book: what runs now
  for (const a of book?.active ?? []) {
    const q = questOf(a);
    const step = nextStep(state, player, a);
    const objectives = objectivesOf(player, q, a);
    const now = objectives.filter((o) => o.stage === 'now');
    const started = a.stage > 0 || now.some((o) => o.progress > 0);
    const acts = actionsFor(myLegal, (x) => x.occ === a.occ);
    entries.push({
      activityId: `book:${a.occ}`, sourceSystem: a.def ? 'board' : isExpedition(a.questId) ? 'expedition' : 'questBook', owner: player.id,
      questId: a.questId, occ: a.occ, ...(a.def ? { def: a.def } : {}),
      title: a.def ? `${offerTitlePl(a.def.lk)} ${offerStarsPl(a.def.lk)}` : titleOf(a.questId), giver: a.def ? `tablica w ${placeName(a.def.lk?.stop)}` : QUESTBOOK_PL[a.questId]?.giver ?? '', description: rumourText(a.questId),
      cardArt: a.def ? { kind: 'archetype', id: a.def.lk?.archetype } : { kind: 'quest', id: a.questId }, // PT010-03: a board card's picture is its archetype's
      currentStage: Math.min(a.stage + 1, q.stages.length), stages: q.stages.length,
      // UX-1 (NIGHTSHIFT, 19.10): a stage of ONE step counts that step (Pokonaj 3 trenerów → 0/3), not „0/1 steps”
      objectives, progress: now.length === 1 ? { done: now[0].progress, total: now[0].target } : { done: now.filter((o) => o.done).length, total: now.length },
      destination: step.place ?? null,
      availableActions: acts,
      blockedReason: step.block && step.block.code !== 'busy' ? nextStepPl(step, q) : '',
      blockedCode: step.block && step.block.code !== 'busy' ? step.block.code : null,
      nextStep: nextStepPl(step, q),
      completionStatus: isDone(a) ? 'ready' : started ? 'inProgress' : 'accepted',
      section: isExpedition(a.questId) ? 'expeditions' : 'mine',
      rewardPreview: rewardOf(state, player, q),
      since: a.startedRound ?? player.questRecords?.occ[a.occ]?.startedRound ?? null,
    });
  }
  // the two mission cards (the older system — still dealt in every game)
  for (const m of player.quests ?? []) {
    const q = questPl(m.questId);
    const count = q.count ?? 1;
    const progress = Math.min(m.progress ?? 0, count);
    const places = questLocations(m);
    entries.push({
      activityId: `card:${m.questId}`, sourceSystem: 'missionCard', owner: player.id, questId: m.questId,
      title: q.title, giver: q.giver ?? '', description: q.text ?? '', cardArt: { kind: 'mission', id: m.questId }, // PLAYTEST_008: its own picture
      currentStage: 0, stages: 0,
      objectives: [{ text: `${q.text ?? ''} (${progress}/${count})`, progress, target: count, done: progress >= count, place: places[0] ?? null, stage: 'now' }], // the progress as a book step says it
      progress: { done: progress, total: count },
      destination: places[0] ?? null, availableActions: [], blockedReason: '', blockedCode: null,
      nextStep: `${q.text ?? ''}${places.length ? ` — ${places.map(placeName).join(' / ')}` : ''}`,
      completionStatus: progress > 0 ? 'inProgress' : 'accepted', section: 'mine',
      rewardPreview: rewardPl(questReward(QUESTS_BY_ID[m.questId], state.config).filter((r) => r.type !== 'stars')),
      since: m.acquiredRound ?? null,
    });
  }
  // the rumours heard and not taken (or given up and allowed again)
  for (const r of rumours) {
    if (!['heard', 'abandoned'].includes(r.phase)) continue;
    const q = bookQuest(r.quest);
    const block = takeBlock(state, player, q);
    const take = actionsFor(myLegal, (x) => x.type === 'takeQuest' && x.quest === r.quest);
    entries.push({
      activityId: `rumour:${r.id}`, sourceSystem: 'rumour', owner: player.id, questId: r.quest, rumourId: r.id,
      title: titleOf(r.quest), giver: QUESTBOOK_PL[r.quest]?.giver ?? '', description: rumourPl(state.config, r.id),
      cardArt: { kind: 'quest', id: r.quest },
      currentStage: 0, stages: q.stages.length,
      objectives: objectivesOf(player, q, null), progress: { done: 0, total: q.stages[0].objectives.length },
      destination: r.start, availableActions: take,
      blockedReason: take.length ? '' : block?.code === 'goTo' ? '' : takeBlockPl(block),
      blockedCode: take.length || !block ? null : block.code,
      nextStep: take.length ? `Możesz wziąć to zadanie tutaj (${placeName(r.start)})` : `Weź zadanie w: ${placeName(r.start)}`,
      completionStatus: r.phase === 'abandoned' ? 'abandoned' : 'heard', section: isExpedition(r.quest) ? 'expeditions' : 'rumours',
      rewardPreview: rewardOf(state, player, q), since: null,
    });
  }
  // what can be taken HERE and now (not a rumour's quest already listed)
  const listed = new Set(entries.filter((e) => e.sourceSystem !== 'missionCard').map((e) => e.questId)); // before the records
  // PLAYTEST_019 PT019-01 (nobody saw „Dom przy Route 16”): an HM / TM quest is told from the start, as a rumour is — where
  // to take it, until it is taken (not here: the engine's 'goTo'; here it is the „Dostępne tutaj” offer below)
  for (const h of book ? fieldQuestHints(state, player) : []) {
    if (listed.has(h.quest.id)) continue;
    entries.push({
      activityId: `hint:${h.quest.id}`, sourceSystem: 'hint', owner: player.id, questId: h.quest.id,
      title: h.title, giver: QUESTBOOK_PL[h.quest.id]?.giver ?? '', description: h.text, cardArt: { kind: 'quest', id: h.quest.id },
      currentStage: 0, stages: h.quest.stages.length,
      objectives: objectivesOf(player, h.quest, null), progress: { done: 0, total: h.quest.stages[0].objectives.length },
      destination: h.place, availableActions: [], blockedReason: '', blockedCode: 'goTo',
      nextStep: h.soon ? `Od ${h.soon} odznak: weź zadanie w: ${placeName(h.place)}` : `Weź zadanie w: ${placeName(h.place)}${h.full ? ' — gdy zwolni się miejsce na przygodę' : ''}`, completionStatus: 'heard', section: 'rumours',
      rewardPreview: rewardOf(state, player, h.quest), since: null,
    });
  }
  for (const q of book ? questsHere(state, player) : []) {
    if (listed.has(q.id)) continue;
    entries.push({
      activityId: `offer:${q.id}`, sourceSystem: isExpedition(q.id) ? 'expedition' : 'questBook', owner: player.id, questId: q.id,
      title: titleOf(q.id), giver: QUESTBOOK_PL[q.id]?.giver ?? '', description: rumourText(q.id), cardArt: { kind: 'quest', id: q.id },
      currentStage: 0, stages: q.stages.length,
      objectives: objectivesOf(player, q, null), progress: { done: 0, total: q.stages[0].objectives.length },
      destination: player.location, availableActions: actionsFor(myLegal, (x) => x.type === 'takeQuest' && x.quest === q.id), blockedReason: '', blockedCode: null,
      nextStep: 'Możesz wziąć to zadanie tutaj', completionStatus: 'available', section: 'available',
      rewardPreview: rewardOf(state, player, q), since: null,
    });
  }
  // Living Kanto 2.0: the board where the player stands — its open cards (take one: free) and the „taken by …” stubs
  const board = usesLivingKanto(state.config) ? offersHere(state, player) : null;
  const nameOf = (pid) => state.players.find((p) => p.id === pid)?.name ?? pid;
  for (const c of board ? [...board.cards.filter((x) => x.id), ...board.specials, ...(board.field ?? [])] : []) { // E2: + the field cards here
    const o = state.livingKanto.offers[c.id];
    if (!o || (o.kind === 'standard' && o.takenBy === player.id)) continue; // mine: already listed as „mine”
    const take = actionsFor(myLegal, (x) => x.type === 'takeOffer' && x.quest === c.id);
    const swaps = actionsFor(myLegal, (x) => x.type === 'swapAdventure' && x.take === 'takeOffer' && x.quest === c.id); // PLAYTEST_017 C2
    const why = take.length ? '' : swaps.length ? SWAP_WHY : usesUxHints(state.config) && c.take?.reason === 'fromWeek' ? offerWeekPl(c.take.week) : offerBlockPl(c.take, nameOf); // UX-2311 (point 17): the week only — the Journal's start note says why
    entries.push({
      activityId: `board:${c.id}`, sourceSystem: 'board', owner: player.id, questId: c.id, def: o.quest,
      title: `${o.kind === 'standard' ? '' : '⭐ '}${offerTitlePl(o.quest.lk)} ${offerStarsPl(o.quest.lk)}`, giver: `tablica w ${placeName(o.stop ?? board.stop)}`, description: !o.postAt ? '' : o.quest.claimAt === o.stop ? `📋 Zlecenie w terenie — nagroda czeka w: ${placeName(o.stop)}` : `📋 Zlecenie z tablicy w ${placeName(o.stop)} — nagroda w dowolnym Poké Stopie`, // KANTO WORLD: a regional card keeps its own collecting place
      cardArt: { kind: 'archetype', id: o.quest.lk?.archetype }, currentStage: 0, stages: o.quest.stages.length,
      objectives: objectivesOf(player, o.quest, null), progress: { done: 0, total: o.quest.stages[0].objectives.length },
      destination: o.postAt ?? board.stop, availableActions: [...take, ...swaps], blockedReason: why, blockedCode: take.length ? null : c.take?.reason ?? null,
      nextStep: take.length ? (o.postAt ? `Weź to zlecenie tutaj — wisi do tygodnia ${o.expiresWeek}, nagroda ${o.quest.claimAt === o.stop ? `w: ${placeName(o.stop)}` : 'w dowolnym Poké Stopie'}` : `Weź to zlecenie tutaj — jest na tablicy do tygodnia ${o.expiresWeek}`) : why || (board.nextRefresh ? `Nowe zlecenia na tej tablicy: tydzień ${board.nextRefresh}` : ''),
      completionStatus: c.take?.reason === 'taken' ? 'taken' : 'available', section: 'available', // „taken by …”: a stub, not an offer
      rewardPreview: rewardPl(o.quest.reward), since: null,
    });
  }

  // NIGHTSHIFT_018 (rules.legendOffer): a late legend line shut by its window is still SEEN at its place — „Od tygodnia N”, nothing
  // to tap: rarer, never hidden from a child standing there
  for (const q of book ? bookQuests(state.config).filter((x) => x.rareOffer && x.takeAt === player.location) : []) {
    const block = takeBlock(state, player, q);
    if (block?.code !== 'fromWeek' || entries.some((e) => e.questId === q.id)) continue;
    entries.push({
      activityId: `offer:${q.id}`, sourceSystem: 'questBook', owner: player.id, questId: q.id,
      title: titleOf(q.id), giver: QUESTBOOK_PL[q.id]?.giver ?? '', description: rumourText(q.id), cardArt: { kind: 'quest', id: q.id },
      currentStage: 0, stages: q.stages.length,
      objectives: objectivesOf(player, q, null), progress: { done: 0, total: q.stages[0].objectives.length },
      destination: player.location, availableActions: [], blockedReason: takeBlockPl(block), blockedCode: 'fromWeek',
      nextStep: takeBlockPl(block), completionStatus: 'available', section: 'available',
      rewardPreview: rewardOf(state, player, q), since: null,
    });
  }

  // PLAYTEST_017 C2 (rules.questSwap): a quest here that only the limit stops — taken by giving back an unstarted adventure
  for (const quest of [...new Set(myLegal.filter((x) => x.type === 'swapAdventure' && x.take === 'takeQuest').map((x) => x.quest))]) {
    if (entries.some((e) => e.questId === quest && e.section === 'available')) continue;
    const q = bookQuest(quest);
    entries.push({
      activityId: `offer:${quest}`, sourceSystem: isExpedition(quest) ? 'expedition' : 'questBook', owner: player.id, questId: quest,
      title: titleOf(quest), giver: QUESTBOOK_PL[quest]?.giver ?? '', description: rumourText(quest), cardArt: { kind: 'quest', id: quest },
      currentStage: 0, stages: q.stages.length,
      objectives: objectivesOf(player, q, null), progress: { done: 0, total: q.stages[0].objectives.length },
      destination: player.location, availableActions: actionsFor(myLegal, (x) => x.type === 'swapAdventure' && x.take === 'takeQuest' && x.quest === quest), blockedReason: SWAP_WHY, blockedCode: 'capFull',
      nextStep: SWAP_WHY, completionStatus: 'available', section: 'available',
      rewardPreview: rewardOf(state, player, q), since: null,
    });
  }
  // … and which adventure each swap gives back (its title, for the button)
  const titleByOcc = Object.fromEntries(entries.filter((e) => e.occ).map((e) => [e.occ, e.title]));
  for (const e of entries) {
    const swaps = e.availableActions.filter((x) => x.type === 'swapAdventure');
    if (swaps.length) e.swapGives = swaps.map((x) => ({ action: x, title: titleByOcc[x.give] ?? x.give }));
  }

  // finished and given up (the records — the real occurrence ids)
  for (const [occ, rec] of Object.entries(player.questRecords?.occ ?? {})) {
    if (book.active.some((a) => a.occ === occ) || (book.trials ?? []).some((t) => t.occ === occ)) continue;
    const questId = occ.split('#')[0];
    const lkc = state.livingKanto?.contracts?.[player.id]?.find((c) => c.occ === occ) ?? null; // Living Kanto 2.0: a board card's record
    const q = lkc ? { stages: [{ objectives: [] }], reward: lkc.paid ?? [], giver: 'board' } : bookQuest(questId);
    if (!q || q.giver === 'gym') continue;
    const status = rec.claimedRound != null ? 'completed' : rec.abandonedRound != null ? 'abandoned' : null;
    if (!status) continue;
    entries.push({
      activityId: `record:${occ}`, sourceSystem: lkc ? 'board' : isExpedition(questId) ? 'expedition' : 'questBook', owner: player.id, questId, occ,
      title: lkc ? `${offerTitlePl(lkc.lk)} ${offerStarsPl(lkc.lk)}` : titleOf(questId), giver: lkc ? `tablica w ${placeName(lkc.lk?.stop)}` : QUESTBOOK_PL[questId]?.giver ?? '', description: '', cardArt: lkc ? { kind: 'archetype', id: lkc.lk?.archetype } : { kind: 'quest', id: questId },
      currentStage: q.stages.length, stages: q.stages.length, objectives: [], progress: { done: 0, total: 0 },
      destination: null, availableActions: [], blockedReason: '', blockedCode: null,
      nextStep: status === 'completed' ? `Ukończona w tygodniu ${rec.claimedRound}` : `Porzucona w tygodniu ${rec.abandonedRound}`,
      completionStatus: status, section: 'done', rewardPreview: status === 'completed' ? (lkc ? rewardPl(lkc.paid ?? []) : rewardOf(state, player, q)) : '', since: rec.startedRound ?? null,
    });
  }
  const rumourSlot = (book?.active ?? []).filter((a) => isSpecialQuest(questOf(a))).length; // a rumour, the expedition, an LK ★★★
  if (usesTwoDecks(state.config)) for (const e of entries) Object.assign(e, { deck: deckOf(e), tag: deckOf(e) === 'misje' ? missionTag(e) : null }); // PT016-03
  return {
    limits: {
      book: { used: (book?.active ?? []).length - rumourSlot, max: maxActive(state.config) },
      rumour: { used: rumourSlot, max: Number.isFinite(rumourSlotMax(state.config)) ? rumourSlotMax(state.config) : null }, // K-07: null = no limit
      cards: { used: (player.quests ?? []).length, max: state.config.quests?.maxActive ?? 2 },
      // PLAYTEST_017 PT017-02: the one limit — the personal missions + the adventures not yet done (of QUEST_CAP)
      ...(usesQuestCap(state.config) ? { cap: { adventures: adventuresHeld(player).length, max: questCapOf(state.config), personal: (player.quests ?? []).length, total: (player.quests ?? []).length + adventuresHeld(player).length, totalMax: (state.config.quests?.maxActive ?? 2) + questCapOf(state.config),
        // PLAYTEST_017 C2: the swap — ready now, or the week it comes back
        ...(usesQuestSwap(state.config) ? { swap: { ready: swapReady(state, player), week: swapReadyWeek(player) } } : {}) } } : {}),
    },
    entries,
  };
}

// UX-2311 (PLAYTEST_023 A7, points 16–17; rules.ux): where an activity comes from — ONE small tag instead of a paragraph (its
// giver's kind, read from the entry and its quest's own data), and, for what can be taken here, where exactly it is offered
// and whether only here. Words only: the entries, their actions and reasons stay the engine's.
export function originOf(state, e) {
  const tag = (key, label) => ({ key, label });
  if (e.sourceSystem === 'missionCard') return tag('personal', 'misja osobista');
  if (e.sourceSystem === 'board') return state.livingKanto?.offers?.[e.questId]?.postAt ? tag('field', 'zlecenie w terenie') : tag('board', 'zlecenie z tablicy');
  if (e.sourceSystem === 'rumour') return tag('rumour', 'plotka');
  if (e.sourceSystem === 'expedition') return tag('expedition', 'wyprawa');
  const q = e.questId ? bookQuest(e.questId) : null;
  if (!q) return tag('quest', 'misja');
  if (isCampaignQuest(state.config, q.id)) return tag('rocket', 'Team Rocket');
  if (isFlyQuest(q.id) || isSurfQuest(q.id) || isCutQuest(q.id)) return tag('hm', 'misja z HM');
  if (isBikeQuest(q.id)) return tag('bike', 'misja: rower');
  if (isTmQuest(q.id)) return tag('tm', 'misja: płyta TM');
  if (q.legend) return tag('legend', 'legenda');
  if (q.epic) return tag('epic', 'wielkie zadanie');
  if (q.rumour) return tag('rumour', 'z plotki');
  if (q.area) return tag('regional', 'misja regionalna');
  if (q.giver === 'oak') return tag('oak', 'zlecenie Profesora Oaka');
  const type = getLocation(q.takeAt)?.type;
  return type === 'route' ? tag('route', 'zlecenie z trasy') : type === 'special' ? tag('place', 'zlecenie z okolicy') : tag('city', 'zlecenie z miasta');
}
// „Dostępne tutaj”: where this offer comes from and whether it is only here ('' when the entry is not one to take here)
export function herePl(state, player, e) {
  if (e.sourceSystem === 'board') {
    const o = state.livingKanto?.offers?.[e.questId];
    if (!o) return '';
    return o.postAt === player.location ? `Z tablicy w ${placeName(o.stop)} — wisi tylko tutaj, w terenie` : `Z tablicy w ${placeName(o.stop ?? player.location)}`; // a field card elsewhere: its reason says where
  }
  if (e.sourceSystem === 'rumour') return `Plotka — zaczyna się tutaj: ${placeName(e.destination)}`;
  const q = e.questId ? bookQuest(e.questId) : null;
  if (!q) return '';
  if (q.takeAt === 'pokeStop') return q.giver === 'oak' ? `Od Profesora Oaka — tutaj: ${placeName(player.location)}` : `W Poké Stopie — tutaj: ${placeName(player.location)}`;
  return `Tylko tutaj: ${placeName(q.takeAt)}`;
}

// The HUD's small activity cards next to the profile (ChatGPT review 15.10, P1): every ACTIVE activity of the Journal —
// a quest of the book (a taken rumour's too), an expedition, a mission card, a Living Kanto board card — on equal terms:
// none is left out for coming from the older system. Not shown: finished, given up, offers and rumours not taken. Never
// twice. Order: 1 an action here and now (giving up does not count) · 2 a reward to collect · 3 started (a mission card:
// progress > 0) · 4 the rest taken; equal → the one taken first (its round), then by title — the same for every system.
// PLAYTEST_010 (PT010-08, Piotr: four missions, the HUD showed three): no limit any more — the HUD scrolls (hudCarousel);
// `n` stays for a caller that wants the first few.
const HUD_RANK = { ready: 1, inProgress: 2, accepted: 3 };
function activeOf(entries) {
  const rank = (e) => (e.availableActions.some((a) => a.type !== 'abandonQuest') ? 0 : HUD_RANK[e.completionStatus]);
  const seen = new Set();
  return entries
    .filter((e) => ['mine', 'expeditions'].includes(e.section) && HUD_RANK[e.completionStatus] !== undefined)
    .filter((e) => !seen.has(e.activityId) && seen.add(e.activityId))
    .map((e) => ({ e, r: rank(e) }))
    .sort((a, b) => a.r - b.r || (a.e.since ?? 0) - (b.e.since ?? 0) || a.e.title.localeCompare(b.e.title, 'pl') || a.e.activityId.localeCompare(b.e.activityId))
    .map((x) => x.e);
}
export function hudActivities(state, player, n = null) {
  const all = activeOf(journal(state, player).entries);
  return n === null ? all : all.slice(0, n);
}
// PT010-08: the HUD's carousel and the mission window's ‹ › — every active activity (in the order above), then the rumours
// HEARD and not taken yet (status USŁYSZANA: not active — they take no slot, K-07 unchanged), in the Journal's order.
export function hudCarousel(state, player) {
  const { entries } = journal(state, player);
  return [...activeOf(entries), ...entries.filter((e) => e.completionStatus === 'heard')];
}

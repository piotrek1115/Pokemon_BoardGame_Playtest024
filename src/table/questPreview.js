// UX-2311 (ChatGPT 23.11 „POST-PLAYTEST 023” A8 / owner point 21; rules.ux 'u1' — a DEV pilot of the table): PREVIEW FIRST.
// No way of taking a quest takes it at once any more: the Journal's tiles and detail, the HUD's „Weź zadanie” chips, the
// „📋 … do wzięcia” chip, a map card's button — each opens ONE small card first (main.js ui.questPreview, drawn in the notice
// layer as the ride's preview is): the title, where it comes from, the first step and its place, the reward the Journal already
// shows (never anything hidden), the free places for adventures now and after taking, and for a swap which adventure goes back
// and when the next swap comes. „Weź zadanie” is the only button that dispatches — the very legal action (getLegalActions),
// looked up again at the tap: a game that changed under the card shows the engine's reason instead (takeBlockPl /
// offerBlockPl) and takes nothing. After the take the same card says what was accepted and its next step (no extra tap to
// find out). Presentation only: the engine, the actions and the save are the same with or without it; without `ux` every take
// stays the old one-tap button.
import { esc } from '../ui/dom.js';
import { actionKey, getLegalActions } from '../engine/turnEngine.js';
import { currentPlayer } from '../engine/gameState.js';
import { adventuresHeld, bookQuest, objectiveTarget, questOf, rewardLines, takeBlock } from '../engine/questBookEngine.js';
import { offerBlock } from '../engine/livingKantoEngine.js';
import { SWAP_COOLDOWN, isStoryLine, swapReady, swapReadyWeek, untouched, usesQuestSwap } from '../engine/questSwapEngine.js';
import { REWARD_TOKEN_TYPES, rewardTokens } from './cards.js';
import { artFrame, entryArt } from './worldArt.js';
import { activityKind, encounterHint, herePl, journal, originOf } from './journal.js';
import { QUESTBOOK_PL, SWAP_LABEL_PL, SWAP_NONE_PL, SWAP_STORY_PL, bookStepPl, capFreeOf, capacityPl, offerBlockPl, offerStarsPl, offerTitlePl, offerWeekPl, placeName, rewardPl, swapGoPl, swapPl, takeBlockPl } from './content-pl.js';
import { gi } from './icons.js';
import { trackButton, usesUx } from './tracker.js';

export const TAKE_TYPES = new Set(['takeQuest', 'takeOffer', 'swapAdventure']);
export const usesQuestPreview = (config) => usesUx(config);
// The button that opens the preview carries the take exactly as getLegalActions gave it (the same JSON as a data-act would)
export const takeAttr = (action) => `data-ui="quest-preview" data-take="${esc(JSON.stringify(action))}"`;
export function parseTake(raw) {
  try {
    const a = JSON.parse(raw ?? '');
    return a && TAKE_TYPES.has(a.type) ? a : null;
  } catch {
    return null;
  }
}
// The take as it is legal NOW (the same key) — or null
export function liveTake(state, action) {
  if (!action || !TAKE_TYPES.has(action.type) || state.phase !== 'turn') return null;
  const key = actionKey(action);
  return getLegalActions(state).find((a) => TAKE_TYPES.has(a.type) && actionKey(a) === key) ?? null;
}

const takesOffer = (a) => a.type === 'takeOffer' || (a.type === 'swapAdventure' && a.take === 'takeOffer');
// the quest the take would put in the book: a board card's own quest, or the quest book's
function questOfTake(state, action) {
  if (takesOffer(action)) {
    const o = state.livingKanto?.offers?.[action.quest];
    return o ? { q: o.quest, offer: o, title: `${offerTitlePl(o.quest.lk)} ${offerStarsPl(o.quest.lk)}` } : null;
  }
  const q = bookQuest(action.quest);
  return q ? { q, offer: null, title: QUESTBOOK_PL[q.id]?.title ?? q.id } : null;
}
// its Journal entry (not taken yet: the offer, the rumour, the hint)
const entryOfTake = (J, action) => (takesOffer(action)
  ? J.entries.find((e) => e.activityId === `board:${action.quest}`)
  : J.entries.find((e) => e.questId === action.quest && !e.occ && e.section !== 'done')) ?? null;

// The reward as the Journal's tile shows it (public by design): the item tokens, in words what has no token
function rewardHtml(state, player, t) {
  const lines = t.offer ? t.q.reward ?? [] : rewardLines(state, player, t.q);
  const hint = t.offer ? '' : encounterHint(t.q);
  const words = lines.filter((r) => !REWARD_TOKEN_TYPES.has(r.type));
  if (!lines.length && !hint) return '';
  return `${hint ? `<span>${esc(hint)}</span> ` : ''}${rewardTokens(lines.filter((r) => REWARD_TOKEN_TYPES.has(r.type)))}${words.length ? ` <span>${esc(rewardPl(words))}</span>` : ''}`;
}
// The adventures' places as tokens: taken ● / free ○ (the one a take would fill: `next`)
export function capSlots(cap, fill = 0) {
  const held = Math.min(cap.adventures, cap.max);
  return `<span class="cap-slots" aria-hidden="true">${Array.from({ length: cap.max }, (_, i) => `<i class="${i < held ? 'on' : i < held + fill ? 'next' : ''}"></i>`).join('')}</span>`;
}

// Why the take cannot happen now — the engine's own reason, in the Journal's words
export function takeBlockedPl(state, action) {
  const player = currentPlayer(state);
  if (state.phase !== 'turn' || player.controller === 'ai') return 'Teraz nie można brać zadań.';
  if (action.type === 'swapAdventure') {
    if (!swapReady(state, player)) return `🔄 Następna zamiana od tygodnia ${swapReadyWeek(player)}.`;
    if (!player.questBook?.active.some((a) => a.occ === action.give)) return 'Tej przygody już nie ma w Dzienniku — nie można jej oddać.';
  }
  const nameOf = (pid) => state.players.find((p) => p.id === pid)?.name ?? pid;
  if (takesOffer(action)) {
    const b = offerBlock(state, player, action.quest);
    return (b?.reason === 'fromWeek' ? offerWeekPl(b.week) : offerBlockPl(b, nameOf)) || 'Tego zlecenia nie można teraz wziąć.';
  }
  const q = bookQuest(action.quest);
  const b = q ? takeBlock(state, player, q) : null;
  return (b?.code === 'active' ? 'To zadanie już jest w Twoim Dzienniku.' : takeBlockPl(b)) || 'Tego zadania nie można teraz wziąć.';
}

// Review 23.11 (4) — the SWAP right on a take the one limit stops (PLOTKI's rumour, its detail, its preview, the HUD's chip): the
// player never has to look for it under MISJE › Dostępne tutaj. `take` { type: 'takeQuest' | 'takeOffer', quest } →
//   { action, gives }  the engine's legal swapAdventure for it NOW (getLegalActions — the first give; the preview picks another)
//   { go: place }      possible only at its start place: the engine's own check asked there — say where to travel, no action
//   { why }            which of the engine's swap checks stops it, in its order (questSwapEngine.adventureSwapActions): the
//                      cooldown week (swapReadyWeek), nothing unstarted (untouched), a story only for a story (isStoryLine), the
//                      quest's own reason (takeBlock with the one place more) — the words only, never a rule of the table
//   null               no limit stops it, no swap in this game, not this player's turn
// Only `action` is ever enabled — and it IS the legal action.
export function swapOption(state, player, take) {
  if (!usesQuestSwap(state.config) || !player?.questBook || player.controller === 'ai' || state.phase !== 'turn' || currentPlayer(state).id !== player.id) return null;
  const book = take.type === 'takeQuest';
  const q = book ? bookQuest(take.quest) : null;
  if (book ? !q || takeBlock(state, player, q)?.code !== 'capFull' : offerBlock(state, player, take.quest)?.reason !== 'capFull') return null;
  const legal = getLegalActions(state).filter((a) => a.type === 'swapAdventure' && a.take === take.type && a.quest === take.quest);
  if (legal.length) return { action: legal[0], gives: legal.length };
  if (!swapReady(state, player)) return { why: swapPl({ ready: false, week: swapReadyWeek(player) }) };
  const gives = adventuresHeld(player).filter((a) => untouched(state, player, a));
  if (!gives.length) return { why: SWAP_NONE_PL };
  if (!gives.some((g) => !isStoryLine(questOf(g)) || (book && isStoryLine(q)))) return { why: SWAP_STORY_PL };
  if (book) {
    const b = takeBlock(state, player, q, { spare: 1 });
    if (b?.code === 'goTo') {
      const there = takeBlock(state, { ...player, location: b.place }, q, { spare: 1 });
      return there ? { why: takeBlockPl(there) || takeBlockedPl(state, take) } : { go: b.place };
    }
    if (b) return { why: takeBlockPl(b) || takeBlockedPl(state, take) };
  }
  return { why: takeBlockedPl(state, take) };
}
// Its parts for a screen: the button (enabled = the legal swap → its preview; disabled with the reason beside it) and the note
export function swapParts(opt, cls = '', label = `🔄 ${SWAP_LABEL_PL}`) {
  if (!opt) return { btn: '', note: '' };
  if (opt.action) return { btn: `<button class="qp-swapbtn ${cls}" ${takeAttr(opt.action)}>${label}</button>`, note: '' };
  if (opt.go) return { btn: '', note: `<p class="qp-swapgo">${gi('here')} ${esc(swapGoPl(opt.go))}</p>` };
  return { btn: `<button class="qp-swapbtn ${cls}" disabled aria-disabled="true">${label}</button>`, note: `<p class="qp-swapwhy">${esc(opt.why)}</p>` };
}
// the take a Journal entry not taken yet stands for (a book quest — a rumour, a hint, an offer —, or a board card)
export const takeOfEntry = (e) => (e?.questId && !e.occ && ['heard', 'available', 'abandoned'].includes(e.completionStatus) ? { type: e.sourceSystem === 'board' ? 'takeOffer' : 'takeQuest', quest: e.questId } : null);

// The preview card. `qp`: main.js ui.questPreview — { action, taking }.
export function questPreviewCard(state, qp) {
  const player = currentPlayer(state);
  const action = qp.action;
  const live = liveTake(state, action);
  const t = questOfTake(state, action);
  const J = journal(state, player);
  const e = entryOfTake(J, action);
  const title = e?.title ?? t?.title ?? action.quest;
  const origin = e ? originOf(state, e) : null;
  const from = e && live ? herePl(state, player, e) : '';
  const art = e ? entryArt(e, { icon: activityKind(e).icon, cls: activityKind(e).cls }) : null;
  // the first step (a quest not taken: its first stage), where it happens, and where the reward waits
  const stage = t?.q.stages?.[0]?.objectives ?? [];
  const steps = stage.slice(0, 3).map((o) => `<li>${esc(bookStepPl(o, 0, objectiveTarget(o)))}</li>`).join('');
  const more = (t?.q.stages?.length ?? 0) > 1 ? `<small class="qp-stages">To 1. z ${t.q.stages.length} etapów — kolejne zobaczysz w Dzienniku.</small>` : '';
  const place = stage.find((o) => o.place)?.place ?? null;
  const claim = t?.q.claimAt ? (t.q.claimAt === 'pokeStop' ? 'w dowolnym Poké Stopie' : t.q.claimAt !== place ? placeName(t.q.claimAt) : '') : '';
  const reward = t ? rewardHtml(state, player, t) : '';
  const row = (label, body) => (body ? `<div class="qp-row"><small>${label}</small><div>${body}</div></div>` : '');
  // the places for adventures: now → after the take (a swap: one goes back, one comes)
  const cap = J.limits.cap;
  const swap = action.type === 'swapAdventure';
  const capHtml = cap
    ? `<div class="qp-cap"><span class="qp-cap-now">${esc(capacityPl(cap))}</span>${capSlots(cap, swap ? 0 : 1)}<small class="qp-cap-after">${swap ? 'Po zamianie bez zmian: jedna przygoda wraca, ta przychodzi.' : `Po wzięciu: ${Math.max(0, capFreeOf(cap) - 1)}/${cap.max} wolne.`}</small></div>`
    : `<div class="qp-cap"><span>Misje z księgi: ${J.limits.book.used}/${J.limits.book.max}</span></div>`;
  let swapHtml = '';
  if (swap) {
    const titleOf = (occ) => J.entries.find((x) => x.occ === occ)?.title ?? occ;
    const gives = live ? getLegalActions(state).filter((a) => a.type === 'swapAdventure' && a.take === action.take && a.quest === action.quest) : [];
    const pick = gives.length > 1 ? `<div class="qp-gives" role="group" aria-label="Którą przygodę oddać?"><small>Którą oddać?</small>${gives.map((g) => `<button class="qp-give${g.give === action.give ? ' on' : ''}" ${takeAttr(g)} aria-pressed="${g.give === action.give}">${esc(titleOf(g.give))}</button>`).join('')}</div>` : '';
    swapHtml = `<p class="qp-swap">🔄 Oddajesz: <b>„${esc(titleOf(action.give))}”</b> — nierozpoczętą, bez nagrody.</p>${pick}<p class="qp-swap-next">Następna zamiana od tygodnia ${state.turn.round + SWAP_COOLDOWN}.</p>`;
  }
  const after = [
    e?.sourceSystem === 'rumour' ? 'Plotka stanie się misją.' : '',
    t?.offer && t.offer.kind !== 'expedition' ? 'Inni gracze już go nie wezmą.' : '',
  ].filter(Boolean).join(' ');
  const blocked = live ? '' : takeBlockedPl(state, action);
  const sw = !live && !swap ? swapParts(swapOption(state, player, action), 'big') : { btn: '', note: '' }; // review (4): the swap, right here
  const kind = e ? activityKind(e).cls : 'quest';
  return `<div class="notice-card quest-preview k-${esc(kind)}" role="dialog" aria-label="Podgląd zadania: ${esc(title)}">
    <div class="qp-head">${art ? artFrame(art, 'qp-art') : ''}<div class="qp-title">${origin ? `<span class="qp-origin o-${esc(origin.key)}">${esc(origin.label)}</span>` : ''}<h2>${esc(title)}</h2>${from ? `<small class="qp-from">${gi('here')} ${esc(from)}</small>` : ''}</div></div>
    <div class="qp-rows">${row('Cel', steps ? `<ul class="qp-steps">${steps}</ul>${more}` : '')}${row('Gdzie', `${gi('here')} ${esc(place ? placeName(place) : 'dowolne miejsce')}${claim ? ` <small>· nagroda: ${esc(claim)}</small>` : ''}`)}${row('Nagroda', reward)}</div>
    ${capHtml}${swapHtml}${after ? `<p class="qp-after">${esc(after)}</p>` : ''}
    ${blocked ? `<p class="qp-blocked" role="alert">${esc(blocked)}</p>` : ''}${sw.note}${sw.btn ? `<div class="row center qp-swaprow">${sw.btn}</div>` : ''}
    <div class="row center qp-btns"><button class="primary big qp-take" data-ui="quest-take"${!live || qp.taking ? ' disabled' : ''}>${gi('missions')} Weź zadanie</button><button class="ghost qp-cancel" data-ui="quest-cancel">Anuluj</button></div>
  </div>`;
}

// After the take (main.js perform): what was accepted, its next step and the places left — the same card, no extra tap
export function acceptedOf(before, after, action) {
  const pid = before.players[before.turn.playerIndex]?.id;
  const pb = before.players.find((p) => p.id === pid);
  const pa = after.players.find((p) => p.id === pid);
  if (!pa?.questBook || !pb?.questBook) return null;
  const fresh = pa.questBook.active.find((a) => !pb.questBook.active.some((x) => x.occ === a.occ));
  const J = journal(after, pa);
  const e = fresh ? J.entries.find((x) => x.occ === fresh.occ) ?? null : null;
  const gave = action.type === 'swapAdventure' ? journal(before, pb).entries.find((x) => x.occ === action.give)?.title ?? action.give : null;
  return {
    player: pid, activityId: e?.activityId ?? null, title: e?.title ?? questOfTake(before, action)?.title ?? action.quest,
    origin: e ? originOf(after, e).label : '', next: (e?.nextStep ?? '').replace(/^Teraz: /, ''), cap: J.limits.cap ?? null,
    gave, swapWeek: gave ? swapReadyWeek(pa) : null,
  };
}
export function acceptedCard(state, acc) {
  const owner = state.players.find((p) => p.id === acc.player);
  const e = acc.activityId && owner ? journal(state, owner).entries.find((x) => x.activityId === acc.activityId) : null;
  const track = e ? trackButton(state, owner, e) : '';
  return `<div class="notice-card quest-preview qp-accepted" role="status">
    <h2>${gi('done')} Przyjęte: ${esc(acc.title)}</h2>${acc.origin ? `<span class="qp-origin">${esc(acc.origin)}</span>` : ''}
    ${acc.next ? `<p class="qp-next"><b>Następny krok:</b> ${esc(acc.next)}</p>` : ''}
    ${acc.gave ? `<p class="qp-swap">🔄 Oddane: „${esc(acc.gave)}”. Następna zamiana od tygodnia ${acc.swapWeek}.</p>` : ''}
    ${acc.cap ? `<div class="qp-cap"><span>${esc(capacityPl(acc.cap))}</span>${capSlots(acc.cap)}</div>` : ''}
    <div class="row center qp-btns"><button class="primary qp-ok" data-ui="quest-accepted-ok">OK</button>${track}</div>
  </div>`;
}

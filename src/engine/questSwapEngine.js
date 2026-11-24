// PLAYTEST_017 C2 (rules.questSwap 'c2', a DEV pilot together with questCap 'c6' — ChatGPT 30.10 20:06 „C2 APPROVED AS DESIGN
// BASIS”, Piotr's GO 30.10 20:10; docs/playtest/PLAYTEST_017_BUILD_3_11.md §2.7–§2.10): with the one limit full (2 personal
// mission cards + 4 adventures), standing at a NEW offer the player may give back ONE UNSTARTED adventure and take the offer
// at once — no Poké Stop needed; the next swap only 4 weeks after the last one (a real cooldown, per player).
//   unstarted   stage 0 and NOTHING recorded on the attempt — no step, no place visited, no wait, no battle credited, no key
//               item — and taken in an earlier week (taking a quest itself changes nothing lasting: takeQuest only records
//               the attempt)
//   a story     (an epic or a legend line) is given back only for a story
//   the given   goes as a give-up (questBookEngine.abandonQuest: no reward; a board card is gone for good, a rumour stays
//               heard and may be taken again while it is open)
// Heard rumours and finished adventures waiting to be collected stay outside the limit (PT017-02). Only a swap that frees
// exactly the one place the offer needs (a game holding more than the limit keeps everything, nothing new). The AI (v2e,
// frozen) never swaps (aiEngine.chooseAction leaves it out, as the board's takes). Not the shop's mission-card swap (questEngine.swapQuest). Older rulesets: none of this.
import { abandonQuest, adventuresHeld, bookQuests, isDone, questCapOf, questOf, takeBlock, takeQuest, usesQuestCap } from './questBookEngine.js';
import { offersBlockedByCap, takeOffer } from './livingKantoEngine.js';
import { currentPlayer } from './gameState.js';
import { log } from './log.js';

export const SWAP_COOLDOWN = 4;
export const usesQuestSwap = (config) => config.rules.questSwap === 'c2' && usesQuestCap(config);
// The first week this player may swap again (null: never swapped — free now)
export const swapReadyWeek = (player) => (player.questBook?.swapRound == null ? null : player.questBook.swapRound + SWAP_COOLDOWN);
export const swapReady = (state, player) => (swapReadyWeek(player) ?? 0) <= state.turn.round;
export const isStoryLine = (q) => Boolean(q?.legend) || Boolean(q?.epic && !q?.area);

// An adventure with nothing done on it — the only kind that may be given back
export function untouched(state, player, a) {
  if (isDone(a) || a.stage !== 0 || (a.startedRound ?? state.turn.round) >= state.turn.round) return false;
  const rec = player.questRecords?.occ?.[a.occ] ?? {};
  return !Object.values(a.progress ?? {}).some((v) => Number(v) > 0)
    && !Object.values(a.places ?? {}).some((x) => x?.length)
    && !(a.waited > 0)
    && !Object.values(rec.credited ?? {}).some((x) => x?.length)
    && !(rec.keys?.length);
}

// The legal swaps here and now: { type: 'swapAdventure', give: <occ given back>, take: 'takeQuest' | 'takeOffer', quest: <id> }
export function adventureSwapActions(state, player) {
  if (state.phase !== 'turn' || !usesQuestSwap(state.config) || !swapReady(state, player)) return [];
  if (adventuresHeld(player).length < questCapOf(state.config)) return []; // room: an ordinary take
  const gives = adventuresHeld(player).filter((a) => untouched(state, player, a));
  if (!gives.length) return [];
  const out = [];
  for (const q of bookQuests(state.config)) {
    if (takeBlock(state, player, q)?.code !== 'capFull' || takeBlock(state, player, q, { spare: 1 }) !== null) continue; // only the limit stops it
    for (const g of gives) if (g.questId !== q.id && (!isStoryLine(questOf(g)) || isStoryLine(q))) out.push({ type: 'swapAdventure', give: g.occ, take: 'takeQuest', quest: q.id });
  }
  for (const id of offersBlockedByCap(state, player)) {
    for (const g of gives) if (!isStoryLine(questOf(g))) out.push({ type: 'swapAdventure', give: g.occ, take: 'takeOffer', quest: id });
  }
  return out;
}

// All or nothing (ChatGPT 30.10 21:37): the whole swap is checked BEFORE anything changes — the give and the take as one of
// this player's legal swaps now; turnEngine.dispatch also runs it on a copy of the state's undo point, so an unexpected
// failure in the take leaves the old adventure (and everything else) exactly as it was.
export function swapAdventure(state, action) {
  const player = currentPlayer(state);
  if (!adventureSwapActions(state, player).some((a) => a.give === action.give && a.take === action.take && a.quest === action.quest)) throw new Error(`no swap ${action.give} → ${action.quest} now`);
  abandonQuest(state, action.give); // given back: no reward (a board card is gone for good)
  player.questBook.swapRound = state.turn.round;
  log(state, 'quest', `🔄 ${player.name} gives back ${action.give} (unstarted) for ${action.quest} — the next swap from week ${state.turn.round + SWAP_COOLDOWN}.`, { book: { event: 'swap', give: action.give, take: action.quest, next: state.turn.round + SWAP_COOLDOWN } });
  if (action.take === 'takeOffer') takeOffer(state, action.quest);
  else takeQuest(state, action.quest);
}

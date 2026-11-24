// ROCKET-2 — „Kampania Kanto” (rules.rocketCampaign 'r1' | 'r1s' | 'r2' (| 'r3', not a pilot), a DEV pilot; data/
// rocketCampaign.js). R1.1 (Piotr's OWNER GO 18.11.2026): Celadon; R1.2 step 1 (ChatGPT 21.11.2026 §5): + Mt. Moon, the
// architecture for Lavender / Saffron (they READ the Poké Flute / Lapras lines). A chapter is a WORLD state, the same for every
// player (`state.rocketCampaign.chapters[id]`: { opened, freed, off? }), saved with the game; a game without the pilot has none
// and nothing here runs (older saves load OFF).
//   off       its quest is not in this game's book — it never opens
//   opens     at the start of its week (opensWeek) — an IMPORTANT notice — unless two chapters are active (it waits for a free
//             slot), a Team Rocket plot stands on its place (it waits), or its battle was already won (it is free at once)
//   occupied  the flag on the map; an OWN chapter's quest (`celadon-rocket`) can be taken there without its rumour
//   freed     the named battle of its quest won (questBookEngine.advance, a quest challenge) — for good, for everyone; an OWN
//             chapter's other attempts end without a reward (questBookEngine.closeCampaignLines); a READ chapter's line goes
//             on untouched — the campaign pays nothing, so never a second Poké Flute or Lapras
//   shop      'r1s' only (experimental): the Poké Stop's shop is closed while occupied; healing always works
//   gift      rules.campaignGift 'g1' (a separate DEV pilot, R-4): one Poké Ball per player per freed place, at the first visit
// The AI never takes an OWN chapter's quest (questBookEngine.takeBlock 'family' — AI v2e's code untouched). While a chapter is
// active the plot deck skips a plot standing on its place (rocketEngine.rocketWeekStart): a plot and a chapter never share it.
// Nothing here closes a road, a gym, the League or healing.
import { CAMPAIGN_GIFT, MAX_ACTIVE_CHAPTERS, ROCKET_CAMPAIGN } from '../data/rocketCampaign.js';
import { getLocation } from '../data/locations.js';
import { pickVersion } from '../rules.js';
import { log } from './log.js';
import { addItem } from './itemEngine.js';

export const usesRocketCampaign = (config) => Boolean(ROCKET_CAMPAIGN[config?.rules?.rocketCampaign]);
export const campaignSpec = (config) => pickVersion(ROCKET_CAMPAIGN, config.rules.rocketCampaign, 'Rocket campaign rules');
const chapters = (config) => (usesRocketCampaign(config) ? campaignSpec(config).chapters : []);
// the chapter freed by this quest (or null) — `own`: only a quest the campaign owns (Celadon)
export const chapterOfQuest = (config, questId, { own = true } = {}) => chapters(config).find((c) => c.frees.quest === questId && (!own || c.own)) ?? null;
// an OWN chapter's quest: the table's 🚩 chip and hint, the family gate, taken without its rumour
export const isCampaignQuest = (config, questId) => Boolean(chapterOfQuest(config, questId));
const chapterState = (state, id) => state.rocketCampaign?.chapters?.[id] ?? null;
const active = (state) => chapters(state.config).filter((c) => { const st = chapterState(state, c.id); return st && st.opened != null && !st.freed; });

// `inBook(questId)`: is this quest in this game's book (gameState passes questBookEngine.bookQuests) — a chapter without it is off
export function setupRocketCampaign(state, inBook = () => true) {
  if (!usesRocketCampaign(state.config)) return;
  state.rocketCampaign = { chapters: Object.fromEntries(chapters(state.config).map((c) => [c.id, { opened: null, freed: null, ...(inBook(c.frees.quest) ? {} : { off: true }) }])) };
}

// At the start of each week (turnEngine): the chapters whose week has come fall, in their order — never more than two active,
// never onto a plot's place; one already beaten (`passed(quest, challenge)`, questBookEngine.challengePassed) is free at once.
export function campaignWeekStart(state, { passed = () => null, plotAt = null } = {}) {
  if (!usesRocketCampaign(state.config) || !state.rocketCampaign) return;
  for (const c of chapters(state.config)) {
    const st = chapterState(state, c.id);
    if (!st || st.off || st.opened != null || st.freed || state.turn.round < c.opensWeek) continue;
    const by = passed(c.frees.quest, c.frees.challenge);
    if (by) {
      st.freed = { by, week: state.turn.round, before: true }; // won before its week: never occupied
      continue;
    }
    if (active(state).length >= MAX_ACTIVE_CHAPTERS || plotAt === c.place) continue; // it waits
    openChapter(state, c.id);
  }
}

// A chapter's place falls now (its week — or a QA scenario): once.
export function openChapter(state, id) {
  const c = chapters(state.config).find((x) => x.id === id);
  const st = chapterState(state, id);
  if (!c || !st || st.off || st.opened != null || st.freed) return;
  st.opened = state.turn.round;
  log(state, 'world', `🚩 Team Rocket takes over ${getLocation(c.place).name}${c.shop ? ' — its Poké Stop shop is closed (healing works)' : ''}.`, { rocketCampaign: { event: 'occupied', chapter: c.id, place: c.place, quest: c.frees.quest, shop: c.shop } });
}

// The chapter occupying this place now (opened, not freed), or null.
export const occupiedAt = (state, place) => (state.rocketCampaign ? active(state).find((c) => c.place === place) ?? null : null);
export const occupiedPlaces = (state) => (state.rocketCampaign ? active(state).map((c) => c.place) : []);
// 'r1s': the Poké Stop's shop is closed here now
export const shopClosedByRocket = (state, place) => Boolean(occupiedAt(state, place)?.shop);

// Why this player cannot take an OWN chapter's quest now (null: they can; undefined: not such a quest — the ordinary rules).
//   family       an AI player — the campaign's quests are the family's
//   rocketNotYet the city has not fallen yet ({ week })
//   cityFree     somebody freed it already ({ by })
export function campaignTakeBlock(state, player, q) {
  const c = chapterOfQuest(state.config, q.id);
  if (!c) return undefined;
  if (player.controller === 'ai') return { code: 'family' };
  const st = chapterState(state, c.id);
  if (st?.freed) return { code: 'cityFree', by: st.freed.by, place: c.place };
  if (!st || st.opened == null) return { code: 'rocketNotYet', week: c.opensWeek };
  return null;
}

// questBookEngine: a quest challenge WON — the chapter it frees (own or read), if it is active: free, for everyone. Returns
// the chapter freed (the caller ends an own chapter's other attempts), or null.
export function challengeWon(state, player, questId, challenge) {
  const c = chapters(state.config).find((x) => x.frees.quest === questId && x.frees.challenge === challenge);
  const st = c && chapterState(state, c.id);
  if (!st || st.freed || st.opened == null) return null;
  st.freed = { by: player.id, week: state.turn.round };
  log(state, 'world', `🎉 ${player.name} beats Team Rocket — ${getLocation(c.place).name} is free for everyone!`, { rocketCampaign: { event: 'freed', chapter: c.id, place: c.place, quest: c.frees.quest, by: player.id, shop: c.shop } });
  for (const p of state.players) if (p.location === c.place) campaignVisit(state, p); // R-4: those standing there now
  return c;
}

// R-4 (rules.campaignGift 'g1'): a player's first visit to a freed place — one Poké Ball, once per chapter (questBookEngine.
// bookEvent on every arrival and own turn start; challengeWon for those standing there)
export const usesCampaignGift = (config) => usesRocketCampaign(config) && Boolean(CAMPAIGN_GIFT[config.rules.campaignGift]);
export function campaignVisit(state, player) {
  if (!usesCampaignGift(state.config) || !state.rocketCampaign) return;
  for (const c of chapters(state.config)) {
    const st = chapterState(state, c.id);
    if (c.place !== player.location || !st?.freed || st.freed.before || (player.campaignGifts ?? []).includes(c.id)) continue;
    const { item, amount } = CAMPAIGN_GIFT[state.config.rules.campaignGift].reward;
    (player.campaignGifts ??= []).push(c.id);
    addItem(player, item, amount);
    log(state, 'quest', `🎁 ${getLocation(c.place).name} thanks ${player.name}: +${amount} Poké Ball (the place is free).`, { campaignGift: { player: player.id, chapter: c.id, place: c.place, item, amount } });
  }
}

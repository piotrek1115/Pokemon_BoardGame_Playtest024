// ROCKET-2 — „Kampania Kanto” (rules.rocketCampaign, a DEV pilot, OFF in every set). Piotr's OWNER GO 18.11.2026 (R1 in two
// steps) and ChatGPT 21.11.2026 „REVIEW APPROVED / NEXT DEV ROUND” §3 + §5 (R-1 R1 · R-2 `r1`, the shop open · R-3 week 2 ·
// R1.2: Mt. Moon first, Lavender / Saffron read their existing lines, at most TWO chapters active, never a second Poké Flute or
// Lapras, nothing blocks the League, healing or the main roads; Giovanni / DEC-29 NOT built — the 7-badge threshold stays).
// A chapter = a place under Team Rocket from its week until somebody wins the named battle of an EXISTING quest:
//   place      the occupied place (a flag on the map)
//   opensWeek  the week it falls (if two chapters are active it waits for a free slot; never while a plot stands there)
//   frees      { quest, challenge } — the existing quest and its battle whose WIN frees the place for everyone
//   own        true: the quest belongs to the campaign (Celadon's `celadon-rocket`: taken only while the city is occupied, no
//              rumour needed, a family quest; the other players' attempts end without a reward when it is freed);
//              false: the chapter only READS an existing line (its offer, steps and rewards unchanged — the Moon Stone
//              thieves, the Tower's Rockets before the Poké Flute, Silph's Rocket Admin before Lapras): no new reward ever
//   shop       true only in 'r1s' (the experimental variant): the Poké Stop's shop is closed while occupied; healing works
// A chapter whose quest is not in this game's book never opens (e.g. Mt. Moon without `kantoa`, Lavender without the
// Snorlax / incidents pilot). PROVISIONAL weeks.
const CELADON = Object.freeze({ id: 'celadon', place: 'celadon-city', opensWeek: 2, frees: Object.freeze({ quest: 'celadon-rocket', challenge: 'Game Corner Rocket' }), own: true, shop: false });
const MT_MOON = Object.freeze({ id: 'mtmoon', place: 'mt-moon', opensWeek: 4, frees: Object.freeze({ quest: 'w-moon-night-v2', challenge: 'Moon Stone Thieves' }), own: false, shop: false });
const LAVENDER = Object.freeze({ id: 'lavender', place: 'lavender-town', opensWeek: 10, frees: Object.freeze({ quest: 'epic-snorlax', challenge: 'Tower Rocket' }), own: false, shop: false });
const SAFFRON = Object.freeze({ id: 'saffron', place: 'saffron-city', opensWeek: 16, frees: Object.freeze({ quest: 'epic-lapras', challenge: 'Rocket Admin' }), own: false, shop: false });
export const CAMPAIGN_CHAPTERS = Object.freeze({ celadon: CELADON, mtmoon: MT_MOON, lavender: LAVENDER, saffron: SAFFRON });
export const MAX_ACTIVE_CHAPTERS = 2;
export const ROCKET_CAMPAIGN = {
  r1: Object.freeze({ chapters: Object.freeze([CELADON]) }), // R1.1 — ACCEPTED DEV 21.11 (the pilot `rocketcampaign`)
  r1s: Object.freeze({ chapters: Object.freeze([Object.freeze({ ...CELADON, shop: true })]) }), // experimental only (`rocketcampaigns`)
  r2: Object.freeze({ chapters: Object.freeze([CELADON, MT_MOON]) }), // R1.2 step 1 — + Mt. Moon (the pilot `rocketcampaign2`)
  // R1.2 architecture, NOT a pilot (no DEV_PILOTS entry, no table switch): Lavender and Saffron read the Poké Flute / Lapras
  // lines — their activation needs Piotr's separate approval (ChatGPT 21.11 §5); here so the engine and its tests cover them
  r3: Object.freeze({ chapters: Object.freeze([CELADON, MT_MOON, LAVENDER, SAFFRON]) }),
};
// R-4 (ChatGPT 21.11 §3, a proposal to evaluate — rules.campaignGift 'g1', its own DEV pilot `rocketgift`): one Poké Ball for
// EVERY player at their first visit to a freed place (an arrival or the start of an own turn there; the players standing
// there when it is freed at once) — once per player per chapter (`player.campaignGifts`), never again (no farming)
export const CAMPAIGN_GIFT = { g1: Object.freeze({ reward: Object.freeze({ item: 'pokeball', amount: 1 }) }) };

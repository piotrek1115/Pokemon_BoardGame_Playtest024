// BIKE-1 — „Rower” (rules.bike 'b1', a DEV pilot, OFF in every set; ?dev=bike). Piotr's OWNER GO 18.11.2026 (ChatGPT
// „SNORLAX C / BIKE W2+W3 / CUT K1 / ROCKET R1 / OBTAIN151” §2) on docs/design/BIKE_1_DESIGN.md: B1 V2, B2 W2 + W3, B3 Route
// 18, B4 the middle place visited. No new edge of the canonical map (DEC-06): a ride goes along EXISTING edges — two
// ordinary steps for ONE Move action, each checked by the one travel graph (graphEngine.canStep: closures, Rocket, Snorlax).
//   keyItem   the bicycle (data/questBook.js QUEST_BOOK_KEY_ITEMS — lasting): no badge, no Pokémon — the bike is the ability
//   voucher   the Fan Club's Bike Voucher (a quest item, handed in at the Cerulean bike shop)
//   trails    W2: the six town – route – town roads ridden in one action, both ways (the trail's middle is a route)
//   downhill  W3: Cycling Road, ONE way — Route 16 → Route 17 → Route 18 in one action; uphill is an ordinary walk (B3: it
//             ends on Route 18, where the Biker of `w-cycling-race` waits)
//   hmFrom    the quest that gives the bike (data/questBook.js BIKE_QUESTS) — the Fan Club in Vermilion (B1 V2)
// The trails, the downhill and the quest are PROVISIONAL content for the DEV pilot; W2 + W3 and V2 are Piotr's.
export const BIKE = {
  b1: Object.freeze({
    keyItem: 'bicycle',
    voucher: 'bikeVoucher',
    trails: Object.freeze([
      Object.freeze(['pallet-town', 'route-1', 'viridian-city']),
      Object.freeze(['viridian-city', 'route-2', 'pewter-city']),
      Object.freeze(['cerulean-city', 'route-5', 'saffron-city']),
      Object.freeze(['saffron-city', 'route-6', 'vermilion-city']),
      Object.freeze(['saffron-city', 'route-7', 'celadon-city']),
      Object.freeze(['saffron-city', 'route-8', 'lavender-town']),
    ]),
    downhill: Object.freeze(['route-16', 'route-17', 'route-18']),
    hmFrom: 'bike-voucher',
  }),
  // BIKE V2 — „3 pola za 2 akcje” (rules.bike 'b2', the DEV pilot `bike2`, OFF in every set). ChatGPT 22.11 „REVIEW APPROVED /
  // GO UX + BIKE V2” §3 on docs/design/BIKE_V2_SURF_AUDIT_2211.md §1.4–§1.7 (Piotr's parameters): no trails — a ride goes
  // from wherever the player stands along EXISTING land edges (never water, Surf or an Underground Path — P6), each step
  // asked of the one travel graph (graphEngine.canStep). The ride table is read from the game's network (engine/bikeEngine.js).
  //   steps     P5: a ride's end is 3 bike steps away — the place 3 walking steps away (the route is then the only one)
  //   cost      2 actions for the whole ride; R1 (P2) `paidSteps` 2: the 1st and the 2nd step are paid as they are ridden,
  //             the 3rd is free — a ride stopped on the way costs only the steps ridden (never worse than walking)
  //   minActions J1 (P3): with one action left there is no ride (one step on foot)
  //   perTurn   P4: one ride a turn
  //   downhill  CR-1 (P7): Route 16 → Route 17 → Route 18 is ONE bike step (Route 17 visited as usual); uphill (Route 18 → 17 →
  //             16) the bike never goes — an ordinary walk. Team Rocket's `cycling-road` closes it as it closes the road
  //   hmFrom    BIKE V2 obtain variant A (§4): the Fan Club's duel (data/questBook.js BIKE_QUESTS.b2) — `bike-voucher` stays b1's
  b2: Object.freeze({
    keyItem: 'bicycle',
    voucher: 'bikeVoucher',
    trails: Object.freeze([]),
    steps: 3,
    cost: 2,
    paidSteps: 2,
    minActions: 2,
    perTurn: 1,
    downhill: Object.freeze(['route-16', 'route-17', 'route-18']),
    hmFrom: 'bike-fanclub',
  }),
};

// SURF-1 — „Surf” (rules.surf 's1', a DEV pilot, OFF in every set; ?dev=surf). ChatGPT 12.11.2026 „FLY-1/2/3 + ART-1 —
// REVIEW ACCEPTED / NEXT MILESTONE” §3: DEC-04 variant A prepared in DEV — the sea loop of today stays on the Soul Badge
// alone (`canTravelWater`, untouched); only NEW water routes need Surf and a suitable healthy Pokémon; the HM Surf is a key
// item, never a battle move (Combat 2.2 frozen). One field ability, the same shape as Fly (data/fly.js):
//   hm       the key item (data/questBook.js QUEST_BOOK_KEY_ITEMS): lasting, takes no move slot
//   badge    …and the Soul Badge (gym `fuchsia`; Macro 02 §8.2 „Soul Badge and a Surf-capable Pokémon”), checked when a
//            water route is used — never the gym `grants` mechanism
//   species  the Pokémon that can carry the player on water — awake (HP > 0) and in the active team (the Box does not
//            count). DECIDED by Piotr 12.11.2026: these 18 — Macro 02 §8.2's list + Seadra (a final form in this game),
//            Dragonair kept; no Wartortle / Poliwhirl
//   hmFrom   the quest that gives the HM (data/questBook.js SURF_QUESTS) — Safari Zone's secret house (canon); DECIDED by
//            Piotr 12.11.2026, as the Soul Badge
// WHERE Surf is needed is not decided here: an edge says `requires: ['surf']` (data/travelConnections.js). No canonical or
// family network has such an edge; the SURF-0 lanes (DEC-05 DECIDED 12.11.2026: S1 + S2) live in the network
// `travelNetwork 'v3'`, which the Surf pilot turns on with the ability (docs/SURF_0_PROPOSAL.md).
export const SURF = {
  s1: Object.freeze({
    hm: 'hmSurf',
    badge: 'fuchsia',
    species: Object.freeze(['lapras', 'gyarados', 'blastoise', 'golduck', 'poliwrath', 'slowbro', 'dewgong', 'tentacruel', 'starmie', 'kingler', 'seaking', 'seadra', 'cloyster', 'omastar', 'kabutops', 'vaporeon', 'dragonair', 'dragonite']),
    hmFrom: 'surf-safari',
  }),
};

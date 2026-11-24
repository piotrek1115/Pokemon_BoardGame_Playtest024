// FLY-1 / FLY-3 — „Lot” (rules.fly 'f1', a DEV pilot, OFF in every set; ?dev=fly). Piotr's decisions F1–F5 (OWNER
// APPROVED 11.11.2026, ChatGPT „FLY-1 / FLY-2 / FLY-3 — OSTATECZNE GO”); Macro 02 §8.1 / §9. One field ability for every
// capable Pokémon — never a battle move (Combat 2.2 is frozen: a new move would change rollKnownMoves' replays).
//   hm       F1: the key item (data/questBook.js QUEST_BOOK_KEY_ITEMS — the ONE key-item list): lasting, never handed in,
//            never Meowth's loot, never taken back when a quest is given up; it takes no move slot
//   badge    F1: …and the Thunder Badge (the gym `vermilion`), checked when flying — never the gym `grants` mechanism
//            (that would write a capability into every older game)
//   species  F2: the middle and final forms that may carry the player (Pidgey, Spearow, Doduo may not) — awake (HP > 0)
//            and in the active team; a Pokémon in the Box does not count
//   targets  F4: the ten towns and cities, only those this player has visited; never the place the player stands on,
//            never Indigo Plateau
//   hmFrom   FLY-3: the quest that gives the HM (data/questBook.js FLY_QUESTS) — Macro 02 §8.1: the Route 16 house
// F3: the WHOLE turn — only with both actions of the turn untouched (no action spent, no battle fought this turn), and the
// turn ends on landing (engine/flyEngine.js). F5: flying over a closed road is fine; landing in a closed place is not.
// The species list and the quest are PROVISIONAL content for the DEV pilot; the rules F1–F5 are Piotr's.
export const FLY = {
  f1: Object.freeze({
    hm: 'hmFly',
    badge: 'vermilion',
    species: Object.freeze(['pidgeotto', 'pidgeot', 'fearow', 'dodrio', 'charizard', 'aerodactyl', 'farfetchd', 'dragonite', 'articuno', 'zapdos', 'moltres']),
    targets: Object.freeze(['pallet-town', 'viridian-city', 'pewter-city', 'cerulean-city', 'vermilion-city', 'lavender-town', 'celadon-city', 'saffron-city', 'fuchsia-city', 'cinnabar-island']),
    hmFrom: 'fly-route16',
  }),
};

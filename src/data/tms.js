// TM-1 — Technical Machines (rules.tms 't1', a DEV pilot, OFF in every set; ?dev=tm). Roadmap milestone C (docs/
// ROADMAP_KANTO_SYSTEMS.md), DEV approved 12.11.2026; DQ-133 („TM at all?”) is still the owner's before any set.
// The TMs themselves and what each one teaches are Combat 2.0 data (src/combat2/learnsets.js TM_DEFINITIONS, derived
// TM_COMPATIBILITY); this table holds only the RULES of their use in the board game:
//   combatMoves  the moves a TM teaches live on the instance (`mon.moves`, the Combat MVP) — without rules.combatMoves
//                'mvp1' a game has no TMs at all (no field, no action)
//   singleUse    DECIDED by Piotr 12.11.2026 (t2; t1 had it PROVISIONAL, the same value): a TM is used up when it
//                teaches (its count −1, gone at 0). false = reusable — the count stays (the ONE place to flip it)
//   sources      TM-2 (t2 only — DECIDED by Piotr 12.11.2026, the table of docs/ROADMAP_KANTO_SYSTEMS.md § TM-2): where a
//                TM comes from in a game. `gyms`: the TM a gym leader gives with the badge (to whoever wins it — the AI
//                holds it and never uses it); `quest`: the quest whose reward is a TM (data/questBook.js TM_QUESTS — the
//                AI never takes it); `shop`: the TMs a Poké Stop's shop sells, at one price (the AI never buys one).
//                t1 has none: there a TM exists only through the debug meta-action `debugGiveTm`
// A TM teaches only a move its species can already know (a TM opens no new possibility); a filled slot is replaced only
// after the player chose which move stays. Using a TM is free (no action, no battle — a Fly turn stays whole).
// Learning at evolution (TM-4, rules.evoMoves) is not a TM: engine/evoMoveEngine.js.
// (not frozen: tests/tm.test.js flips `singleUse` for one test to prove the reusable variant is this one switch)
export const TMS = {
  t1: {
    combatMoves: 'mvp1',
    singleUse: true,
  },
  // TM-2 (rules.tms 't2', the `tm` DEV pilot since 12.11.2026): t1 + the sources Piotr approved — 8 gyms, the Dojo's quest
  // in Saffron, three TMs in Celadon's Department Store at 💰6 (between an Evolution Stone 5 and an Ultra Ball 8)
  t2: {
    combatMoves: 'mvp1',
    singleUse: true,
    sources: Object.freeze({
      gyms: Object.freeze({ pewter: 'tm08', cerulean: 'tm05', vermilion: 'tm03', celadon: 'tm10', fuchsia: 'tm02', saffron: 'tm07', cinnabar: 'tm04', viridian: 'tm06' }),
      quest: Object.freeze({ id: 'tm-dojo', tm: 'tm11' }),
      shop: Object.freeze({ place: 'celadon-city', tms: Object.freeze(['tm01', 'tm09', 'tm12']), price: 6 }),
    }),
  },
};

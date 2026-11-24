// SNORLAX-1 (ChatGPT 18.11.2026 P0; rules.snorlax 'c1' / 'a1', a DEV pilot, OFF in every set) — the Sleeping Snorlax made
// playable from the pieces the game already has (no parallel mechanic):
//   the road    data/worldIncidents.js 'snorlax' — Route 11 ↔ 12 closed from week 1 until the world flag `snorlaxAwake`
//               (engine/incidentEngine.js: with this pilot ALONE the schedule holds only Snorlax — no swarm, rain,
//               landslide or closed gym; the safety gate and graphEngine.worldBlocks as before)
//   the flute   data/questBook.js INCIDENT_QUESTS `epic-snorlax` — Mr. Fuji in Lavender, the Tower's Rockets, the Poké
//               Flute played on Route 12: the flag is set for EVERY player (unchanged)
//   the catch   data/questBook.js SNORLAX_QUESTS `snorlax-meet` — at Route 12 once the flag is set: one quest encounter
//               (questBookEngine openEncounter / startQuestEncounter → the existing wild battle, Combat 2.2, the catch
//               die, any ball). Caught: the quest closes (no reward to collect — the Pokémon is it). A miss / a flight /
//               a lost battle: Snorlax stays on Route 12 and waits — a new trail, one Explore there (the expeditions'
//               rule), nothing lost for good.
//   'c1'  every player may meet their own Snorlax after the shared wake (NIGHTSHIFT014 D3 variant C — recommended: no race
//         for a child; the waker has the honour and the first try, as it stands on Route 12)
//   'a1'  only the player who woke it (collected `epic-snorlax`) may meet it (variant A — one Snorlax in the world)
// Never twice: a player with Snorlax in the Pokédex as caught cannot take the quest again (a catch then giving the quest
// up and retaking it would be a second Snorlax). The AI never takes either line (`epic` — AI v2e frozen).
export const SNORLAX_RULES = Object.freeze({ c1: Object.freeze({ wakerOnly: false }), a1: Object.freeze({ wakerOnly: true }) });
export const SNORLAX_FLAG = 'snorlaxAwake';
export const SNORLAX_WAKE_QUEST = 'epic-snorlax';
export const usesSnorlax = (config) => Boolean(SNORLAX_RULES[config?.rules?.snorlax]);
export const snorlaxRule = (config) => SNORLAX_RULES[config?.rules?.snorlax] ?? null;

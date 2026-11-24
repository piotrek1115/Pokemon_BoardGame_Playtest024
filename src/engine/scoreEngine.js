// PLAYTEST_021 (ChatGPT 14.11.2026, Piotr's GO; DESIGN docs/design/ENDGAME_SCORE_PT019.md) — points and the two
// victory modes (rules.victory, a DEV pilot `?dev=victory`, chosen on the start screen):
//   'a' MISTRZ KANTO     beating Lance wins, as always (endgameEngine: the first Champion's week is the last); the points
//                        rank everyone else and decide a time limit (most points → most badges → shared)
//   'b' WIELKA PRZYGODA  the game ends the same way (the first Champion's week, or a time limit) — then the most points
//                        win; the Champion has a big bonus (most points → most badges → Elite Four Ribbon → shared)
//
// A player's points are READ from the game, never stored or added up by events — so nothing is ever counted twice, a
// reload shows the same, and every older save is untouched:
//   trophies   the Kanto trophies they own (achievementEngine.trophyPoints — one owner per trophy, a chain its top tier)
//   species    each species in their Pokédex as caught (pokedex.caught: a species once, however many; evolutions never)
//   quests     each epic line they finished (data/questBook `epic` + `special`, repeat 'never' — once per player; a
//              legend line is counted as its legend, not twice)
//   legends    each legend they own (DEC-01: one per world; a trade moves it, and its points with it)
//   badges     each badge
//   ribbon     the Elite Four Ribbon
//   champion   Champion of the Pokémon League
// The numbers are PROVISIONAL (ChatGPT 14.11: until the balance tests are done).
import './gameState.js'; // first: the engine's modules load in their usual order (questBookEngine ⇄ huntEngine), whoever imports this
import { bookQuests, legendStep } from './questBookEngine.js';
import { trophyPoints } from './achievementEngine.js';

export const VICTORY_MODES = Object.freeze(['a', 'b']);
export const victoryMode = (config) => (VICTORY_MODES.includes(config?.rules?.victory) ? config.rules.victory : null);
export const usesVictory = (config) => victoryMode(config) !== null;

export const SCORE_POINTS = Object.freeze({ species: 1, quest: 5, legend: 10, badge: 3, ribbon: 5, champion: 25 }); // PROVISIONAL
export const SCORE_PARTS = Object.freeze(['trophies', 'species', 'quests', 'legends', 'badges', 'ribbon', 'champion']);

// The lines that count as „wyjątkowe misje”: the epic lines (Dojo, Porygon, Dratini, Lapras, Charizard, Venusaur, the
// Mewtwo story …) — never a legend's own line (its legend has the points).
export const isScoreQuest = (q) => Boolean(q?.epic && q.special && !legendStep(q));
export const scoreQuests = (config) => bookQuests(config).filter(isScoreQuest);

export function questsDone(state, player) {
  const byQuest = player.questRecords?.byQuest ?? {};
  return scoreQuests(state.config).filter((q) => (byQuest[q.id]?.completed ?? 0) > 0).map((q) => q.id);
}

export function legendsOwned(state, player) {
  return Object.entries(state.legends ?? {}).filter(([id, l]) => id !== 'v' && l?.status === 'caught' && l.owner === player.id).map(([id]) => id);
}

// → { total, parts: { trophies, species, quests, legends, badges, ribbon, champion }, counts: { … the same, as counts } }
export function scoreOf(state, player) {
  const P = SCORE_POINTS;
  const counts = {
    trophies: trophyPoints(state, player.id),
    species: player.pokedex?.caught?.length ?? 0,
    quests: questsDone(state, player).length,
    legends: legendsOwned(state, player).length,
    badges: player.badges?.length ?? 0,
    ribbon: player.league?.ribbon ? 1 : 0,
    champion: player.league?.champion ? 1 : 0,
  };
  const parts = {
    trophies: counts.trophies,
    species: counts.species * P.species,
    quests: counts.quests * P.quest,
    legends: counts.legends * P.legend,
    badges: counts.badges * P.badge,
    ribbon: counts.ribbon * P.ribbon,
    champion: counts.champion * P.champion,
  };
  return { total: SCORE_PARTS.reduce((sum, k) => sum + parts[k], 0), parts, counts };
}

// The ladder of the end (both modes): most points → most badges → the Elite Four Ribbon → still tied: shared.
const LADDER = [
  ['points', (s, p) => scoreOf(s, p).total],
  ['badges', (s, p) => p.badges.length],
  ['ribbon', (s, p) => (p.league?.ribbon ? 1 : 0)],
];

// The winners among `pool` by the ladder → { winners: [ids], decidedBy: 'points' | 'badges' | 'ribbon' | 'shared' }
export function pointsWinners(state, pool = state.players) {
  let left = pool;
  for (const [key, value] of LADDER) {
    const best = Math.max(...left.map((p) => value(state, p)));
    left = left.filter((p) => value(state, p) === best);
    if (left.length === 1) return { winners: [left[0].id], decidedBy: key };
  }
  return { winners: left.map((p) => p.id), decidedBy: 'shared' };
}

// The places of the end: the winners share 1st; everyone else by points (equal points share a place) — in setup order
// within a place. → [{ id, place, total }]
export function finalPlaces(state, winners) {
  const total = Object.fromEntries(state.players.map((p) => [p.id, scoreOf(state, p).total]));
  const rest = state.players.filter((p) => !winners.includes(p.id)).sort((a, b) => total[b.id] - total[a.id]);
  const out = state.players.filter((p) => winners.includes(p.id)).map((p) => ({ id: p.id, place: 1, total: total[p.id] }));
  let place = winners.length ? 2 : 1;
  rest.forEach((p, i) => {
    if (i > 0 && total[p.id] < total[rest[i - 1].id]) place = (winners.length ? 2 : 1) + i;
    out.push({ id: p.id, place, total: total[p.id] });
  });
  return out;
}

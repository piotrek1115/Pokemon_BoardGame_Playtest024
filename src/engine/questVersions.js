// A quest's VERSIONS in one place (`replaces`: PLAYTEST_016 PT016-07 powerPlant 'v2', NIGHTSHIFT_018's legend lines, INDIGO A
// kantoStories 'a1'). A version takes its authored quest's place in a NEW game's book; the authored definition never changes and
// stays in every older game. Two questions, asked by the quest book, the rumours, the Living Kanto boards and the table:
//   which quest THIS game plays for an authored one     versionIn / questIdIn (config)
//   which authored quest a version stands for            baseQuestId (id) — everything keyed by a quest's id (the equal start's
//                                                        local offers, the fossil week, the quest stones, the art) reads it, so a
//                                                        version carries what its quest carried (INDIGO_A_READY §3, ChatGPT 07.11 P0)
// Pure: data and the rules only (no engine state), so every layer may import it without a cycle.
import { KANTO_STORIES, LEGEND_LINES, PT016_QUESTS } from '../data/questBook.js';
import { usesLegendCatch } from './legendEngine.js';

export const QUEST_VERSIONS = Object.freeze([...PT016_QUESTS.v2, ...KANTO_STORIES.a1, ...Object.values(LEGEND_LINES).flat()]);
const BASE = new Map(QUEST_VERSIONS.map((q) => [q.id, q.replaces]));
export const baseQuestId = (id) => BASE.get(id) ?? id;

// The versions a game plays (in this order: the first that replaces a quest wins — no two versions replace the same one)
export function versionsOf(config) {
  const r = config?.rules;
  if (!r) return [];
  return [
    ...(r.powerPlant === 'v2' ? PT016_QUESTS.v2 : []),
    ...(r.kantoStories === 'a1' ? KANTO_STORIES.a1 : []),
    ...(usesLegendCatch(config) ? [r.mewtwoLine, r.zapdosLine].flatMap((v) => LEGEND_LINES[v] ?? []) : []), // a legend's version ends in a catch
  ];
}
export const versionIn = (config, id) => versionsOf(config).find((n) => n.replaces === id) ?? null;
export const questIdIn = (config, id) => versionIn(config, id)?.id ?? id;

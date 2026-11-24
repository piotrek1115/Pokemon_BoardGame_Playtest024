// SURF-1 — „Surf” (rules.surf 's1', a DEV pilot; data/surf.js). One field ability, the shape of Fly (engine/flyEngine.js):
// the HM Surf (a key item), the Soul Badge and an awake capable Pokémon in the active team let the player use an edge that
// `requires: ['surf']` (data/travelConnections.js). It is a requirement of the ONE travel graph (engine/travelEngine.js
// missingRequirements), so every move, distance, illegal-move reason, mission destination and the board see it the same
// way — no new action, no new cost (an edge costs its 1 Move action), nothing else changes.
//
// DEC-04 A: today's sea loop keeps `canTravelWater` (the Soul Badge) alone — Surf is never asked there. No edge of any
// set needs Surf: the SURF-0 lanes (DEC-05, Piotr 12.11.2026: S1 + S2) are in the network `travelNetwork 'v3'`, which
// the Surf pilot turns on together with the ability (?dev=surf; ?dev=surfmap = the lanes alone, a viewing aid).
//
// The AI never gets the HM (aiEngine.chooseAction filters the HM's quest, as Fly's — AI v2e frozen), so it never meets a
// Surf edge it can use: an AI-only game plays the same with the switch ON or OFF.
import { SURF } from '../data/surf.js';
import { pickVersion } from '../rules.js';

export const usesSurf = (config) => config?.rules?.surf === 's1';
export const surfSpec = (config) => pickVersion(SURF, config.rules.surf, 'Surf rules');
// the HM's quest — the AI leaves it to the family
export const isSurfQuest = (id) => Object.values(SURF).some((v) => v.hmFrom === id);

export const hasSurfHm = (player, config) => Boolean(player.questBook?.keyItems.includes(surfSpec(config).hm));
export const hasSurfBadge = (player, config) => (player.badges ?? []).includes(surfSpec(config).badge);
const canCarry = (config, mon) => surfSpec(config).species.includes(mon.species);
// the capable Pokémon that can swim now — awake, in the active team, in team order (the first one carries)
export const swimmers = (player, config) => (player.team ?? []).filter((m) => m.hp > 0 && canCarry(config, m));

// What stands between this player and a Surf edge, in a fixed order (the table says it in Polish):
//   'off'      this game has no Surf
//   'hm'       no HM Surf
//   'badge'    no Soul Badge
//   'pokemon'  no capable Pokémon awake in the team — `fainted` / `boxed`: one is, but fainted / in the Box
export function surfBlockers(player, config) {
  if (!usesSurf(config)) return [{ code: 'off' }];
  const out = [];
  if (!hasSurfHm(player, config)) out.push({ code: 'hm' });
  if (!hasSurfBadge(player, config)) out.push({ code: 'badge' });
  if (!swimmers(player, config).length) {
    const fainted = (player.team ?? []).filter((m) => canCarry(config, m)).map((m) => m.species);
    const boxed = (player.reserve ?? []).filter((m) => canCarry(config, m)).map((m) => m.species);
    out.push({ code: 'pokemon', fainted, boxed });
  }
  return out;
}

export const canSurf = (player, config) => usesSurf(config) && surfBlockers(player, config).length === 0;

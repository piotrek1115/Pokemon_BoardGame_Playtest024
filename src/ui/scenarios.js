// One Kanto day 14.10 — DEV TEST SCENARIOS for the evening playtest (ChatGPT canonical full-day handoff, „Evening
// preparation”). FIXTURES, not saves and not rules: each builds a NEW game of the evening ruleset (applyAdventure)
// and puts the table in one test situation. The table opens one only from a developer URL (`table.html?scenario=D`)
// and keeps it in its OWN save keys (scenarioStorage: kanto.table.scenario.<X>.v2 …) — the family's game slot is
// never read or written; `&fresh` builds it again. Nothing here is reachable from the game's menus.
//   A  a normal start — two players, the evening ruleset
//   B  a rumour heard and its quest taken (Ash: the Lost Parcel, at Viridian)
//   C  the Scyther expedition at its encounter step (Ash in the Safari Zone)
//   D  two players at one Poké Stop (Pewter), ready to trade
//   E  two players at one place (Route 2), ready for a friendly duel
//   F  one step from the first achievement (Ash in Cerulean, 9 places visited — any new place next door: EXPLORER)
//   G  fishing (dev-1410b): Ash on Route 6 with the sailor's quest and two Water Pokémon — into Vermilion →
//      collect the reward (the Old Rod) → „🎣 Łów” there (the sea)
//   H  bonus 2 (dev-1410c): Ash on Route 2 — an Eevee READY to evolve and a Water, Thunder and Fire Stone (pick the
//      form in the Pokémon's card), Pikachu in the lead with „✨ Piorun” in the next battle; the 👤 card shows Ash's trait
// PLAYTEST_008 preparation (ChatGPT morning review 15.10 §10–11) — one situation per thing to check on the iPad:
//   I  the Scyther expedition from the start: the rumour heard, Ash in Fuchsia, nothing taken yet (take → the warden
//      → the trail → the encounter → again after a miss → caught)
//   J  ⚡ First Strike: the Power Plant quest taken, Ash there with two badges — the Engineer's team is Electrode ⚡ +
//      Magneton („⚔️ Wyzwanie” → the arena first, then ⚡)
//   K  a KO: a wild Raticate already out, Ash's lead Magikarp at 1 ❤, Pidgey and Rattata healthy (the pick after the KO)
//   L  type +/−: both in Pewter — Ash's Squirtle for Brock's gym, Misty's Charmander for a duel, Sandshrew for Team
//      Rocket at Mt. Moon (its plot revealed: exploring Mt. Moon finds only them), trainers on Route 3
//   M  an important notice: Ash in Viridian with no action left, the Lost Parcel rumour open but not heard — „Koniec”
//      for Ash and Misty, and Ash's next turn starts with „ROZUMIEM”
//   N  the Trainer Journal: the Scyther expedition and Oak's water research taken, Bill's rumour heard (the slot is full —
//      the Journal says why), Ash at Bill's cottage (its next step: Route 25)
//   O  the HUD's activity cards from three systems (ChatGPT review 15.10, P1): Ash in Fuchsia — the Scyther
//      expedition (its warden here: an action now), „Iskra w Vermilion” done (its reward waits in Vermilion), the mission
//      card „Dwóch nowych przyjaciół” started (1/2), and two more taken (not shown: three at most)
// PLAYTEST_009 (night shift 15.10 — the family's Combat MVP feedback, one situation per fix to check):
//   Q  O's three activity cards + a Team Rocket plot on the map: the cards and the Rocket card never cover each other
//      (PT009-09); the cards' pictures 3 : 4 (PT009-01); a card → its Journal card → ✕ / Escape / the map (PT009-02)
//   R  an event with a choice on the table (the Lost backpack, Route 1): the card art left, the text and the choices
//      right (PT009-03); the player popup's missions → the Journal (PT009-08)
//   S  Ash in Pewter's Poké Stop with money and two actions: in the dev-1610 set (`&dev=1610`) entering the Sklep,
//      looking and leaving cost nothing; the first purchase pays its one action (PT009-06); older sets: as before
// COMBAT 2.1 (Piotr 16.10 — open with `&dev=c21` / `&dev=c21b` or in the dev-1610-c21 / dev-1610-c21b package):
//   T  Ash's Pikachu poisoned at 2 ❤ (an Antidote in the bag), no action left: „Koniec” for Ash and Misty → Ash's turn
//      starts with „Pikachu traci 1 HP od trucizny!” (ROZUMIEM); the ☠️ on the card / the widget; the Antidote cures it
//   U  a wild Pidgeotto poisoned at 1 ❤: „Zmiana” → it strikes back → its poison roll (1–2) knocks it out — the battle's
//      own end („zemdlał od trucizny”)
// PLAYTEST_016 (26.10 night — the family's Build 3.10 game; DEV pilots from the URL, e.g. `&dev=fam310,catchguard`):
//   V  the Safari poachers (Team Rocket: no catching) and Ash's Scyther expedition at its encounter step in the Safari
//      Zone — 3.10: the encounter starts, the balls say why they are off; catchguard: the encounter waits, „Wyzwij”
//   W  Team Rocket's fossil thieves at Mt. Moon, Ash on Route 3, Misty in Mt. Moon — 3.10: walk through; rocketentry: a
//      battle on entry (Ash) and at Misty's turn start (she stood there when Rocket came)
//   P  the Combat MVP (its package, dev-1510-combat): Ash's Pikachu (Fala elektryczna — paraliż), Bulbasaur (Trujący pył,
//      Liście brzytwy), Charmander (Żar — oparzenie) against a wild Pidgeotto that knows a Special and a Powerful
// Positions, teams and quest stages are SET (a fixture); everything afterwards is the real game.
import { CONFIG } from '../config.js';
import { createGame, createPokemonInstance } from '../engine/gameState.js';
import { dispatch } from '../engine/turnEngine.js';
import { appearWild } from '../engine/encounterEngine.js';
import { recordQuestEvent } from '../engine/questEngine.js';
import { debugSetPlot } from '../engine/rocketEngine.js';
import { getSpecies } from '../data/pokemon.js';
import { applyAdventure, applyDevPilots } from './setup.js';
import { growthEdge } from '../engine/growthEngine.js';
import { onChampion } from '../engine/endgameEngine.js';
import { setWorldFlag } from '../engine/incidentEngine.js';
import { openChapter } from '../engine/rocketCampaignEngine.js';
import { takeQuest } from '../engine/questBookEngine.js';
import { POKEMON } from '../data/pokemon.js';

export const SCENARIOS = {
  A: 'Normalny start',
  B: 'Plotka usłyszana + aktywna misja',
  C: 'Wyprawa: Scyther',
  D: 'Dwóch graczy w Poké Stopie — wymiana',
  E: 'Dwóch graczy w jednym miejscu — pojedynek',
  F: 'Krok od pierwszego osiągnięcia',
  G: 'Stara wędka i łowienie',
  H: 'Eevee, ruch specjalny i cecha postaci',
  I: 'Wyprawa Scyther od początku',
  J: '⚡ Szybkie wejście (Elektrownia)',
  K: 'KO — kto walczy dalej?',
  L: 'Przewaga typów: sala, pojedynek, Team Rocket',
  M: 'Plotka — ważny komunikat (ROZUMIEM)',
  N: 'Dziennik Trenera',
  O: 'Kafelki obok profilu: trzy rodzaje zadań',
  P: 'Ataki i statusy (Combat MVP)',
  Q: 'PT009: kafelki zadań i Team Rocket',
  R: 'PT009: wydarzenie (obrazek po lewej)',
  S: 'PT009: sklep — oglądanie bez akcji',
  T: 'Combat 2.1: trucizna po walce',
  U: 'Combat 2.1: KO od trucizny w walce',
  V: 'PT016: Safari — Team Rocket blokuje łapanie (Scyther)',
  W: 'PT016: Team Rocket w Mt. Moon — wejście',
  // 12.11 (iPad QA of the DEV pilots — open with ?dev=fam311,fly,surf,bag,tm,evomove&scenario=X … Z)
  X: 'TM: Celadon — sklep z płytami i sala Eriki',
  Y: 'TM: Dojo w Saffron i nowy ruch po ewolucji',
  Z: 'Surf + Lot + Plecak w jednej grze',
  // PLAYTEST_019 PT019-06: the legends' QA — open with ?dev=fam311,mewtwo6,articuno1,moltres1&scenario=L1 … L4 (the lines'
  // own pilots, OFF in every set; their thresholds unchanged). Without the pilots: the plain place and badges
  L1: 'Legendy: Mewtwo — Cinnabar, 5 odznak (linia od 5, spotkanie od 6)',
  L2: 'Legendy: Mewtwo — Cinnabar, 6 odznak (cała linia)',
  L3: 'Legendy: Articuno — Fuchsia, 6 odznak (cała linia)',
  L4: 'Legendy: Moltres — Cinnabar, 8 odznak (cała linia)',
  // PLAYTEST_021: Zapdos as every fam311 game has it (legendStory v3: the line from 3 badges or week 8, Cerulean → Power
  // Plant, Ultra Ball only) — no extra pilot; and the end of a game with points (rules.victory, set by the scenario)
  L5: 'Legendy: Zapdos — Cerulean, 3 odznaki (cała linia, Ultra Ball)',
  K1: 'Punkty: Mistrz Kanto — ostatni tydzień (Ash jest Mistrzem, Misty kończy tydzień)',
  K2: 'Punkty: Wielka Przygoda — ostatni tydzień (Ash jest Mistrzem, Misty ma więcej punktów)',
  // SNORLAX-1 (18.11): the Sleeping Snorlax — the pilot `snorlax` is turned on for these two when the address lacks it
  SN1: 'Snorlax: Ash z Poké Flute na trasie 13 — krok na trasę 12 budzi Snorlaxa',
  SN2: 'Snorlax: obudzony — Ash na trasie 12 może go spotkać i złapać',
  // BIKE-1 (18.11 owner GO): the bicycle — the pilot `bike` is turned on for these when the address lacks it
  BK1: 'Rower: Ash z rowerem w Saffron — 4 szlaki rowerowe (Cerulean, Vermilion, Celadon, Lavender)',
  BK2: 'Rower: Ash z rowerem na Route 16 — zjazd Cycling Road do Route 18; Misty w Vermilion bierze kupon',
  // BIKE V2 (22.11 ChatGPT GO): 3 pola za 2 akcje — the pilot `bike2` is turned on for these when the address lacks it
  BV1: 'Rower V2: Ash z rowerem w Celadon — 4 przejazdy (Fuchsia zjazdem Cycling Road); Misty w Vermilion z 1 odznaką bierze „Pojedynek w Fan Clubie”',
  BV2: 'Rower V2: Ash z rowerem w Vermilion — Team Rocket na Route 6 zatrzyma przejazd (podgląd pokazuje 🎈)',
  // CUT-1 (18.11 owner GO): HM Cut — the pilot `cut` is turned on for these when the address lacks it
  CT1: 'Cut: Ash z HM Cut, Cascade Badge i Oddishem w Cerulean — krzaczek do ścięcia',
  CT2: 'Cut: Ash w Vermilion bez HM i bez odznaki — misja „Kapitan statku” i powód, czemu jeszcze nie zetnie',
  // CUT2 (23.11, ChatGPT B1): teaching Cut — the pilot `cut2` is turned on when the address lacks it
  CU1: 'Cut2: Ash z HM Cut i Cascade Badge w Cerulean — nikt nie umie ciąć; naucz Scythera w Plecaku, potem zetnij krzaczek',
  // ROCKET-2 R1.1 (18.11 owner GO): Celadon under Team Rocket — the pilot `rocketcampaign` (RC2: the shop variant `rocketcampaigns`) is turned on when the address lacks it
  RC1: 'Rocket: Celadon pod kontrolą Team Rocket — Ash w Celadon bierze misję i walczy w Game Corner (sklep działa)',
  RC2: 'Rocket (wariant): Celadon pod kontrolą — sklep zamknięty, leczenie działa',
  // ROCKET-2 R1.2 (21.11): Mt. Moon (`rocketcampaign2`); the gift R-4 (`rocketgift`)
  RC3: 'Rocket R1.2: Mt. Moon pod kontrolą — Ash w Mt. Moon z misją „Kamień Księżycowy”, walka ze złodziejami uwalnia jaskinię',
  RC4: 'Rocket (prezent R-4): Celadon uwolnione — Misty o krok od miasta dostanie Poké Ball przy pierwszej wizycie',
  // PLAYTEST_022 set B (21.11): every new mechanic together — the pilots of set B are turned on when the address lacks them
  P22: 'PT022 pełny: Ash w Saffron z rowerem, HM Cut i Oddishem — szlak do Celadon (pod kontrolą Rocket), krzaczek, misja Rocket; Snorlax śpi',
  // UX-2311 (23.11, the Journal and the preview-first quest taking): open with the family set + `ux` (?dev=…,ux&scenario=UJ)
  UJ: 'Dziennik UX-2311: Ash w Vermilion (tydzień 4) — 2 przygody i 2 karty misji, plotki (kurier tutaj, Scyther w Fuchsii), tablica zleceń, zlecenie w terenie na Route 11, HM Cut u kapitana',
};
// the first gyms, in the order of the eight (Kanto's)
const BADGES = ['pewter', 'cerulean', 'vermilion', 'celadon', 'fuchsia', 'saffron', 'cinnabar', 'viridian'];

const team = (s, ids) => ids.map((id) => createPokemonInstance(s, id));
const must = (s, action) => {
  const r = dispatch(s, action);
  if (!r.ok) throw new Error(`scenario: ${action.type} — ${r.error}`);
};
// a rumour open from week 1 and heard by the player (the fixture moves only that opportunity's weeks)
function hearNow(s, player, id) {
  const e = s.rumours.schedule.find((x) => x.id === id);
  if (!e) throw new Error(`scenario: rumour ${id} is not in this game`);
  const span = e.closes - e.appears;
  Object.assign(e, { appears: 1, closes: 1 + span });
  player.rumours.heard[id] = { week: s.turn.round, from: 'pokeStop' };
}

// The scenario tab's storage: the table's save keys (kanto.table.v1 / v2 and their backups) become the scenario's
// own keys; anything else (this device's picture crops) passes through unchanged.
export function scenarioStorage(storage, id) {
  const own = (key) => (/^kanto\.table\.v/.test(key) ? `kanto.table.scenario.${id}.${key.slice('kanto.table.'.length)}` : key);
  return {
    getItem: (key) => storage.getItem(own(key)),
    setItem: (key, value) => storage.setItem(own(key), value),
    removeItem: (key) => storage.removeItem(own(key)),
  };
}

export function buildScenario(id, seed = `SCENARIO-${id}`, options = [], pilots = []) {
  if (!SCENARIOS[id]) throw new Error(`Unknown scenario ${id}`);
  const snorlax = /^SN\d$/.test(id) && !pilots.some((x) => x === 'snorlax' || x === 'snorlaxa') ? ['snorlax'] : []; // SNORLAX-1 QA
  const bike = /^BK\d$/.test(id) && !pilots.includes('bike') ? ['bike'] : /^BV\d$/.test(id) && !pilots.includes('bike2') ? ['bike2'] : []; // BIKE-1 QA; BIKE V2 QA
  const cut = /^CT\d$/.test(id) && !pilots.includes('cut') ? ['cut'] : /^CU\d$/.test(id) && !pilots.includes('cut2') ? ['cut2'] : []; // CUT-1 QA; CUT2 QA
  const p22 = id === 'P22' ? ['snorlax', 'obtain151', 'bike', 'cut', 'rocketcampaign'].filter((x) => !pilots.includes(x)) : []; // PLAYTEST_022 set B QA
  const campaign = /^RC\d$/.test(id) && !pilots.some((x) => /^rocketcampaign/.test(x)) ? ({ RC2: ['rocketcampaigns'], RC3: ['rocketcampaign2', 'kantoa', 'worldquests'], RC4: ['rocketcampaign', 'rocketgift'] }[id] ?? ['rocketcampaign']) : []; // ROCKET-2 QA (R1.1, R1.2, R-4)
  const config = applyDevPilots(applyAdventure(structuredClone(CONFIG), options), [...pilots, ...snorlax, ...bike, ...cut, ...campaign, ...p22]); // the package's set (the Combat MVP package: 'combat'); PT016: the URL's DEV pilots too
  config.dice.mode = 'playerDice';
  const s = createGame({ seed, players: [{ character: 'ash', controller: 'human' }, { character: 'misty', controller: 'human' }], config });
  const [ash, misty] = s.players;
  if (id === 'B') {
    hearNow(s, ash, 'opp-parcel');
    ash.location = 'viridian-city';
    must(s, { type: 'takeQuest', quest: 'viridian-parcel' });
  } else if (id === 'C' || id === 'V') {
    hearNow(s, ash, 'opp-scyther');
    ash.location = 'fuchsia-city';
    ash.team = team(s, ['pikachu', 'pidgeotto', 'ivysaur']);
    ash.pokeballs = 5;
    must(s, { type: 'takeQuest', quest: 'safari-scyther' });
    const a = ash.questBook.active.find((x) => x.questId === 'safari-scyther');
    a.stage = 2; // the warden beaten and the trail found: the encounter step
    a.progress = {};
    ash.location = 'safari-zone';
    if (id === 'V') debugSetPlot(s, 'safari-poachers'); // PT016-01: Team Rocket's net over the Safari's grass
  } else if (id === 'D') {
    ash.team = team(s, ['pikachu', 'pidgey', 'rattata']);
    misty.team = team(s, ['staryu', 'psyduck', 'goldeen']);
    misty.reserve = team(s, ['horsea']);
    for (const p of s.players) p.location = 'pewter-city';
  } else if (id === 'E') {
    ash.team = team(s, ['pikachu', 'pidgey']);
    misty.team = team(s, ['staryu', 'psyduck']);
    for (const p of s.players) p.location = 'route-2';
  } else if (id === 'F') {
    ash.location = 'cerulean-city';
    ash.visited = ['pallet-town', 'route-1', 'viridian-city', 'route-2', 'pewter-city', 'route-3', 'mt-moon', 'route-4', 'cerulean-city'];
  } else if (id === 'G') {
    ash.location = 'cerulean-city';
    must(s, { type: 'takeQuest', quest: 'sailor-water-show' });
    ash.team = team(s, ['pikachu', 'staryu', 'psyduck']);
    ash.pokeballs = 5;
    ash.location = 'route-6';
  } else if (id === 'H') {
    const eevee = createPokemonInstance(s, 'eevee');
    eevee.growth = 99; // READY (capped to its threshold on the card)
    ash.team = [team(s, ['pikachu'])[0], eevee, team(s, ['pidgey'])[0]];
    Object.assign(ash.items, { waterstone: 1, thunderstone: 1, firestone: 1 });
    ash.location = 'route-2';
  } else if (id === 'I') {
    hearNow(s, ash, 'opp-scyther');
    ash.team = team(s, ['pikachu', 'pidgeotto', 'ivysaur']);
    ash.pokeballs = 5;
    ash.location = 'fuchsia-city';
  } else if (id === 'J') {
    hearNow(s, ash, 'opp-power-plant');
    ash.badges = ['boulder', 'cascade']; // a quest trainer's team grows with the badges: two → his strongest
    ash.team = team(s, ['pikachu', 'pidgeotto', 'ivysaur']);
    ash.location = 'power-plant';
    must(s, { type: 'takeQuest', quest: 'power-plant-fault' });
    s.turn.actionsRemaining = Math.max(s.turn.actionsRemaining, 1);
  } else if (id === 'K') {
    ash.team = team(s, ['magikarp', 'pidgey', 'rattata']);
    ash.team[0].hp = 1;
    ash.location = 'route-1';
    appearWild(s, getSpecies('raticate'), 'grass'); // the engine's own „a wild … appears”
  } else if (id === 'L') {
    ash.team = team(s, ['squirtle', 'sandshrew', 'pikachu']);
    misty.team = team(s, ['charmander', 'goldeen']);
    ash.pokeballs = 5;
    for (const p of s.players) p.location = 'pewter-city';
    debugSetPlot(s, 'fossil-thieves');
  } else if (id === 'M') {
    const e = s.rumours.schedule.find((x) => x.id === 'opp-parcel');
    const span = e.closes - e.appears;
    Object.assign(e, { appears: 1, closes: 1 + span });
    ash.rumours.lastHeardRound = 0;
    ash.location = 'viridian-city';
    misty.location = 'route-11'; // no Poké Stop, far from Viridian (its rumour reaches 4 steps): Ash hears it, not Misty
    s.turn.actionsRemaining = 0; // „Koniec” ends Ash's turn at once
  } else if (id === 'N') {
    hearNow(s, ash, 'opp-scyther');
    hearNow(s, ash, 'opp-bill');
    ash.team = team(s, ['pikachu', 'pidgeotto', 'ivysaur']);
    ash.location = 'fuchsia-city';
    must(s, { type: 'takeQuest', quest: 'safari-scyther' });
    must(s, { type: 'takeQuest', quest: 'oak-water' });
    ash.location = 'bills-cottage';
    s.turn.actionsRemaining = Math.max(s.turn.actionsRemaining, 1);
  } else if (id === 'P') {
    const [pika, bulba, charm] = team(s, ['pikachu', 'bulbasaur', 'charmander']);
    pika.moves = { special: 'thunderWave', powerful: 'thunderbolt' };
    bulba.moves = { special: 'poisonPowder', powerful: 'razorLeaf' };
    charm.moves = { special: 'ember', powerful: null };
    ash.team = [pika, bulba, charm];
    ash.location = 'route-1';
    const wild = appearWild(s, getSpecies('pidgeotto'), 'grass');
    wild.moves = { special: 'quickAttack', powerful: 'wingAttack' };
  } else if (id === 'S') {
    ash.location = 'pewter-city';
    ash.money = 10;
    s.turn.actionsRemaining = 2;
  } else if (id === 'T') {
    const [pika, rat] = team(s, ['pikachu', 'rattata']);
    pika.hp = 2;
    pika.status = { id: 'poison', ticks: 0 }; // a Combat 2.1 poison that outlived its battle (in an S1 set it simply never ticks)
    ash.team = [pika, rat];
    ash.items.antidote = 1;
    ash.location = 'route-1';
    misty.location = 'route-11';
    s.turn.actionsRemaining = 0;
  } else if (id === 'X') {
    // TM-2: Celadon's shop sells three TMs (💰6) and Erika gives hers with the badge — a team strong enough for her
    ash.team = team(s, ['pikachu', 'charizard', 'pidgeot']);
    ash.location = 'celadon-city';
    ash.money = 20;
    ash.badges = ['pewter', 'cerulean', 'vermilion'];
  } else if (id === 'Y') {
    // TM-2: the Dojo's quest „Trening w Dojo” is taken here; TM-4: Charmander is ready to evolve with no move — the new form
    // offers one (Ewoluuj → „💿 Naucz ruchu”)
    ash.team = team(s, ['charmander', 'golem', 'gyarados']);
    const c = ash.team[0];
    c.moves = { special: null, powerful: null };
    c.growth = growthEdge(c, s.config.rules)?.growth ?? 0;
    ash.location = 'saffron-city';
    ash.badges = ['pewter', 'cerulean', 'vermilion'];
  } else if (id === 'Z') {
    // FLY + SURF + KEY-1 + TM: both HMs, both badges, a bird and a swimmer; two TMs — Vermilion: the sea route S1 to Pallet,
    // a flight to a visited city, the „Plecak” with both HMs (✓) and the discs
    ash.team = team(s, ['pidgeotto', 'lapras', 'pikachu']);
    ash.location = 'vermilion-city';
    ash.badges = ['pewter', 'cerulean', 'vermilion', 'fuchsia'];
    ash.capabilities.canTravelWater = true; // the Soul Badge's grant
    ash.visited = [...new Set([...(ash.visited ?? []), 'pallet-town', 'viridian-city', 'pewter-city', 'cerulean-city', 'celadon-city', 'vermilion-city'])];
    ash.questBook.keyItems.push('hmFly', 'hmSurf');
    if (ash.tms) Object.assign(ash.tms, { tm03: 1, tm09: 1 });
  } else if (['L1', 'L2', 'L3', 'L4', 'L5'].includes(id)) {
    // PT019-06: a strong team, the badges the line asks for, the sea open (Seafoam, Cinnabar), the line's start place
    const n = { L1: 5, L2: 6, L3: 6, L4: 8, L5: 3 }[id];
    ash.team = team(s, ['alakazam', 'gyarados', 'golem', 'arcanine']);
    ash.badges = BADGES.slice(0, n);
    if (id !== 'L5') ash.capabilities.canTravelWater = true; // the Soul Badge's grant (Fuchsia is among the first five)
    ash.location = { L3: 'fuchsia-city', L5: 'cerulean-city' }[id] ?? 'cinnabar-island';
    ash.pokeballs = 5;
    ash.items = { ...(ash.items ?? {}), ultraball: 3 }; // a legend: Ultra Ball only (DEC-01)
    ash.visited = [...new Set([...(ash.visited ?? []), 'fuchsia-city', 'cinnabar-island', 'pallet-town'])];
  } else if (id === 'SN1' || id === 'SN2') {
    // SNORLAX-1: a strong team and balls; SN1 the flute line at its last step (the flute in the bag, one step from Route 12);
    // SN2 Snorlax already awake (the road open), Ash on Route 12
    ash.team = team(s, ['pikachu', 'pidgeotto', 'ivysaur', 'gyarados']);
    ash.pokeballs = 6;
    ash.items = { ...(ash.items ?? {}), superball: 2 };
    ash.badges = BADGES.slice(0, 4);
    misty.location = 'vermilion-city';
    if (id === 'SN1') {
      ash.location = 'lavender-town';
      takeQuest(s, 'epic-snorlax');
      ash.questBook.active.find((a) => a.questId === 'epic-snorlax').stage = 2;
      ash.questBook.keyItems.push('pokeFlute');
      ash.location = 'route-13';
    } else {
      setWorldFlag(s, 'snorlaxAwake');
      ash.location = 'route-12';
    }
  } else if (id === 'BK1' || id === 'BK2') {
    // BIKE-1: the bicycle in the bag (BK1 in Saffron — four trails; BK2 on Route 16 — the downhill); BK2: Misty in Vermilion
    // with three different Pokémon, the Fan Club's quest to take
    ash.team = team(s, ['pikachu', 'pidgeotto', 'ivysaur']);
    ash.badges = BADGES.slice(0, 3);
    ash.questBook.keyItems.push('bicycle');
    ash.location = id === 'BK1' ? 'saffron-city' : 'route-16';
    ash.visited = [...new Set([...(ash.visited ?? []), ash.location])];
    misty.team = team(s, ['staryu', 'goldeen', 'psyduck']);
    misty.location = 'vermilion-city';
  } else if (id === 'BV1' || id === 'BV2') {
    // BIKE V2: the bicycle in the bag — BV1 in Celadon (the downhill to Fuchsia among four rides), Misty in Vermilion with one
    // badge and three different Pokémon (the Fan Club's duel to take); BV2 in Vermilion with Team Rocket's roadblock on Route 6
    ash.team = team(s, ['pikachu', 'pidgeotto', 'ivysaur']);
    ash.badges = BADGES.slice(0, 3);
    ash.questBook.keyItems.push('bicycle');
    ash.location = id === 'BV1' ? 'celadon-city' : 'vermilion-city';
    ash.visited = [...new Set([...(ash.visited ?? []), ash.location])];
    misty.team = team(s, ['staryu', 'goldeen', 'psyduck']);
    misty.badges = BADGES.slice(0, 1);
    misty.location = 'vermilion-city';
    if (id === 'BV2') debugSetPlot(s, 'route6-roadblock');
  } else if (id === 'CT1' || id === 'CT2') {
    // CUT-1: CT1 everything for Cut in Cerulean (the HM, the Cascade Badge, Oddish awake) — its bush waits; CT2 nothing yet,
    // in Vermilion: the captain's quest to take, and the bush there says what is missing
    ash.team = team(s, ['pikachu', 'oddish', 'pidgeotto']);
    if (id === 'CT1') {
      ash.badges = ['pewter', 'cerulean'];
      ash.questBook.keyItems.push('hmCut');
      ash.location = 'cerulean-city';
    } else {
      ash.badges = ['pewter'];
      ash.location = 'vermilion-city';
    }
    misty.location = 'celadon-city';
  } else if (id === 'CU1') {
    // CUT2: everything for Cut but a Pokémon that KNOWS it — Scyther can learn it (Plecak → HM Cut), Pikachu / Pidgeotto cannot
    ash.team = team(s, ['pikachu', 'scyther', 'pidgeotto']);
    ash.badges = ['pewter', 'cerulean'];
    ash.questBook.keyItems.push('hmCut');
    ash.location = 'cerulean-city';
    misty.location = 'celadon-city';
  } else if (id === 'RC3') {
    // ROCKET-2 R1.2: Mt. Moon has fallen; Ash in the cave with the astronomer's line at its battle (the Moon Stone thieves)
    openChapter(s, 'mtmoon');
    ash.team = team(s, ['pikachu', 'ivysaur', 'pidgeotto', 'onix']);
    ash.badges = BADGES.slice(0, 2);
    ash.location = 'route-3';
    takeQuest(s, 'w-moon-night-v2');
    ash.location = 'mt-moon';
    misty.location = 'cerulean-city';
  } else if (id === 'RC4') {
    // ROCKET-2 R-4: Celadon was freed by Ash (standing there — his ball already given); Misty one step away, on Route 7
    openChapter(s, 'celadon');
    s.rocketCampaign.chapters.celadon.freed = { by: ash.id, week: s.turn.round };
    ash.campaignGifts = ['celadon'];
    ash.location = 'celadon-city';
    misty.team = team(s, ['staryu', 'goldeen', 'psyduck']);
    misty.location = 'route-7';
    s.turn.playerIndex = 1;
  } else if (id === 'P22') {
    // PLAYTEST_022 set B: Celadon under Team Rocket (week 2's notice), Ash in Saffron with the bike, the HM Cut, the Cascade
    // Badge and Oddish (who cuts); Snorlax asleep on Route 11 ↔ 12; Misty in Pewter by the fossil quest
    openChapter(s, 'celadon');
    ash.team = team(s, ['pikachu', 'oddish', 'pidgeotto', 'onix']);
    ash.badges = BADGES.slice(0, 3);
    ash.questBook.keyItems.push('bicycle', 'hmCut');
    ash.location = 'saffron-city';
    ash.visited = [...new Set([...(ash.visited ?? []), 'saffron-city'])];
    misty.location = 'pewter-city';
    misty.badges = BADGES.slice(0, 1);
  } else if (id === 'UJ') {
    // UX-2311: Ash in Vermilion in week 4 — two adventures taken in week 2 (one started: a new species seen), so two of the four
    // places are free; three rumours heard (the courier's starts HERE, the Scyther's in Fuchsia, the parcel's taken); the city's
    // board, its field cards on Route 11 / 13; the captain's HM Cut and the Fan Club's duel to take here
    ash.team = team(s, ['pikachu', 'oddish', 'pidgeotto']);
    ash.badges = BADGES.slice(0, 2);
    s.turn.round = 2;
    for (const r of ['opp-parcel', 'opp-courier', 'opp-scyther']) hearNow(s, ash, r);
    ash.location = 'pewter-city';
    takeQuest(s, 'oak-field-research');
    ash.location = 'viridian-city';
    takeQuest(s, 'viridian-parcel');
    ash.pokedex.seen = [...new Set([...ash.pokedex.seen, 'drowzee'])];
    s.turn.round = 4;
    ash.location = 'vermilion-city';
    ash.visited = [...new Set([...(ash.visited ?? []), 'pewter-city', 'viridian-city', 'vermilion-city'])];
    misty.location = 'cerulean-city';
  } else if (id === 'RC1' || id === 'RC2') {
    // ROCKET-2 R1.1: Celadon has fallen (its notice in the log); Ash in Celadon with a team ready for the Game Corner Rockets
    openChapter(s, 'celadon');
    ash.team = team(s, ['pikachu', 'ivysaur', 'pidgeotto', 'onix']);
    ash.badges = BADGES.slice(0, 3);
    ash.money = 12;
    ash.location = 'celadon-city';
    misty.location = 'saffron-city';
  } else if (id === 'K1' || id === 'K2') {
    // PLAYTEST_021: the final week of a game with points — Ash beat Lance (frozen), Misty plays the week's last turn;
    // „Koniec tury” ends the game. K2: Misty's collection outweighs the Champion's bonus.
    s.config.rules.victory = id === 'K1' ? 'a' : 'b';
    const dex = POKEMON.filter((x) => !x.legendary).map((x) => x.id);
    ash.team = team(s, ['pikachu', 'charizard', 'blastoise', 'venusaur']);
    ash.badges = BADGES.slice();
    ash.pokedex.caught = dex.slice(0, 12);
    ash.location = 'indigo-plateau';
    misty.team = team(s, ['starmie', 'gyarados', 'lapras']);
    misty.badges = BADGES.slice(0, 6);
    misty.pokedex.caught = dex.slice(0, id === 'K1' ? 20 : 80);
    misty.location = 'cerulean-city';
    for (const p of [ash, misty]) p.pokedex.seen = [...new Set([...p.pokedex.seen, ...p.pokedex.caught])];
    s.turn.round = 40;
    ash.league.ribbon = true;
    ash.league.champion = true;
    onChampion(s, ash); // the final week starts; Ash's turn ends at once
    must(s, { type: 'endTurn' });
  } else if (id === 'W') {
    ash.team = team(s, ['pikachu', 'pidgeotto', 'ivysaur']);
    ash.location = 'route-3';
    misty.team = team(s, ['staryu', 'psyduck']);
    misty.location = 'mt-moon'; // with rocketentry: Rocket lands where Misty stands — she meets them at her turn start
    debugSetPlot(s, 'fossil-thieves'); // PT016-11: Team Rocket at Mt. Moon, one step ahead
  } else if (id === 'U') {
    ash.team = team(s, ['pikachu', 'bulbasaur']);
    ash.location = 'route-1';
    const wild = appearWild(s, getSpecies('pidgeotto'), 'grass');
    wild.hp = 1;
    if (['c21', 'c21b'].includes(s.config.rules.statusRules)) wild.status = { id: 'poison', ticks: 0 };
    else (s.encounter.status ??= {})[wild.uid] = { id: 'poison', ticks: 0 };
  } else if (id === 'R') {
    ash.location = 'route-1';
    s.phase = 'event'; // as drawEvent leaves it after an Explore found this card
    s.pendingEvent = { id: s.config.rules.eventPack === 'b4h2' ? 'rustling-backpack' : 'lost-backpack', biome: 'grass' }; // K-05 W1: the set's own backpack
  } else if (id === 'O' || id === 'Q') {
    ash.team = team(s, ['pikachu', 'pidgeotto', 'ivysaur']);
    ash.location = 'vermilion-city';
    must(s, { type: 'takeQuest', quest: 'vermilion-spark' });
    recordQuestEvent(s, ash, { kind: 'catch', species: 'pikachu', location: 'route-11', biome: 'grass' }); // done: collect in Vermilion
    ash.location = 'fuchsia-city';
    must(s, { type: 'takeQuest', quest: 'oak-water' });
    hearNow(s, ash, 'opp-scyther');
    must(s, { type: 'takeQuest', quest: 'safari-scyther' });
    // the mission cards after the catch (it would count for „Złap 2 Pokémony”): one started, one only taken
    ash.quests = [{ questId: 'oak-two', progress: 1, acquiredRound: s.turn.round }, { questId: 'jenny-trainer', progress: 0, acquiredRound: s.turn.round }];
    s.turn.actionsRemaining = Math.max(s.turn.actionsRemaining, 2);
    if (id === 'Q') debugSetPlot(s, 'fossil-thieves'); // the Team Rocket card on the map with the HUD's three cards
  }
  s.scenario = id; // a marker for the table (the settings say it is a test scenario)
  return s;
}

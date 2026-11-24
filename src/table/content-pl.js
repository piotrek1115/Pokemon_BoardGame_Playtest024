// Polish presentation layer for the family tabletop: player-facing content by
// stable id (missions, events, trainers, Team Rocket plots, gyms, League,
// Hall of Fame) and formatters for rewards / effects. Ids, data files and the
// engine stay untouched; the developer harness keeps English.
// Canonical proper names stay: Pokémon, Kanto places, characters, Team Rocket,
// gym leaders, badge names.
import { QUESTS_BY_ID } from '../data/quests.js';
import { getLocation } from '../data/locations.js';
import { EVENTS_BY_ID } from '../data/events.js';
import { ROCKET_PLOTS_BY_ID } from '../data/rocketPlots.js';
import { TRAINER_ARCHETYPES_BY_ID } from '../data/trainers.js';
import { getSpecies } from '../data/pokemon.js';
import { GYMS_BY_ID } from '../data/gyms.js';
import { BIOME_PL, ITEM_PL, TYPE_PL } from './i18n.js';
import { ITEMS } from '../data/items.js';
import { OPPORTUNITIES } from '../data/rumours.js';
import { questIdIn } from '../engine/questVersions.js';
import { getMove } from '../combat2/moves.js';
import { TM_DEFINITIONS } from '../combat2/learnsets.js';

export const QUEST_PL = {
  'oak-water': { giver: 'Prof. Oak', title: 'Wodne badania', text: 'Złap dowolnego Pokémona wodnego.' },
  'oak-flying': { giver: 'Prof. Oak', title: 'Obserwacja ptaków', text: 'Złap dowolnego Pokémona latającego.' },
  'bug-catcher': { giver: 'Łapacz robaków Rick', title: 'Kolekcja robaków', text: 'Złap Pokémona typu robak.' },
  'oak-two': { giver: 'Prof. Oak', title: 'Dwóch nowych przyjaciół', text: 'Złap 2 Pokémony.' },
  'oak-rare': { giver: 'Prof. Oak', title: 'Rzadki okaz', text: 'Złap rzadkiego albo bardzo rzadkiego Pokémona.' },
  'jenny-trainer': { giver: 'Oficer Jenny', title: 'Dzień treningu', text: 'Wygraj walkę z trenerem.' },
  'joy-flawless': { giver: 'Siostra Joy', title: 'Nikt nie ucierpi', text: 'Wygraj walkę z trenerem tak, by żaden twój Pokémon nie zemdlał.' },
  'joy-evolve': { giver: 'Siostra Joy', title: 'Rośniemy!', text: 'Ewoluuj dowolnego Pokémona.' },
  'hiker-cave': { giver: 'Wędrowiec Marcos', title: 'W ciemność', text: 'Eksploruj jaskinię.' },
  'swimmer-sea': { giver: 'Pływak Luis', title: 'Morska bryza', text: 'Eksploruj morze albo plażę.' },
  'ranger-forest': { giver: 'Leśniczy', title: 'Leśni przyjaciele', text: 'Złap Pokémona w Viridian Forest.' },
  'scout-victory': { giver: 'Zwiadowca Ligi', title: 'Droga do Ligi', text: 'Eksploruj Victory Road.' },
  'collector-mtmoon': { giver: 'Kolekcjoner skamielin', title: 'Kamienie księżycowe', text: 'Eksploruj Mt. Moon.' },
  'bill-cottage': { giver: 'Bill', title: 'Zaproszenie od Billa', text: 'Odwiedź Bill’s Cottage.' },
  'fuji-lavender': { giver: 'Pan Fuji', title: 'Wizyta u pana Fuji', text: 'Idź do Lavender Town.' },
  'warden-safari': { giver: 'Strażnik Safari', title: 'Dzień na safari', text: 'Złap Pokémona w Safari Zone.' },
  'jenny-patrol': { giver: 'Oficer Jenny', title: 'Długi patrol', text: 'Dotrzyj do dalekiego miasta.' },
  'oak-field': { giver: 'Prof. Oak', title: 'Badania terenowe', text: 'Eksploruj w 3 różnych miejscach.' },
};

export const EVENT_PL = {
  'found-pokeball': { title: 'Błyszczące znalezisko!', text: 'Coś czerwono-białego błyszczy w trawie. To Poké Ball!' },
  'dropped-coins': { title: 'Dziura w kieszeni', text: 'Ojej! Moneta toczy się do rowu.' },
  'berry-bush': { title: 'Krzak jagód', text: 'Znajdujesz krzak pełen dojrzałych jagód Oran.', choices: ['Nakarm prowadzącego Pokémona (+2 ❤)', 'Sprzedaj jagody (+1 💰)'] },
  'rustling-grass': { title: 'Szelest w trawie', text: 'Coś dużego porusza się w wysokiej trawie…' },
  'friendly-hiker': { title: 'Zmęczony wędrowiec', text: 'Wędrowiec prosi o pomoc w niesieniu ciężkiego plecaka.', choices: ['Pomóż mu (+2 💰, prowadzący −1 ❤)', 'Pomachaj i idź dalej'] },
  'sudden-rain': { title: 'Nagła ulewa', text: 'Leje jak z cebra! Czekasz pod drzewem i tracisz czas.' },
  shortcut: { title: 'Sekretny skrót', text: 'Miejscowe dziecko pokazuje ci ukrytą ścieżkę.' },
  'nurse-joy': { title: 'Siostra Joy na obchodzie', text: 'Siostra Joy sprawdza, jak czują się twoje Pokémony.' },
  'lost-pokemon': { title: 'Zagubiony Pokémon', text: 'Mały Pokémon wygląda na zagubionego i trochę przestraszonego.', choices: ['Pomóż mu znaleźć rodzinę (+1 💰)', 'Spróbuj się zaprzyjaźnić (dziki Pokémon)'] },
  // bonus 14.10 (rules.eventPack 'b4h')
  'lost-backpack': { title: 'Zgubiony plecak', text: 'Przy ścieżce leży plecak — na zawieszce imię wędrowca, który idzie kawałek przed tobą.', choices: ['Odnieś go (w podzięce Potion)', 'Zostaw go na miejscu'] },
  // PLAYTEST_009 K-05 W1 (rules.eventPack 'b4h2')
  'rustling-backpack': { title: 'Szelest w plecaku', text: 'Przy ścieżce leży plecak — na zawieszce imię wędrowca, który idzie kawałek przed tobą. Coś w środku szeleści…', choices: ['Odnieś go właścicielowi (w podzięce Potion)', 'Zostaw go na miejscu', 'Zajrzyj do środka (dziki Pokémon)'] },
  'lost-trainer': { title: 'Zagubiony trener', text: 'Młody trener zgubił drogę. „Dzięki! Może walka treningowa?”', choices: ['Pokaż drogę i walcz (walka z trenerem)', 'Pokaż drogę i idź dalej'] },
  'strange-tracks': { title: 'Dziwne ślady', text: 'Ogromne odciski łap prowadzą w bok od ścieżki…', choices: ['Idź śladem (dziki Pokémon, rzadkość +2)', 'Lepiej nie'] },
  'road-bully': { title: 'Natręt na drodze', text: 'Niegrzeczny trener zaczepia podróżnika!', choices: ['Stań w obronie (walka z trenerem)', 'Zawołaj Policjantkę Jenny (+1 💰 od podróżnika)'] },
  'hidden-stash': { title: 'Ukryty schowek', text: 'Pod płaskim kamieniem: zapomniany schowek trenera!' },
  'local-rumour': { title: 'Opowieść mieszkańca', text: 'Mieszkaniec opowiada, o czym mówi się w Kanto…' },
  'old-man-deal': { title: 'Staruszek z workiem', text: '„Poké Ball na zbyciu, młody trenerze? Tylko 1 moneta!”', choices: ['Kup Poké Ball (−1 💰)', 'Nie, dziękuję'] },
};

export const TRAINER_PL = {
  'bug-catcher': { name: 'Łapacz robaków', icon: '🐛' }, youngster: { name: 'Młodzik', icon: '🧢' }, lass: { name: 'Dziewczyna', icon: '🎀' },
  hiker: { name: 'Wędrowiec', icon: '🥾' }, fisherman: { name: 'Wędkarz', icon: '🎣' }, sailor: { name: 'Marynarz', icon: '⚓' },
  camper: { name: 'Obozowicz', icon: '⛺' }, picnicker: { name: 'Piknikowiczka', icon: '🧺' }, scientist: { name: 'Naukowiec', icon: '🔬' },
  psychic: { name: 'Medium', icon: '🔮' }, channeler: { name: 'Wróżka', icon: '🕯️' }, biker: { name: 'Motocyklista', icon: '🏍️' },
  'bird-keeper': { name: 'Hodowca ptaków', icon: '🪶' }, swimmer: { name: 'Pływak', icon: '🏊' },
  gentleman: { name: 'Dżentelmen', icon: '🎩' }, // BIKE V2: the Fan Club's chairman (a quest challenge only — never a random trainer)
};

export const DIFFICULTY_PL = { easy: { name: 'łatwy', stars: '★☆☆' }, medium: { name: 'średni', stars: '★★☆' }, hard: { name: 'trudny', stars: '★★★' } };

export const PLOT_PL = {
  'tower-ghosts': { title: 'Duchy z Pokémon Tower', flavor: 'Buu! To tylko Jessie w prześcieradle… i Meowth w przebraniu ducha.', text: 'Eksploracja w Lavender Town trafia tylko na Team Rocket.' },
  'fossil-thieves': { title: 'Złodzieje skamielin', flavor: 'James wykopuje Kamienie Księżycowe i skamieliny na sprzedaż.', text: 'Eksploracja w Mt. Moon trafia tylko na Team Rocket.' },
  'safari-poachers': { title: 'Kłusownicy w Safari', flavor: 'Wielka sieć Meowtha rozciągnięta nad wysoką trawą.', text: 'W Safari Zone nie da się łapać, dopóki ktoś nie pokona Team Rocket.' },
  'route9-ambush': { title: 'Zasadzka na Route 9', flavor: '„Przygotujcie się na kłopoty!” — zza krzaków.', text: 'Wejście na Route 9 ze zdrowym Pokémonem zaczyna walkę z Team Rocket.' },
  'diglett-cave-in': { title: 'Zawał w Diglett’s Cave', flavor: 'Wielkie wiertło Rocketów zawaliło tunel.', text: 'Nikt nie wejdzie do Diglett’s Cave. Wyzwij Team Rocket z Route 2 albo Route 11.' },
  'route6-roadblock': { title: 'Blokada na Route 6', flavor: '„Bramka” Team Rocket na środku drogi.', text: 'Wejście na Route 6 ze zdrowym Pokémonem zaczyna walkę z Team Rocket.' },
  'cycling-road': { title: 'Blokada Cycling Road', flavor: 'Dawny gang motocyklowy Jessie zaparkował w poprzek Cycling Road.', text: 'Droga między Route 16 a Route 17 jest zamknięta. Wyzwij Team Rocket z Route 16 albo Route 17.' },
  'route22-pitfall': { title: 'Dół na Route 22', flavor: '„Wykopaliśmy dziurę!” — pułapka ukryta pod liśćmi.', text: 'Wejście na Route 22 to wpadnięcie do dołu: twoja tura się kończy.' },
  'balloon-getaway': { title: 'Team Rocket ucieka!', flavor: 'Balon-Meowth odlatuje z workiem skradzionych Poké Balli.', text: 'Na początku każdego tygodnia balon przesuwa się o 1 pole wzdłuż strzałki i ląduje na Route 15. Eksploracja tam, gdzie jest balon, trafia tylko na Team Rocket.' },
};

export const GYM_NOTE_PL = { pewter: 'tata Brocka', cerulean: 'siostry Misty: Daisy, Violet i Lily' };
export const LEADER_PL = { 'Sensational Sisters': 'Sensacyjne Siostry' };
export const LEAGUE_STAGE_PL = { eliteFour: 'Elitarna Czwórka', lance: 'Mistrz Lance' };

export const HOF_PL = {
  pokedexMaster: { title: 'Mistrz Pokédexu', measure: 'najwięcej złapanych gatunków' },
  rocketBuster: { title: 'Pogromca Rocketów', measure: 'najwięcej pokonanych spisków' },
  missionAce: { title: 'As misji', measure: 'najwięcej wykonanych misji' },
  gymHero: { title: 'Bohater sal', measure: 'najwięcej odznak' },
};

export const DECIDED_BY_PL = { badges: 'liczba odznak', ribbon: 'Wstęga Elitarnej Czwórki', caught: 'liczba złapanych gatunków', shared: 'remis — wspólne zwycięstwo' };

// ---- lookups with English fallback -------------------------------------------------

export function questPl(id) {
  const q = QUESTS_BY_ID[id];
  return { ...q, ...(QUEST_PL[id] ?? {}) };
}

export function eventPl(id) {
  const e = EVENTS_BY_ID[id];
  const pl = EVENT_PL[id] ?? {};
  return { ...e, title: pl.title ?? e.title, text: pl.text ?? e.text, choices: (e.choices ?? []).map((c, i) => ({ ...c, label: pl.choices?.[i] ?? c.label })) };
}

export function plotPl(id) {
  const p = ROCKET_PLOTS_BY_ID[id];
  return { ...p, ...(PLOT_PL[id] ?? {}) };
}

// "Youngster Joey" → { name: 'Młodzik Joey', icon }
export function trainerPl(trainer) {
  const arch = TRAINER_ARCHETYPES_BY_ID[trainer.archetype];
  const pl = TRAINER_PL[trainer.archetype];
  // a quest's challenge has its own name, not „<archetype> <name>” (07.11: the slice cut it to „Naukowiec dians”)
  if (CHALLENGE_PL[trainer.name]) return { name: CHALLENGE_PL[trainer.name], icon: pl?.icon ?? '🧢' };
  if (!arch || !pl || !trainer.name.startsWith(`${arch.name} `)) return { name: trainer.name, icon: pl?.icon ?? '🧢' };
  return { name: `${pl.name} ${trainer.name.slice(arch.name.length + 1)}`, icon: pl.icon };
}

const THING = {
  money: (n) => `💰${n}`,
  pokeballs: (n) => `${n} × Poké Ball`, pokeball: (n) => `${n} × Poké Ball`,
  superball: (n) => `${n} × Great Ball`, potion: (n) => `${n} × Potion`, revive: (n) => `${n} × Revive`,
  thunderstone: (n) => `${n} × Thunder Stone`, waterstone: (n) => `${n} × Water Stone`, firestone: (n) => `${n} × Fire Stone`,
  leafstone: (n) => `${n} × Leaf Stone`, moonstone: (n) => `${n} × Moon Stone`,
  stars: (n) => `⭐${n}`,
  ultraball: (n) => `${n} × Ultra Ball`, superpotion: (n) => `${n} × Super Potion`, // Build 3.3 E2
  clue: () => 'wskazówka', // Build 3.3 E4
};

export function thingPl(type, amount = 1) {
  return (THING[type] ?? ((n) => `${n} × ${type}`))(amount);
}

// NIGHTSHIFT D / E: what a world flag or a story's (inactive) end means, in words
const WORLD_FLAG_PL = { snorlaxAwake: 'Snorlax budzi się i schodzi z drogi — droga otwarta dla wszystkich' };
export function rewardPl(reward) {
  return reward.map((r) => (r.type === 'pokemon' ? getSpecies(r.species).name : r.type === 'keyItem' ? `${keyItemIcon(r.id)} ${keyItemPl(r.id)}` : r.type === 'worldFlag' ? `🌍 ${WORLD_FLAG_PL[r.flag] ?? r.flag}` : r.type === 'storyEnd' ? `✨ Koniec tropu — ${getSpecies(r.legend).name}: finał czeka na decyzję` : r.type === 'tm' ? `💿 Płyta TM: ${getMove(TM_DEFINITIONS[r.id].move).pl}` : thingPl(r.type, r.amount))).join(' + ');
}

// Build 3.3 E3 — the quest book in Polish (titles, givers). Steps are written from the
// objective itself (bookStepPl), so a new quest needs only its title here.
export const QUESTBOOK_PL = {
  'safari-scyther': { title: 'Polowanie w Safari', giver: 'Strażnik Safari' }, // PLAYTEST_006 C4 (DEV pilot)
  // PLAYTEST_006 C5 — the rumours' quests (DEV pilot)
  'viridian-parcel': { title: 'Zgubiona paczka', giver: 'Sprzedawca z Viridian' },
  'vermilion-courier': { title: 'Kurier z portu', giver: 'Marynarz z Vermilion' },
  'bill-teleporter': { title: 'Wypadek Billa', giver: 'Bill' },
  'power-plant-fault': { title: 'Awaria w elektrowni', giver: 'Inżynier' },
  'power-plant-fault-v2': { title: 'Awaria w elektrowni', giver: 'Inżynier' }, // PLAYTEST_016 PT016-07 (powerPlant 'v2')
  'lavender-fog': { title: 'Mgła nad Lavender', giver: 'Mieszkanka Lavender' },
  'celadon-rocket': { title: 'Rocket w Game Corner', giver: 'Policjantka Jenny', about: 'Team Rocket ukrywa się w Game Corner w Celadon. Pokonaj ich — miasto będzie wolne dla wszystkich graczy.' }, // + ROCKET-2 R1.1: the campaign's words (no rumour)
  'oak-water': { title: 'Badania wodne', giver: 'Profesor Oak' },
  'oak-rocket': { title: 'Patrol Team Rocket', giver: 'Profesor Oak' },
  'oak-habitats': { title: 'Obserwacje siedlisk', giver: 'Profesor Oak' },
  'oak-parcel': { title: 'Paczka dla Profesora Oaka', giver: 'Sprzedawca z Viridian' },
  'mt-moon-fossil': { title: 'Skamielina z Mt. Moon', giver: 'Muzeum w Pewter' },
  'nugget-bridge': { title: 'Most Nugget', giver: 'Kapitan mostu' },
  'vermilion-spark': { title: 'Iskra z Vermilion', giver: 'Inżynier z Vermilion' },
  // One Kanto day 14.10 — the quest pack (DEV)
  'oak-field-research': { title: 'Nowe w Pokédexie', giver: 'Profesor Oak' },
  'sailor-water-show': { title: 'Marynarz lubi wodne Pokémony', giver: 'Marynarz z Cerulean' },
  'tower-potions': { title: 'Potiony dla Wieży Pokémon', giver: 'Pielęgniarka z Saffron' },
  'celadon-evolution': { title: 'Pokaż ewolucję', giver: 'Uczennica Eriki' },
  // NIGHTSHIFT C — the epic lines (DEV, rules.epicQuests 'v1')
  'epic-charizard': { title: 'Ognisty ogon', giver: 'Profesor Oak' },
  'epic-venusaur': { title: 'Ogród Eriki', giver: 'Erika z Celadon' },
  'epic-dojo-lee': { title: 'Mistrz Dojo: Hitmonlee', giver: 'Mistrz Karate z Saffron' },
  'epic-dojo-chan': { title: 'Mistrz Dojo: Hitmonchan', giver: 'Mistrz Karate z Saffron' },
  'epic-porygon': { title: 'Sztuczny Pokémon', giver: 'Kasjer z Game Corner' },
  'epic-dratini': { title: 'Smoczy szlak', giver: 'Strażnik Safari' },
  // KANTO WORLD DISTRIBUTION (rules.worldQuests 'w1', a DEV pilot): the regional side missions
  'w-route22-patrol': { title: 'Patrol na Route 22', giver: 'Daisy z Pallet' },
  'w-forest-bugs': { title: 'Konkurs w Viridian Forest', giver: 'Łowca robaków' },
  'w-cerulean-filter': { title: 'Czysta woda dla Cerulean', giver: 'Wodociągowiec z Route 4' },
  'w-moon-night': { title: 'Noc w Mt. Moon', giver: 'Astronom z Route 3' },
  'w-route6-daycare': { title: 'Przedszkole na Route 6', giver: 'Opiekunka Pokémonów' },
  // INDIGO A (rules.kantoStories 'a1', a DEV pilot): the five Indigo League versions
  'w-moon-night-v2': { title: 'Kamień Księżycowy', giver: 'Astronom z Route 3' },
  'bill-lighthouse': { title: 'Latarnia Billa', giver: 'Bill' },
  'lavender-fog-v2': { title: 'Psotne duchy', giver: 'Medium z wieży' },
  'mt-moon-fossil-v2': { title: 'Wykopalisko', giver: 'Muzeum w Pewter' },
  'w-route6-daycare-v2': { title: 'Fałszywy salon', giver: 'Opiekunka Pokémonów' },
  'w-rock-tunnel-rescue': { title: 'Zaginiony w Rock Tunnel', giver: 'Przyjaciel turysty' },
  'w-cycling-race': { title: 'Wyścig na Cycling Road', giver: 'Kolarz z Route 16' },
  'epic-lapras': { title: 'Dar z Silph Co.', giver: 'Pracownik Silph Co.' },
  'epic-snorlax': { title: 'Śpiący Snorlax', giver: 'Pan Fuji z Lavender' }, // NIGHTSHIFT D (pilot)
  'snorlax-meet': { title: 'Obudzony Snorlax', giver: 'Snorlax na trasie 12', about: 'Twoje własne spotkanie ze Snorlaxem. Droga jest otwarta dla wszystkich, a każdy gracz ma swoje spotkanie i może złapać jednego Snorlaxa. Pudło albo ucieczka: Snorlax czeka — wystarczy raz eksplorować trasę 12.' }, // SNORLAX-1 (pilot): the catch after the Poké Flute; `about` — the card's words when no rumour tells it
  'story-zapdos': { title: 'Elektryczna burza', giver: 'Inżynier z Cerulean' }, // NIGHTSHIFT E (prototype)
  'story-mewtwo': { title: 'Notatki z Cinnabar', giver: 'Naukowiec z Cinnabar' },
  'legend-zapdos': { title: 'Elektryczna burza', giver: 'Inżynier z Cerulean' }, // DEC-01 (pilot): the line with its end
  'legend-mewtwo': { title: 'Notatki z Cinnabar', giver: 'Naukowiec z Cinnabar' }, // NIGHTSHIFT_018 DEC-13 (pilot): the line with its end
  'legend-mewtwo-g': { title: 'Notatki z Cinnabar', giver: 'Naukowiec z Cinnabar' }, // … and with a guardian (pilots, ChatGPT 07.11 11:45)
  'legend-mewtwo-h': { title: 'Notatki z Cinnabar', giver: 'Naukowiec z Cinnabar' },
  'legend-mewtwo-x': { title: 'Notatki z Cinnabar', giver: 'Naukowiec z Cinnabar' },
  'legend-articuno': { title: 'Lodowa grota', giver: 'Rybak z Fuchsii' }, // NIGHTSHIFT_018 D (pilot)
  'legend-moltres': { title: 'Ogień nad Drogą Zwycięstwa', giver: 'Blaine' }, // NIGHTSHIFT_018 D (pilot)
  'fly-route16': { title: 'Dom przy Route 16', giver: 'Dziewczyna z Route 16' }, // FLY-3 (rules.fly, a DEV pilot): the HM Lot
  'surf-safari': { title: 'Tajny dom w Safari', giver: 'Strażnik Safari' },
  'tm-dojo': { title: 'Trening w Dojo', giver: 'Mistrz Karate z Saffron' }, // TM-2 (rules.tms 't2', a DEV pilot): TM11 Rzut sejsmiczny // SURF-1 (rules.surf, a DEV pilot): the HM Surf
  ...Object.fromEntries(['za', 'zb', 'zc'].map((v) => [`legend-zapdos-${v}`, { title: 'Elektryczna burza', giver: 'Inżynier z Cerulean' }])), // NIGHTSHIFT_018 LEG-ZAPDOS (pilots)
  // NIGHTSHIFT_014 B — the ways to the 7 species without one (prototype, rules.obtain151)
  'fossil-helix': { title: 'Skamielina Helix', giver: 'Muzeum w Pewter' },
  'fossil-dome': { title: 'Skamielina Dome', giver: 'Muzeum w Pewter' },
  'ditto-mansion': { title: 'Tajemnica rezydencji', giver: 'Naukowiec z Cinnabar' },
  'mime-route2': { title: 'Pantomima', giver: 'Chłopiec z Route 2' },
  'jynx-seafoam': { title: 'Lodowa piosenka', giver: 'Dziewczynka z Cerulean' },
  'bike-voucher': { title: 'Kupon na rower', giver: 'Prezes Fan Clubu z Vermilion', about: 'Prezes Fan Clubu kocha Pokémony. Pokaż mu w Vermilion trzy różne Pokémony z drużyny, a da Ci kupon. Za kupon sklep w Cerulean da Ci rower.' }, // BIKE-1 (pilot)
  'bike-fanclub': { title: 'Pojedynek w Fan Clubie', giver: 'Prezes Fan Clubu z Vermilion', about: 'Prezes Fan Clubu kocha Pokémony. Pokaż mu w Vermilion trzy różne Pokémony z drużyny, a potem stocz z nim przyjacielski pojedynek. Za wygraną da Ci kupon — w sklepie w Cerulean wymienisz go na rower.' }, // BIKE V2 obtain A (pilot bike2)
  'cut-captain': { title: 'Kapitan statku', giver: 'Kapitan S.S. Anne z Vermilion', about: 'Kapitan statku S.S. Anne źle się czuje. Znajdź statek w porcie Vermilion i pokonaj marynarzy przy trapie — kapitan da Ci HM Cut.' }, // CUT-1 (pilot)
};
const KEY_ITEM_PL = { hmFly: 'HM Lot', hmSurf: 'HM Surf', bicycle: 'Rower', bikeVoucher: 'Kupon na rower', hmCut: 'HM Cut', oldAmber: 'Stary bursztyn', lostParcel: 'Zgubiona paczka', portLetter: 'List z portu', oldRod: 'Stara wędka', silphData: 'Dysk z danymi Silph', fireEgg: 'Ogniste jajo', pokeFlute: 'Poké Flute', plantKey: 'Klucz do elektrowni', mansionNotes: 'Notatki z rezydencji', helixFossil: 'Skamielina Helix', domeFossil: 'Skamielina Dome', filterPart: 'Część filtra', hikerRope: 'Lina turysty' };
export const CHALLENGE_PL = { 'Fan Club Chairman': 'Prezes Fan Clubu', 'Biker Gang': 'Gang motocyklistów', 'Dojo Students': 'Uczniowie Dojo', 'Plant Guardians': 'Strażnicy elektrowni', 'Cave Guardians': 'Strażnicy groty', 'Fire Guardians': 'Strażnicy ognia', 'Dungeon Guardians': 'Strażnicy jaskini', 'Moon Stone Thieves': 'Złodzieje kamienia', 'Lighthouse Rocket': 'Team Rocket przy latarni', 'Ghost Pranksters': 'Psotne duchy', 'Fossil Rival': 'Rywal z łopatą', 'Fake Groomer': 'Fałszywy fryzjer', 'Mansion Scientist': 'Naukowiec z rezydencji', "Blaine's Quiz": 'Quiz Blaine\'a', "Erika's Gardener": 'Ogrodniczka Eriki', 'Tower Rocket': 'Team Rocket w Wieży Pokémon', 'Karate Master': 'Mistrz Karate', 'Silph Scientist': 'Naukowiec z Silph', 'Dragon Fisherman': 'Rybak od smoków', 'Rocket Grunt': 'Żołnierz Team Rocket', 'Rocket Admin': 'Admin Team Rocket', 'Safari Warden': 'Strażnik Safari', Channeler: 'Medium z wieży', 'Game Corner Rocket': 'Team Rocket w Game Corner', 'Bridge Captain': 'Kapitan mostu', 'Super Nerd': 'Naukowiec z Mt. Moon', 'Sisters Show': 'Pokaz Sióstr', Engineer: 'Inżynier', 'Grimer Clog': 'Grimery w rurach', 'Chief Engineer': 'Główny inżynier', 'Lost Hiker': 'Zagubiony turysta', 'Biker Boss': 'Szef gangu kolarzy', 'S.S. Anne Sailors': 'Marynarze z S.S. Anne' }; // + CUT-1 (18.11): the captain's sailors
// KEY-1 (ChatGPT 12.11 §5): ONE picture and ONE line per key item — the reward text, the notes and „Plecak” say the same.
// A lasting item says what it does; a quest item (handed in by a quest step) just that a quest needs it. Before KEY-1 every
// key item but the HM Lot showed 🎣 in a reward — now only the rod does (the rest: its own picture or 🎒).
const KEY_ITEM_ICON = { hmFly: '🪽', hmSurf: '🌊', oldRod: '🎣', bicycle: '🚲', bikeVoucher: '🎟️', hmCut: '✂️' };
export const keyItemIcon = (id) => KEY_ITEM_ICON[id] ?? '🎒';
const KEY_ITEM_USE_PL = {
  hmFly: 'Z odznaką Thunder Badge i latającym Pokémonem lecisz do miasta, w którym już byłeś.',
  hmSurf: 'Z odznaką Soul Badge i pływającym Pokémonem płyniesz nowymi trasami wodnymi.',
  oldRod: 'Łowisz Pokémony nad wodą.',
  bicycle: 'Jedziesz szlakiem rowerowym albo zjeżdżasz Cycling Road — dwa pola za jedną akcję.',
  hmCut: 'Z odznaką Cascade Badge i Pokémonem, który umie ciąć, ścinasz krzaczki — za nimi coś czeka.',
};
// BIKE V2 (rules.bike 'b2'): the bicycle of a b2 game says its own rule
export const keyItemUsePl = (id, config = null) => (id === 'bicycle' && config?.rules?.bike === 'b2' ? 'Raz na turę jedziesz rowerem 3 pola za 2 akcje. Z górki Cycling Road — jeszcze dalej.' : KEY_ITEM_USE_PL[id] ?? 'Potrzebny do misji.');
// Living Kanto 2.0: a board card's key item ('lk:<card>') is named on the card itself (its stage `keyName`)
export const keyItemPl = (id, player = null) => {
  if (KEY_ITEM_PL[id]) return KEY_ITEM_PL[id];
  if (!String(id).startsWith('lk:')) return id;
  const named = (player?.questBook?.active ?? []).flatMap((a) => a.def?.stages ?? []).find((st) => st.gives?.keyItem === id)?.gives.keyName;
  return named ?? 'Zebrany przedmiot';
};

export function bookStepPl(o, done, target) {
  const n = ` (${Math.min(done, target)}/${target})`;
  switch (o.kind) {
    case 'visit': return `Idź do: ${placeName(o.place)}`;
    case 'badge': return `Zdobądź odznakę: ${GYMS_BY_ID[o.gym]?.badge ?? o.gym}`; // NIGHTSHIFT E
    case 'explore': return `Eksploruj: ${placeName(o.place)}${n}`;
    case 'catch':
      if (o.species) return `Złap: ${o.species.map((sp) => getSpecies(sp).name).join(' / ')}${n}`; // Living Kanto 2.0
      if (o.places) return `Złap ${o.count} ${o.count === 1 ? 'Pokémona' : 'Pokémony'}${o.types ? ` typu ${o.types.map((t) => TYPE_PL[t]).join(' / ')}` : ''} w: ${o.places.slice(0, 3).map(placeName).join(', ')}${o.places.length > 3 ? ' …' : ''}${n}`; // Living Kanto 2.0 (KANTO WORLD: + a type)
      return `Złap ${o.count} ${o.count === 1 ? 'Pokémona' : 'Pokémony'}${o.types ? ` typu ${o.types.map((t) => TYPE_PL[t]).join(' / ')}` : ''}${n}`;
    case 'seeSignature': return `Spotkaj tutejsze Pokémony w ${o.places} różnych miejscach${n}`;
    case 'defeatTrainer': return `Pokonaj ${o.count} ${o.count === 1 ? 'trenera' : 'trenerów'}${n}`;
    case 'defeatRocket': return `Pokonaj Team Rocket${n}`;
    case 'challenge': return `Wyzwanie z misji: ${CHALLENGE_PL[o.name] ?? o.name} — ${placeName(o.place)}`;
    case 'bring': return `Zanieś ${o.keyName ?? keyItemPl(o.keyItem)} do: ${placeName(o.place)}`;
    case 'wait': return `Poczekaj ${o.ownTurns} ${o.ownTurns === 1 ? 'turę' : 'tury'}${n}`;
    case 'observe': return `Zobacz ${o.count} Pokémony, których jeszcze nie znasz${n}`; // day 14
    case 'show': return o.types.length >= Object.keys(TYPE_PL).length ? `Przyjdź do: ${placeName(o.place)} z ${o.count} różnymi Pokémonami w drużynie` : `Przyjdź do: ${placeName(o.place)} z ${o.count} różnymi Pokémonami typu ${o.types.map((t) => TYPE_PL[t]).join(' / ')} w drużynie`; // BIKE-1: every type = any three different Pokémon
    case 'give': return `Zanieś ${o.count}× ${ITEM_PL[o.item] ?? o.item} do: ${placeName(o.place)} (oddasz je)`;
    case 'evolve': return `Ewoluuj ${o.count === 1 ? 'Pokémona' : `${o.count} Pokémony`}${n}`;
    case 'encounter': return o.legend ? `Legenda: ${getSpecies(o.species).name} — ${placeName(o.place)} (${o.minBadges ? `od ${o.minBadges} odznak, ` : ''}tylko Ultra Ball, złapanie niepewne)` : `Spotkanie: ${getSpecies(o.species).name} — ${placeName(o.place)} (złapanie niepewne)`; // PLAYTEST_006 C4; DEC-01: a legend
    default: return o.kind;
  }
}

// A quest's place in words: a real place, or „any Poké Stop” (takeAt / claimAt 'pokeStop' — no single place).
export const questPlacePl = (place) => (place === 'pokeStop' ? 'dowolnym Poké Stopie' : placeName(place));

// PLAYTEST_007 stage 1: a quest's „what now?” (questBookEngine.nextStep) in one sentence — the same text in the
// quest book, on the action bar and in the Trainer Journal. Empty when there is nothing to say (another scene).
export function nextStepPl(step, quest) {
  const objectives = quest.stages[step.stage]?.objectives ?? [];
  const todo = step.todo.map((t) => bookStepPl(objectives[t.i], t.progress, t.target)).join(' · ');
  const code = step.block?.code;
  if (code === 'busy') return '';
  if (step.kind === 'claim') return code === 'goTo' ? `🎁 Gotowe! Nagroda czeka w${step.place === 'pokeStop' ? '' : ':'} ${questPlacePl(step.place)}` : '🎁 Gotowe — odbierz nagrodę tutaj';
  if (step.kind === 'encounter' || step.kind === 'challenge') {
    const o = objectives.find((x) => x.kind === step.kind && x.place === step.place);
    const what = step.kind === 'encounter' ? `${o.legend ? 'legenda' : 'spotkanie z'}: ${getSpecies(o.species).name}` : `wyzwanie: ${CHALLENGE_PL[o.name] ?? o.name}`;
    if (code === 'legendTaken') return `${getSpecies(o.species).name} ma już trenera — ta historia jest skończona`; // DEC-01: one per world
    if (code === 'needBadges') return `🏅 ${getSpecies(o.species).name} czeka w: ${placeName(step.place)} — potrzebujesz ${step.block.badges} odznak (masz ${step.block.have})`; // NIGHTSHIFT_018: a step's minBadges
    const rest = step.todo.filter((t) => objectives[t.i].kind !== step.kind).map((t) => bookStepPl(objectives[t.i], t.progress, t.target));
    const also = rest.length ? ` (i jeszcze: ${rest.join(' · ')})` : '';
    if (code === 'goTo') return `Idź do: ${placeName(step.place)} — tam ${what}${also}`;
    if (code === 'newTrail') return `Nowy trop: eksploruj ${placeName(step.place)} (1×) — potem ${what} znowu`;
    if (code === 'noActions') return `Brak akcji w tej turze — ${what} w następnej turze`;
    if (code === 'onceThisTurn') return `Raz na turę — ${what} znowu w następnej turze`;
    if (code === 'noHealthy') return 'Drużyna zemdlała — wylecz Pokémony w Poké Stopie';
    if (code === 'rocketCatch') return `🎈 Team Rocket („${plotPl(step.block.plot).title}”) nie pozwala tu łapać — najpierw pokonaj Team Rocket (Wyzwij, 1 akcja), potem ${what}`; // PT016-01 (catchGuard 'v1')
    if (step.warn?.code === 'rocketCatch') return `Uwaga: Team Rocket („${plotPl(step.warn.plot).title}”) nie pozwala tu łapać — ${what} teraz bez Poké Balla. Najpierw pokonaj Team Rocket (Wyzwij, 1 akcja)`; // PT016-01: said before the encounter
    if (step.warn?.code === 'noBalls') return `Tutaj: ${what}! Nie masz Poké Balli — bez nich go nie złapiesz`;
    if (step.warn?.code === 'noUltraBall') return `Tutaj: ${what}! Nie masz Ultra Balla — legendę łapie tylko Ultra Ball (sklep w Celadon, Saffron, Indigo Plateau)`;
    return `Tutaj i teraz: ${what}!${also}`;
  }
  if (code === 'stepsFirst') {
    const l = step.block.later;
    const what = l.kind === 'encounter' ? `spotkanie z: ${getSpecies(l.species).name}` : `wyzwanie: ${CHALLENGE_PL[l.name] ?? l.name}`;
    return `Tutaj będzie ${what} — najpierw: ${todo}`;
  }
  return todo ? `Teraz: ${todo}` : '';
}

// PLAYTEST_007 stage 1: why a quest cannot be taken (questBookEngine.takeBlock), or '' when it can / it says nothing new.
export function takeBlockPl(block) {
  switch (block?.code) {
    case 'slotFull': {
      const titles = block.occ.map((occ) => QUESTBOOK_PL[occ.split('#')[0]]?.title ?? occ).join(', ');
      return block.rumour ? `Masz już misję z plotki (${titles}) — dokończ ją albo porzuć w Poké Stopie` : `Masz już ${block.max} misje (${titles}) — dokończ albo porzuć jedną w Poké Stopie`;
    }
    // PLAYTEST_017 PT017-02 (questCap): the one limit — and where a place comes free (never the inner ordinary / rumour limits)
    case 'capFull': return `Masz już ${block.max} przygody — skończ jedną albo porzuć ją w Poké Stopie, żeby wziąć nową`;
    case 'needBadges': return `Potrzebujesz ${block.badges} ${block.badges === 1 ? 'odznaki' : 'odznak'}${block.orWeek ? ` (albo poczekaj do tygodnia ${block.orWeek})` : ''}`;
    case 'rumourClosed': return 'Ta okazja już minęła — może jeszcze wrócić';
    case 'goTo': return `Weź ją w${block.place === 'pokeStop' ? '' : ':'} ${questPlacePl(block.place)}`;
    case 'never': return 'Już zrobione — tej misji nie ma drugi raz';
    case 'maxPerGame': return 'Zrobione tyle razy, ile można';
    case 'cooldown': return `Znowu od tygodnia ${block.week}`;
    case 'fromWeek': return `Od tygodnia ${block.week}`; // NIGHTSHIFT_015 B (questDist 'v2')
    case 'elsewhere': return 'To zadanie Profesora Oaka czeka w innym mieście'; // NIGHTSHIFT_015 B: no place gives it (never in the data)
    case 'cantReach': return `Tam jeszcze nie dotrzesz: ${placeName(block.place)}${block.needs === 'canTravelWater' ? ' — potrzebujesz Soul Badge (pływanie)' : ''}`; // NIGHTSHIFT_015 H (obtain151)
    case 'worldDone': return 'Już zrobione — ktoś obudził Snorlaxa, droga jest otwarta';
    case 'rocketNotYet': return `Team Rocket jeszcze tu nie rządzi — od tygodnia ${block.week}`; // ROCKET-2 R1.1
    case 'cityFree': return 'Już zrobione — miasto jest wolne, Team Rocket uciekł'; // ROCKET-2 R1.1
    case 'family': return 'To zadanie dla rodziny'; // BIKE-1 / CUT-1 / ROCKET-2: never an AI's
    case 'worldFirst': return 'Najpierw trzeba obudzić Snorlaxa — Poké Flute od Pana Fujiego z Lavender'; // SNORLAX-1
    case 'notWaker': return 'Snorlaxa może spotkać tylko ten, kto go obudził'; // SNORLAX-1 'a1'
    case 'caughtOnce': return `Masz już ${getSpecies(block.species).name} — drugiego nie ma`; // SNORLAX-1
    case 'exclusive': return `Wybrano już: ${QUESTBOOK_PL[block.other]?.title ?? block.other} — ${block.group === 'fossil' ? 'muzeum ożywia jedną z dwóch skamielin' : 'Dojo daje jednego z dwóch'}`;
    case 'worldTaken': return 'Tę skamielinę ma już inny gracz — każda jest tylko jedna';
    case 'legendTaken': return `${getSpecies(block.species).name} ma już trenera — ta historia jest skończona`; // DEC-01
    default: return '';
  }
}

// Living Kanto 2.0 (rules.livingKanto 'v1'): a board card's title from its archetype and parameters (`def.lk`), its stars,
// and why it cannot be taken (livingKantoEngine.offerBlock — the board's reasons).
export function offerTitlePl(lk) {
  const p = lk?.params ?? {};
  const pk = (n) => (n === 1 ? 'Pokémona' : 'Pokémony');
  switch (lk?.archetype) {
    case 'catch-species': return `Złap: ${getSpecies(p.species).name}`;
    case 'catch-type': return `Złap ${p.count} ${pk(p.count)} typu ${TYPE_PL[p.type] ?? p.type}`;
    case 'catch-biome': return `Złap ${p.count} ${pk(p.count)} — ${BIOME_PL[p.biome] ?? p.biome}`;
    case 'deliver-pokemon': return `Pokaż ${p.count} ${pk(p.count)} typu ${TYPE_PL[p.type] ?? p.type} w: ${placeName(p.place)}`;
    case 'deliver-item': return `Zanieś ${p.count}× ${ITEM_PL[p.item] ?? p.item} do: ${placeName(p.place)}`;
    case 'collect-resources': return `Zbierz: ${p.resource} (${placeName(p.place)}) i przynieś`;
    case 'explore-places': return `Zbadaj: ${(p.places ?? []).map(placeName).join(', ')}`;
    case 'observe-species': return `Zobacz ${p.count} nowe gatunki`;
    case 'defeat-trainers': return `Pokonaj ${p.count} ${p.count === 1 ? 'trenera' : 'trenerów'}`;
    case 'defeat-rocket': return 'Pokonaj Team Rocket';
    case 'evolve-pokemon': return p.count > 1 ? `Rozwiń ${p.count} Pokémony` : 'Rozwiń Pokémona';
    case 'complete-challenge': return `Wyzwanie: ${p.name} (${placeName(p.place)})`;
    default: return 'Zlecenie';
  }
}
export const offerStarsPl = (lk) => '★'.repeat(lk?.difficulty ?? 1);
export function offerBlockPl(block, nameOf = (id) => id) {
  switch (block?.reason) {
    case 'taken': return `Zabrane przez: ${nameOf(block.by)}`;
    case 'slotsFull': return `Masz już ${block.max} zwykłe misje — dokończ albo porzuć jedną w Poké Stopie`;
    case 'capFull': return `Masz już ${block.max} przygody — skończ jedną albo porzuć ją w Poké Stopie, żeby wziąć nową`; // PLAYTEST_017 PT017-02
    case 'maxPerGame': return 'Takie zlecenie robiłeś już tyle razy, ile można';
    case 'cooldown': return `Takie zlecenie znowu od tygodnia ${block.until}`;
    case 'nothingNew': return 'Prawie wszystkie gatunki już znasz — to zlecenie nie dla ciebie';
    case 'fromWeek': return `Od tygodnia ${block.week} — na początku każdy ma swoje 2 misje`; // PLAYTEST_016 PT016-02 'w4'
    case 'gone': return 'To zlecenie już zniknęło';
    case 'done': return 'To już zrobione';
    case 'notHere': return block.posts?.length ? `Wisi w terenie: ${placeName(block.posts[0])} — weź je na miejscu` : ''; // NIGHTSHIFT_015 E2
    default: return '';
  }
}

// What an event's effects do, in family language.
export function effectsPl(effects, config = null) {
  return effects.map((e) => {
    switch (e.type) {
      case 'money': return e.amount >= 0 ? `+💰${e.amount}` : `−💰${-e.amount}`;
      case 'pokeballs': return `${e.amount >= 0 ? '+' : '−'}${Math.abs(e.amount)} Poké Ball`;
      case 'healLead': return `prowadzący +${e.amount} ❤`;
      case 'healTeam': return `cała drużyna +${e.amount} ❤`;
      case 'damageLead': return `prowadzący −${e.amount} ❤`;
      case 'actions': return e.amount >= 0 ? `+${e.amount} akcja${config?.rules.eventActions === 'nextTurn' ? ' w następnej turze' : ''}` : `−${-e.amount} akcja`; // K-04
      case 'wildEncounter': return 'dziki Pokémon!';
      case 'trainerBattle': return 'walka z trenerem!';
      case 'item': return `+${thingPl(e.item, e.amount)}`; // bonus 14.10
      case 'rumour': return 'nowa plotka!';
      default: return e.type;
    }
  }).join(', ');
}

// Engine refusal messages → Polish (family toast); unknown ones get a generic line.
const ERRORS_PL = [
  [/Fly needs|Fly takes|Fly lands|Fly cannot|Fly can land|no visited town/i, 'Teraz nie można polecieć — dotknij „🪽 Lot”, żeby zobaczyć dlaczego.'], // FLY-1
  [/\bTMs?\b|\bTM\d{2}\b|which move stays|nothing to forget|already knows/, 'Tego ruchu nie można teraz nauczyć — dotknij „💿 Naucz ruchu”, żeby zobaczyć dlaczego.'], // TM-1
  [/Not your turn|AI's turn/i, 'Teraz nie twoja kolej.'],
  [/Can't buy|afford/i, 'Za mało pieniędzy.'],
  [/can't be caught/i, 'Tego Pokémona nie można złapać.'],
  [/No (Poké Balls|.*s left)/i, 'Brak balli.'],
  [/Choose who gets the Growth first/i, 'Najpierw wybierz, kto dostaje punkt treningu.'],
  [/needs (\d+) Growth \(has (\d+)\)/i, 'Ten Pokémon potrzebuje więcej punktów treningu ⭐.'],
  [/needs a (\w+ Stone)/i, 'Do tej ewolucji potrzebny jest kamień ewolucji (kupisz go w Poké Stopie).'],
  [/one evolution per turn/i, 'Jedna ewolucja na turę — ten Pokémon ewoluuje w następnej turze.'],
];
export function errorPl(message) {
  for (const [re, pl] of ERRORS_PL) if (re.test(message ?? '')) return pl;
  return 'Tego nie można teraz zrobić.';
}

// A place's name for the family: a merged place (DQ-96) with its second name —
// „Route 2 / Viridian Forest”.
export function placeName(id) {
  const loc = getLocation(id);
  return loc.subtitle ? `${loc.name} / ${loc.subtitle}` : loc.name;
}

// PLAYTEST_006 C5: a rumour in one sentence — what is there, and where to take it.
export const RUMOUR_PL = {
  'opp-parcel': 'W Viridian ktoś zgubił paczkę — trzeba ją zanieść do Muzeum w Pewter.',
  'opp-courier': 'W porcie Vermilion marynarz szuka kogoś, kto zaniesie list do Saffron.',
  'opp-bill': 'Bill miał wypadek z teleporterem! Zajrzyj do jego domku.',
  'opp-power-plant': 'W elektrowni coś iskrzy — inżynier potrzebuje pomocy.',
  'opp-lavender': 'Nad Lavender wisi dziwna mgła. Ktoś musi sprawdzić, co tam straszy.',
  'opp-celadon-rocket': 'Team Rocket kręci się koło Game Corner w Celadon!',
  'opp-scyther': 'Strażnik w Fuchsii mówi, że w Safari widziano Scythera! Zgłoś się do niego.',
};
// INDIGO A (rules.kantoStories 'a1'): a rumour told as its quest's VERSION in this game (the authored words stay for every other game);
// exported for the Studio's preview of a version's card (tools/scene-art-core.js cardInfo — ART-1)
export const RUMOUR_VERSION_PL = {
  'bill-lighthouse': 'Nocą przy domku Billa ktoś woła z morza! Zajrzyj tam.',
  'lavender-fog-v2': 'W Lavender duchy robią psikusy. Sprawdź, kto się tam bawi!',
};
export const rumourPl = (config, id) => RUMOUR_VERSION_PL[questIdIn(config, OPPORTUNITIES.v1.find((o) => o.id === id)?.quest)] ?? RUMOUR_PL[id] ?? '';


// PLAYTEST_012 01 (Piotr 18.10, decision A — Super Potion and Full Heal stay as they are): what a healing item DOES, in one
// line, never only on hover (an iPad): the shop's tile, and the item pickers say it too. The numbers come from the game's
// own config (items.potion.heal …) — never typed twice. null for an item that heals nothing (a Ball, a stone).
const CURE_ACC_PL = { poison: 'truciznę', burn: 'oparzenie', paralysis: 'paraliż', sleep: 'sen' };
const orList = (xs) => (xs.length > 1 ? `${xs.slice(0, -1).join(', ')} lub ${xs.at(-1)}` : xs[0] ?? '');
export function itemUsePl(id, config) {
  const it = ITEMS[id];
  const c = config?.items?.[id];
  if (id === 'revive') {
    const f = c?.hpFraction ?? 1;
    return `Przywraca omdlałego Pokémona do ${f >= 1 ? 'pełnego HP' : `${Math.round(f * 100)}% HP`}.`;
  }
  if (it?.kind === 'medicine' && c?.heal) return `Przywraca ${c.heal} HP. Nie usuwa statusów.`;
  if (it?.kind === 'cure' && it.cures?.length) return `Usuwa ${orList(it.cures.map((x) => CURE_ACC_PL[x] ?? x))}. NIE przywraca HP.`;
  return null;
}

// NIGHTSHIFT D (rules.worldIncidents 'pilot'): the living world's incidents in family words — the pill, the map, the reason.
export const INCIDENT_PL = {
  'beedrill-swarm': { icon: '🐝', name: 'Rój Beedrilli', text: 'Na trasach 7 i 8 roi się od Beedrilli — Eksploracja spotyka Weedle, Kakunę albo Beedrilla.' },
  downpour: { icon: '🌧️', name: 'Ulewa nad Kanto', text: 'Podziemne przejścia są zalane — idź drogą górą.' },
  landslide: { icon: '🪨', name: 'Osuwisko', text: 'Wyjście z Rock Tunnel na południe jest zasypane — do Lavender idź trasą 8 albo 12.' },
  'gym-closed': { icon: '🔧', name: 'Sala w remoncie', text: 'Sala jest zamknięta — miasto i Poké Stop działają. Wróć za tydzień.' },
  snorlax: { icon: '💤', name: 'Śpiący Snorlax', text: 'Snorlax śpi na drodze między trasą 11 a 12. Pan Fuji z Lavender ma Poké Flute.' },
};

// FLY-2 (rules.fly 'f1', a DEV pilot): what stands in the way of a flight, in the child's words (engine/flyEngine.js flyBlockers).
// `names` — the species that could carry the player (a fainted one / one in the Box), for the Pokémon line.
export function flyBlockerPl(b) {
  if (b.code === 'phase') return 'Najpierw dokończ to, co się teraz dzieje.';
  if (b.code === 'hm') return 'Potrzebny HM Lot — misja „Dom przy Route 16”.';
  if (b.code === 'badge') return 'Potrzebna odznaka Thunder Badge (sala w Vermilion).';
  if (b.code === 'pokemon') {
    if (b.fainted?.length) return `${b.fainted.map((id) => getSpecies(id).name).join(', ')} — zemdlał. Ulecz go, żeby polecieć.`;
    if (b.boxed?.length) return `${b.boxed.map((id) => getSpecies(id).name).join(', ')} — jest w Boksie. Weź go do drużyny.`;
    return 'Potrzebny latający Pokémon w drużynie: Pidgeotto, Pidgeot, Fearow, Dodrio, Charizard, Aerodactyl, Farfetch’d, Dragonite albo legendarny ptak.';
  }
  if (b.code === 'actions') return 'Lot zajmuje całą turę — leć na początku tury, zanim zrobisz coś innego.';
  if (b.code === 'targets') return 'Polecisz tylko do miasta, w którym już byłeś.';
  return 'W tej grze nie ma lotu.';
}

// SURF-1 (rules.surf 's1', a DEV pilot): what stands between the player and a water route that needs Surf
// (engine/surfEngine.js surfBlockers) — the same words wherever the table says it.
export function surfBlockerPl(b) {
  if (b.code === 'hm') return 'Potrzebny HM Surf — misja „Tajny dom w Safari”.';
  if (b.code === 'badge') return 'Potrzebna odznaka Soul Badge (sala w Fuchsii).';
  if (b.code === 'pokemon') {
    if (b.fainted?.length) return `${b.fainted.map((id) => getSpecies(id).name).join(', ')} — zemdlał. Ulecz go, żeby popłynąć.`;
    if (b.boxed?.length) return `${b.boxed.map((id) => getSpecies(id).name).join(', ')} — jest w Boksie. Weź go do drużyny.`;
    return 'Potrzebny pływający Pokémon w drużynie, np. Lapras, Gyarados, Blastoise, Golduck, Starmie albo Vaporeon.';
  }
  return 'W tej grze nie ma Surfa.';
}

// BIKE-1 (rules.bike 'b1', a DEV pilot): why there is no ride now (engine/bikeEngine.js bikeBlockers), in the child's words
// BIKE V2 (b2, `config`): its own words — two actions, once a turn, 3 fields from anywhere, the Fan Club's duel
export function bikeBlockerPl(b, config = null) {
  const b2 = config?.rules?.bike === 'b2';
  if (b.code === 'phase') return 'Najpierw dokończ to, co się teraz dzieje.';
  if (b.code === 'bike') return b2 ? 'Potrzebny rower — misja „Pojedynek w Fan Clubie” w Vermilion (od 1 odznaki), kupon wymień w sklepie w Cerulean.' : 'Potrzebny rower — pokaż 3 różne Pokémony w Fan Clubie w Vermilion, a kupon wymień w sklepie w Cerulean.';
  if (b.code === 'actions') return 'Brak akcji w tej turze — pojedziesz w następnej.';
  if (b.code === 'actions2') return 'Rower potrzebuje 2 akcji, a została 1. Idź pieszo — pojedziesz w następnej turze.';
  if (b.code === 'once') return 'Rowerem jedziesz raz na turę — pojedziesz w następnej.';
  if (b.code === 'here' && b2) return 'Stąd rower nigdzie nie dojedzie — idź pieszo.';
  if (b.code === 'here') return b.uphill ? 'Cycling Road to zjazd — jedziesz tylko w dół. Pod górę idziesz pieszo.' : 'Stąd nie zaczyna się żaden szlak rowerowy. Szlaki 🚲 zaczynają się w miastach, zjazd — na Route 16.';
  if (b.code === 'road') return `Droga zamknięta: ${b.routes.map((r) => `${placeName(r.at[0])} → ${placeName(r.at[1])}`).join(', ')}. Spróbuj inną drogą.`;
  return 'W tej grze nie ma roweru.';
}
// CUT-1 (rules.cut 'c1', a DEV pilot): the five bushes in family words (K1), and why there is no cut now (engine/cutEngine.js)
export const BUSH_PL = { 'forest-glade': 'leśna polana', 'river-path': 'ścieżka nad rzeką', 'gym-gate': 'tylna furtka przy sali', 'erika-garden': 'ogród Eriki', 'route16-thicket': 'gąszcz przy domu na Route 16' };
export function cutBlockerPl(b) {
  if (b.code === 'here') return 'Tu nie ma krzaczka do ścięcia. Krzaczki 🌳 są na mapie.';
  if (b.code === 'done') return 'Ten krzaczek już ściąłeś — zostaje pieniek.';
  if (b.code === 'phase') return 'Najpierw dokończ to, co się teraz dzieje.';
  if (b.code === 'hm') return 'Potrzebny HM Cut — misja „Kapitan statku” w Vermilion.';
  if (b.code === 'badge') return 'Potrzebna odznaka Cascade Badge (sala w Cerulean).';
  if (b.code === 'pokemon') {
    if (b.fainted?.length) return `${b.fainted.map((id) => getSpecies(id).name).join(', ')} — zemdlał. Ulecz go, żeby ciąć.`;
    if (b.boxed?.length) return `${b.boxed.map((id) => getSpecies(id).name).join(', ')} — jest w Boksie. Weź go do drużyny.`;
    return 'Potrzebny Pokémon, który umie ciąć — np. Oddish, Bellsprout, Paras, Sandshrew, Bulbasaur albo Charmander.';
  }
  if (b.code === 'learn') return `Najpierw naucz Pokémona ścinania: Plecak → HM Cut.${b.pupils?.length ? ` Nauczy się: ${[...new Set(b.pupils)].map((id) => getSpecies(id).name).join(', ')}.` : ' Uczą się np. Scyther, Oddish, Paras, Bulbasaur.'}`; // CUT2 (c2): nobody knows Cut yet
  if (b.code === 'actions') return 'Brak akcji w tej turze — zetniesz w następnej.';
  return 'W tej grze nie ma Cut.';
}

// ROCKET-2 R1.1 (rules.rocketCampaign, a DEV pilot): the campaign's moments — a city falls, a city is freed
// R1.2 (21.11): one line per chapter — where Team Rocket hides; `takeAt` — where its quest is taken; `gift` — R-4 on
export const CHAPTER_PL = {
  celadon: { lair: 'Game Corner to ich kryjówka', beat: 'w Game Corner' },
  mtmoon: { lair: 'Złodzieje Kamienia Księżycowego kopią w jaskini', beat: 'w Mt. Moon' },
  lavender: { lair: 'Rocket straszy w Wieży Pokémon', beat: 'w Wieży Pokémon' },
  saffron: { lair: 'Rocket zajął Silph Co.', beat: 'w Silph Co.' },
};
export function campaignNoticePl(d, who = '', { takeAt = null, gift = false } = {}) {
  const city = placeName(d.place);
  const ch = CHAPTER_PL[d.chapter] ?? CHAPTER_PL.celadon;
  const title = QUESTBOOK_PL[d.quest ?? 'celadon-rocket']?.title ?? 'Rocket w Game Corner';
  if (d.event === 'occupied') return { icon: '🚩', title: `Team Rocket przejmuje ${city}!`, text: `${ch.lair}. ${takeAt ? `W: ${placeName(takeAt)} weź` : 'Weź'} misję „${title}” — kto ich pokona, uwolni to miejsce dla wszystkich.${d.shop ? ` Sklep w ${city} jest zamknięty, leczenie działa.` : ''}` };
  return { icon: '🎉', title: `${city} jest wolne!`, text: `${who} pokonał Team Rocket ${ch.beat}. To miejsce znów należy do wszystkich.${d.shop ? ' Sklep znów działa.' : ''}${gift ? ' Każdy gracz dostanie tu Poké Ball przy pierwszej wizycie.' : ''}` };
}
// the map's flag: what it is and how to free the place
export const campaignFlagPl = (place, chapter, takeAt) => `🚩 ${placeName(place)}: ${(CHAPTER_PL[chapter.id] ?? CHAPTER_PL.celadon).lair}${chapter.shop ? ' — sklep zamknięty, leczenie działa' : ''}. Misja „${QUESTBOOK_PL[chapter.frees.quest]?.title ?? chapter.frees.quest}” (weź ją w: ${placeName(takeAt)}) uwolni to miejsce dla wszystkich.`;

// a ride's button: where to, through which route; the downhill says so
export const ridePl = (a, kind) => `${kind === 'downhill' ? '⬇ Zjazd: ' : ''}${placeName(a.to)} (przez ${placeName(a.via)})`;
// TM-3 (rules.tms 't1', a DEV pilot): why a Pokémon of the team cannot take this TM — a short line on its dimmed card
// (engine/tmEngine.js tmChoice codes).
export const TM_WHY_PL = { cannot: 'Nie nauczy się tego ruchu', knows: 'Już zna ten ruch' };

// UX-2311 (PLAYTEST_023 points 15–17, 21; rules.ux 'u1' — the Journal and the quest preview): the plain words of the
// limits. The numbers are always the engine's (journal.js limits: questBookEngine.questCapOf, the swap's week); the copy only
// says what the rules already do.
//   heard rumours are free; an adventure taken counts; a finished one waiting to be collected does not; the personal missions
//   are outside the adventure limit
export const capFreeOf = (cap) => Math.max(0, cap.max - cap.adventures);
export const capacityPl = (cap) => `Wolne miejsca na przygody: ${capFreeOf(cap)}/${cap.max}`;
export const RUMOURS_FREE_PL = 'Plotki są za darmo — słuchaj ich, ile chcesz. Miejsce na przygodę zajmuje dopiero plotka przyjęta („Weź zadanie”).';
export const personalPl = (n) => `Misje osobiste: ${n} — nie zajmują miejsc na przygody.`;
export const READY_FREE_PL = 'Gotowe do odbioru nie zajmują miejsca.';
export const swapPl = (swap) => (swap.ready ? '🔄 Zamiana gotowa: przy pełnych miejscach możesz oddać jedną nierozpoczętą przygodę za nową.' : `🔄 Następna zamiana od tygodnia ${swap.week}.`);
// Point 17: why the offers on the spot start later — from the game's own rule (rules.questStart) and only while it still holds
// (before its week); no word about a variant the game does not use. `week`: questBookEngine.questStartWeek(config).
export function questStartPl(config, round, week) {
  const v = config?.rules?.questStart;
  if (!v || round >= week) return '';
  if (v === 'eq') return `Na start wszyscy mają tak samo: 2 misje osobiste i krótkie zlecenie Profesora Oaka na swoim polu startu. Zwykłe zlecenia z miast i tablice zleceń otwierają się w tygodniu ${week} — żeby wszyscy zaczynali równo.`;
  if (v === 'w4') return `Na start wszyscy mają tylko 2 misje osobiste. Zlecenia na miejscu (Oak, misje regionalne, tablice zleceń) otwierają się w tygodniu ${week} — żeby wszyscy zaczynali równo.`;
  if (v === 'e1') return `Na start na każdym polu startu czeka jedno zlecenie. Misje regionalne otwierają się w tygodniu ${week}.`;
  return '';
}
// a board card shut by that rule (livingKantoEngine 'fromWeek'): the week only — the Journal's start note says why
export const offerWeekPl = (week) => `Tablica zleceń otwiera się w tygodniu ${week}`;
// Review 23.11 (4): the swap right on a take the one limit stops (questPreview.swapOption) — its button, where to go for it, and
// which of the engine's swap checks stops it (questSwapEngine: the cooldown week — swapPl —, nothing unstarted, a story for a story)
export const SWAP_LABEL_PL = 'Zamień nierozpoczętą przygodę';
export const swapGoPl = (place) => `Idź do: ${placeName(place)} — tam możesz zamienić nierozpoczętą przygodę na tę.`;
export const SWAP_NONE_PL = 'Nie masz nierozpoczętej przygody do oddania — każda jest już zaczęta albo wzięta w tym tygodniu.';
export const SWAP_STORY_PL = 'Nierozpoczęte masz tylko wielkie zadania lub legendy — oddasz je tylko za inne takie zadanie.';

// PLAYTEST_021: the victory modes and the points in Polish (engine/scoreEngine.js holds the rules and the numbers).
import { SCORE_POINTS as P } from '../engine/scoreEngine.js';

export const VICTORY_PL = Object.freeze({
  a: { icon: '🏆', name: 'Mistrz Kanto', hint: 'Kto pokona Ligę, wygrywa. Punkty ustalają pozostałe miejsca — i wynik, gdy skończy się czas.' },
  b: { icon: '⭐', name: 'Wielka Przygoda', hint: `Wygrywa najwięcej punktów. Mistrz Ligi dostaje +${P.champion}. Gra kończy się, gdy wszyscy dokończą tydzień pierwszego Mistrza.` },
});

export const SCORE_PART_PL = Object.freeze({
  trophies: { icon: '🏆', name: 'Trofea' },
  species: { icon: '📕', name: 'Pokédex' },
  quests: { icon: '📜', name: 'Wielkie zadania' },
  legends: { icon: '⚡', name: 'Legendy' },
  badges: { icon: '🏅', name: 'Odznaki' },
  ribbon: { icon: '🎀', name: 'Elite Four' },
  champion: { icon: '👑', name: 'Mistrz Ligi' },
});

export const scorePointsPl = () => `Punkty: 🏅 odznaka ${P.badge} · 📕 nowy gatunek ${P.species} · 📜 wielkie zadanie ${P.quest} · ⚡ legenda ${P.legend} · 🏆 trofea (ich punkty) · 🎀 Elite Four ${P.ribbon} · 👑 Mistrz Ligi ${P.champion}.`;

export const DECIDED_BY_POINTS_PL = Object.freeze({ points: 'najwięcej punktów', badges: 'remis w punktach — więcej odznak', ribbon: 'remis w punktach i odznakach — wstęga Elite Four', shared: 'remis — wspólne zwycięstwo' });

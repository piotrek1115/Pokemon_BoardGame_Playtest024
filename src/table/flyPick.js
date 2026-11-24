// FLY ON THE MAP (rules.ux, Piotr 24.11 live playtest: „zamiast tej listy miast od razu … zaznaczone na mapie do jakich mogę
// polecieć (tak jak teraz na niebiesko oznaczone są trasy rowerowe)”) — with the ux pilot „Lot” opens no list: the towns and
// cities the flight can land in glow green on the map (the walks' and the rides' glow is off meanwhile); a tap on one shows a
// small card (where, who carries, the whole turn) and „🪽 Leć” flies — the engine's legal action, unchanged. A second tap on
// „Lot”, „Anuluj” or any other button ends it. While no flight is legal, „Lot” says what is missing, as before (sceneFly).
// Presentation only: the engine, the save and the action are the same with or without it.
import { actAttr, esc } from '../ui/dom.js';
import { flyers, usesFly } from '../engine/flyEngine.js';
import { currentPlayer } from '../engine/gameState.js';
import { getSpecies } from '../data/pokemon.js';
import { getLegalActions } from '../engine/turnEngine.js';
import { placeName } from './content-pl.js';
import { usesUx } from './tracker.js';

export const usesFlyPick = (config) => usesUx(config) && usesFly(config);

// where the player on turn can fly now — the engine's legal flights (none for an AI, none outside their turn)
export function flyPicks(state) {
  if (!usesFlyPick(state.config) || currentPlayer(state).controller !== 'human') return [];
  return getLegalActions(state).filter((a) => a.type === 'fly');
}

// the open choice { who, to } while it still holds (the same player, a legal flight; a picked town still legal) — else null
export function livePick(state, pick) {
  if (!pick || currentPlayer(state).id !== pick.who) return null;
  const flights = flyPicks(state);
  if (!flights.length) return null;
  return { flights, from: currentPlayer(state).location, action: flights.find((a) => a.to === pick.to) ?? null };
}

// the card of a picked town: „🪽 Leć” / „Anuluj”
export function flyConfirmCard(state, action) {
  const player = currentPlayer(state);
  const carrier = flyers(player, state.config)[0];
  const n = state.turn.actionsRemaining;
  return `<div class="notice-card ride-confirm fly-confirm"><h2>🪽 Lecisz do: ${esc(placeName(action.to))}</h2><p>Niesie Cię ${esc(getSpecies(carrier.species).name)}. Po locie tura się kończy.</p><p class="ride-cost">Kosztuje <span class="ride-dots">${'<i></i>'.repeat(n)}</span> całą turę</p><div class="row center ride-btns"><button class="primary big" ${actAttr(action)}>🪽 Leć</button><button class="ghost" data-ui="fly-cancel">Anuluj</button></div></div>`;
}

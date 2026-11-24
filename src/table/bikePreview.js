// BIKE V2 (rules.bike 'b2', the DEV pilot `bike2`; ChatGPT 22.11 „REVIEW APPROVED / GO UX + BIKE V2” §3: „Wymagane jest
// potwierdzenie przejazdu po podświetleniu trasy”) — the ride's PREVIEW at the table. A tap on a glowing 🚲 end (the map) or on
// a place in „Dokąd jedziesz?” never rides at once: the route lights up on the map, the action dots it will spend dim, and a
// small card says where, through which places, what it costs and where Team Rocket will stop it — „🚲 Jedź” rides (the
// engine's legal action, unchanged), „Anuluj” or any other action drops the preview. Presentation only: the engine, the save
// and the action are the same with or without it; b1's one-tap ride is unchanged.
import { actAttr, esc } from '../ui/dom.js';
import { bikeSpec, bikeStepsOf, rideStopAt, ridesFrom, usesBike2 } from '../engine/bikeEngine.js';
import { currentPlayer } from '../engine/gameState.js';
import { actionKey, getLegalActions } from '../engine/turnEngine.js';
import { placeName } from './content-pl.js';

export const usesRidePreview = (config) => usesBike2(config);

// The preview of a legal b2 ride: where from, the places on the way, the bike steps (the downhill is one), the Cycling Road
// downhill or not, where Team Rocket will stop it (or null) and the actions it costs — all of it if it goes through, only
// the steps ridden if Team Rocket stops it (R1).
export function ridePreview(state, action) {
  const player = currentPlayer(state);
  const spec = bikeSpec(state.config);
  const from = player.location;
  const steps = bikeStepsOf(state.config, from, action.path);
  const stopAt = rideStopAt(state, player, action.path);
  const stopStep = stopAt ? steps.findIndex((st) => st.includes(stopAt)) : -1;
  const kind = ridesFrom(state.config, from).find((r) => r.to === action.to && r.path.join('>') === action.path.join('>'))?.kind ?? 'ride';
  const cost = Math.min(spec.paidSteps, stopStep >= 0 ? stopStep + 1 : steps.length);
  return { action, from, path: action.path, steps, kind, stopAt: stopAt === action.to ? null : stopAt, endRocket: stopAt === action.to, cost, full: Math.min(spec.paidSteps, steps.length) };
}

// The preview's action while it is still legal (the same turn, the same place) — else null (the preview is dropped)
export function livePreview(state, preview) {
  if (!preview?.action || !usesRidePreview(state.config)) return null;
  const key = actionKey(preview.action);
  return getLegalActions(state).find((a) => a.type === 'ride' && actionKey(a) === key) ?? null;
}

const dots = (n) => `<span class="ride-dots">${Array.from({ length: n }, () => '<i></i>').join('')}</span>`;
const akcje = (n) => (n === 1 ? '1 akcja' : `${n} akcje`);

// The card under / over the map (main.js puts it where it covers less of the route): „🚲 Jedź” / „Anuluj”
export function rideConfirmCard(state, action) {
  const p = ridePreview(state, action);
  const way = [p.from, ...p.path].map((id, i, all) => {
    const down = p.kind === 'downhill' && i > 0 && all[i - 1] === bikeSpec(state.config).downhill[0] && id === bikeSpec(state.config).downhill[1];
    return `<span class="rw-place${i === all.length - 1 ? ' end' : ''}">${down ? '⬇ ' : ''}${esc(placeName(id))}</span>`;
  }).join('<span class="rw-arrow">→</span>');
  const downhill = p.kind === 'downhill' ? '<p class="ride-down">⬇ Zjazd Cycling Road — z górki jedziesz szybciej.</p>' : '';
  const stop = p.stopAt
    ? `<p class="ride-stop">🎈 ${esc(placeName(p.stopAt))}: czeka Team Rocket — tam się zatrzymasz.${p.cost < p.full ? ` Zapłacisz tylko ${p.cost === 1 ? '1 akcję' : akcje(p.cost)}.` : ''}</p>`
    : p.endRocket ? `<p class="ride-stop">🎈 ${esc(placeName(action.to))}: czeka Team Rocket.</p>` : '';
  return `<div class="notice-card ride-confirm"><h2>🚲 Jedziesz do: ${esc(placeName(action.to))}</h2><p class="ride-way">${way}</p>${downhill}<p class="ride-cost">Kosztuje ${dots(p.full)} ${akcje(p.full)}</p>${stop}<div class="row center ride-btns"><button class="primary big" ${actAttr(action)}>🚲 Jedź</button><button class="ghost" data-ui="ride-cancel">Anuluj</button></div></div>`;
}

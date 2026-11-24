// CUT2 (rules.cut 'c2', the DEV pilot `cut2`, OFF in every set — ChatGPT 23.11 phase B · B1; docs/design/CUT2_TEACH.md): the
// table's side of „Naucz ścinania”, kid-simple. Plecak → HM Cut → „Naucz ścinania”: pick a Pokémon of the team (who knows it
// already is marked, who cannot learn it is dimmed with a short reason) → its card and one big „Naucz” (the engine's legal
// `teachCut`) — or „Wróć”. Nothing here decides a rule: every button is a legal action of turnEngine.getLegalActions.
//   sceneCutTeach    the panel 'cutteach'
//   cutTeachButton   the Plecak's button (only while a teaching is legal now)
//   cutTeachStatus   the HM Cut tile's line under c2 (null in every other game — the c1 line stays)
//   cutWhoLine       ONE line of the Cut panel: who will cut — or, when nobody knows Cut, the button to teach first
// A c1 / OFF game never reaches any of it (cutTeaches false: null / '').
import { getSpecies } from '../data/pokemon.js';
import { getLegalActions } from '../engine/turnEngine.js';
import { currentPlayer } from '../engine/gameState.js';
import { canLearnCut, cutAbilityBlockers, cutTeachSpec, cutTeaches, cutters, knowsCut, teachCutBlockers, teachPool } from '../engine/cutEngine.js';
import { growthRules } from '../engine/growthEngine.js';
import { actAttr, esc } from '../ui/dom.js';
import { pokemonCard } from './cards.js';
import { gi } from './icons.js';
import { cutBlockerPl } from './content-pl.js';

const btn = (action, label, cls = '') => `<button class="${cls}" ${actAttr(action)}>${label}</button>`;
const uiBtn = (cmd, label, cls = '', extra = '') => `<button class="${cls}" data-ui="${cmd}" ${extra}>${label}</button>`;
const nameOf = (mon) => getSpecies(mon.species).name;
const names = (mons) => mons.map(nameOf).join(', ');

// why this Pokémon is not offered now — its own reason first (knows it / cannot learn it), then the player's
const WHY_PL = Object.freeze({
  knows: () => `${gi('done')} Umie ciąć`,
  species: () => 'Nie nauczy się ścinania',
  limit: () => 'Więcej Pokémonów się nie nauczy',
  boxed: () => 'Jest w Boksie',
  hm: () => 'Potrzebny HM Cut',
  phase: () => 'Najpierw dokończ to, co się dzieje',
  actions: () => 'Brak akcji w tej turze',
});
const OWN = ['knows', 'species', 'limit', 'boxed'];
export function teachWhyPl(view, player, mon) {
  const b = teachCutBlockers(view, player, mon.uid);
  const pick = b.find((x) => OWN.includes(x.code)) ?? b[0];
  return pick && WHY_PL[pick.code] ? WHY_PL[pick.code]() : '';
}

// the Plecak's button: only while this player may teach someone now (`mine`: the legal actions, [] when not their turn)
export const cutTeachButton = (mine) => (mine.some((a) => a.type === 'teachCut') ? uiBtn('open-cutteach', `${gi('cut')} Naucz ścinania`, 'big') : '');

// the HM Cut tile under c2: teaching first (it needs nothing else), then the badge / a fainted or boxed one, then ✓ who cuts
export function cutTeachStatus(view, player) {
  if (!cutTeaches(view.config)) return null;
  const b = cutAbilityBlockers(player, view.config);
  if (b.some((x) => x.code === 'learn')) return { ok: false, text: 'Nikt jeszcze nie umie ciąć. Naucz Pokémona ścinania — za darmo.' };
  if (b.length) return { ok: false, text: cutBlockerPl(b[0]) };
  return { ok: true, text: `✓ Działa: ścina ${names(cutters(player, view.config))}` };
}

// the Cut panel's one line (c2 only): who will cut (the engine's first cutter) — or „Naucz ścinania” when nobody knows Cut and
// a teaching is legal now
export function cutWhoLine(view, player, canAct) {
  if (!cutTeaches(view.config)) return '';
  const who = cutters(player, view.config);
  if (who.length) return `<p class="center cut2-who">${gi('cut')} Zetnie: <b>${esc(nameOf(who[0]))}</b></p>`;
  const can = canAct && getLegalActions(view).some((a) => a.type === 'teachCut');
  return can ? `<div class="row center cut2-who">${uiBtn('open-cutteach', `${gi('cut')} Naucz ścinania`, 'primary big')}</div>` : '';
}

// The panel: „Kto ma ścinać krzaczki?” — the team (FROM_BOX: + the Box), then the chosen one's card and „Naucz”
export function sceneCutTeach(view, ui, canAct) {
  const player = currentPlayer(view);
  const legal = canAct ? getLegalActions(view).filter((a) => a.type === 'teachCut') : [];
  const actionOf = (m) => legal.find((a) => a.target === m.uid);
  const head = `<div class="scene-head"><span class="scene-tag">${gi('cut')} HM Cut</span><h2>Naucz ścinania</h2><span class="tag">za darmo</span></div>`;
  const foot = (back) => `<div class="row center">${back ? uiBtn('cutteach-back', 'Wróć', 'ghost') : ''}${uiBtn('close-panel', 'Zamknij', 'ghost')}</div>`;
  const card = (m) => pokemonCard(m, { size: 'm', growth: growthRules(view) });
  if (!cutTeaches(view.config)) return `<div class="scene cut2-teach">${head}<p class="center muted">W tej grze nie uczysz ścinania.</p>${foot(false)}</div>`;
  const pool = teachPool(player, view.config);
  const mon = pool.find((m) => m.uid === ui.cutTeachMon);
  if (mon && actionOf(mon)) {
    const t = cutTeachSpec(view.config);
    const keep = t.CONSUMES_HM ? 'Płyta HM zniknie po nauce.' : 'Płyta HM zostaje w Plecaku.';
    const cost = t.ACTION_COST > 0 ? ` To ${t.ACTION_COST === 1 ? '1 akcja' : `${t.ACTION_COST} akcje`}.` : '';
    return `<div class="scene cut2-teach">${head}<div class="cut2-confirm">${card(mon)}<p class="center cut2-ask"><b>${esc(nameOf(mon))}</b> nauczy się ścinać krzaczki — na zawsze.</p><p class="center muted">${keep}${cost}</p></div><div class="row center">${btn(actionOf(mon), `${gi('cut')} Naucz: ${esc(nameOf(mon))}`, 'primary big')}</div>${foot(true)}</div>`;
  }
  const picks = pool.map((m) => {
    if (actionOf(m)) return `<div class="pick">${card(m)}${uiBtn('cutteach-mon', esc(nameOf(m)), 'primary', `data-id="${esc(m.uid)}"`)}</div>`;
    const why = teachWhyPl(view, player, m);
    return `<div class="pick off${knowsCut(m) ? ' knows' : ''}">${card(m)}${why ? `<p class="cut2-why">${why}</p>` : ''}</div>`;
  }).join('');
  const ask = legal.length ? 'Kto ma ścinać krzaczki?' : !canAct ? 'Uczysz w swojej turze.' : 'Nikt z drużyny teraz się nie nauczy.';
  // the Box (FROM_BOX off): a Pokémon there that could learn it — one short line where to find it
  const boxed = cutTeachSpec(view.config).FROM_BOX ? [] : (player.reserve ?? []).filter((m) => canLearnCut(view.config, m) && !knowsCut(m));
  const box = boxed.length ? `<p class="center muted cut2-box">W Boksie: ${esc(names(boxed))} — weź do drużyny, żeby nauczyć.</p>` : '';
  return `<div class="scene cut2-teach">${head}<p class="center cut2-ask">${ask}</p><div class="pick-row">${picks}</div>${box}${foot(false)}</div>`;
}

// BADGE-ART (ChatGPT 22.11 „BADGE ART — NATYCHMIASTOWA INTEGRACJA DEV”; Piotr's sheet of the eight Kanto badges): the badge
// pictures, by the GYM's id (player.badges holds gym ids — data/gyms.js). Presentation only: earning a badge, its order (the
// game's gyms, gymsOf) and every save are unchanged. 256 × 256 PNG with a transparent background (the largest use ~72 px CSS = ~144 px on a Retina iPad; the sheet itself has ~340 px a badge), cut from the sheet by
// tools/badge-sheet-cut.mjs. A gym without a picture keeps today's look (its type icon in the gold disc).
// The tablet build copies and precaches every listed file (tools/build-tablet.js BADGE_FILES; a missing one stops the build).
import { esc } from '../ui/dom.js';

export const BADGE_ART_DIR = 'assets/badges/';
// gym id → file in assets/badges/ (the canon's order: Boulder, Cascade, Thunder, Rainbow, Soul, Marsh, Volcano, Earth)
export const BADGE_ART = Object.freeze({
  pewter: 'pewter.png', // Boulder Badge
  cerulean: 'cerulean.png', // Cascade Badge
  vermilion: 'vermilion.png', // Thunder Badge
  celadon: 'celadon.png', // Rainbow Badge
  fuchsia: 'fuchsia.png', // Soul Badge
  saffron: 'saffron.png', // Marsh Badge
  cinnabar: 'cinnabar.png', // Volcano Badge
  viridian: 'viridian.png', // Earth Badge
});

export const hasBadgeArt = (gymId) => Boolean(BADGE_ART[gymId]);
// The badge's picture: earned in colour; not earned — grey and faint (the slot says which badge waits there).
export function badgeArt(gymId, { earned = true, cls = '', label = '' } = {}) {
  const file = BADGE_ART[gymId];
  if (!file) return '';
  return `<img class="badge-art${earned ? '' : ' unearned'}${cls ? ` ${cls}` : ''}" src="${BADGE_ART_DIR}${file}" alt="${esc(label)}" draggable="false" decoding="async">`;
}

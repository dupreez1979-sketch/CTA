# Pull-up banner — parts for Canva

Rebuild the Children's Theatre Alliance pull-up banner in Canva from these
layers. Each foreground piece is a **transparent PNG**; upload them and place
them on a blank banner.

## Canvas
- **Size:** 850 × 2000 mm (portrait). In Canva: Custom size → 850 × 2000 mm.
- **Background colour:** sky blue `#48BEFD` (set the page background to this, or
  drop in `01-background-sky.png` and stretch it to fill).
- Coordinates below are **top-left origin, in millimetres** on that 850 × 2000
  canvas. A few shapes have negative values — they bleed off the edge on purpose
  (let them run past the edge, don't shrink them).

## Layers (back → front)

| File | Transparent | Place at (top, left) | Width | Notes |
|---|---|---|---|---|
| `01-background-sky.png` | no | 0, 0 | 850 mm | Or just set page background to `#48BEFD` |
| `06-cloud.png` | yes | bottom edge, sits so its base is 470 mm from the bottom | 850 mm (full) | The cream cloud line where the sky meets the cream base |
| `02-logo-card.png` | yes | 150, 95 | 660 mm | Cream card + logo + ink border + hard shadow (all baked in) |
| `04-headline.png` | yes | ~690, centred | ~740 mm | "THEATRE FOR EVERY CHILD" (Impact) |
| `05-subline.png` | yes | below the headline (~40 mm gap), centred | 660 mm | Poppins subline |
| `07-website-pill.png` | yes | ~1710, centred | ~560 mm | Yellow website pill, sits in the cream base |
| `08-ncti-logo.png` | yes | ~1790, centred | 320 mm | National Children's Theatre Initiative wordmark |

The lower **cream base** is the bottom 470 mm of the canvas (`#EFEEE4`). If you
set the page background to sky, add a cream rectangle across the bottom 470 mm
first, then lay the cloud along its top edge.

### Decorative shapes (`shapes/` — all transparent)
Scatter these; several intentionally bleed off an edge.

| File | Place at | Width | Extra |
|---|---|---|---|
| `shapes/circle-pink.png` | top −30, right −38 | 180 mm | bleeds off top-right |
| `shapes/quarter-purple.png` | top 150, left −26 | 120 mm | bleeds off left |
| `shapes/plus-yellow.png` | top 470, left 56 | 96 mm | |
| `shapes/circle-yellow.png` | top 560, right 44 | 96 mm | |
| `shapes/square-teal.png` | top 1120, right 70 | 120 mm | rotate 12° |
| `shapes/arch-purple.png` | top 1150, left 64 | 132 mm | |
| `shapes/knobLeft-pink.png` | top 1250, right 128 | 120 mm | |
| `shapes/stairs-emerald.png` | top 1300, left 120 | 118 mm | just above the cloud |

## Brand palette
`sky #48BEFD` · `cream #EFEEE4` · `cream-warm #FFF8E7` · `ink #1E1E1D` ·
`yellow #FFB83D` · `pink #F24A71` · `teal #05AEAF` · `purple #AC9EFC` ·
`emerald #03DBA4`

## Fonts
- Display / headline: **Impact** (Canva has it).
- Body / subline / website: **Poppins**.
- You can retype the headline, subline and website in Canva with these fonts
  instead of using the PNGs if you'd rather have live, editable text — the PNGs
  are there so it matches exactly out of the box.

## Reference & notes
- `00-full-banner.png` — the whole composition, for reference/placement.
- Keep the important content in the top ~65 % of the height. The bottom ~150 mm
  of a pull-up curls into the base cassette, so nothing critical goes there.
- `03-logo.png` (1484 × 471) and `08-ncti-logo.png` (759 × 176) are the largest
  logo files available — there's no vector source. If you need the logo sharper
  for very large print, supply a vector (SVG/EPS/PDF) and it can be re-exported.
- Headline/subline copy is placeholder — say the word and it can be changed.

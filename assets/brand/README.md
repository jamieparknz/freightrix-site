# FREIGHTIX brand system (v2)

**Name:** FREIGHTIX. The lime **F** and **IX** spell **FIX**, the name of every product
(Daily FIX, Linehaul FIX, Monday FIX). **Tagline:** GET YOUR FIX!

See `freightix-brand-overview.png` for everything on one page.

## Logos
| File | Use |
|---|---|
| `freightix-primary-*` | Main logo: wordmark, cyan rules, tagline. Footer, link previews, decks, email signatures |
| `freightix-wordmark-*` | Wordmark only. Site header, small spaces, anywhere the tagline would be under 9px tall |
| `freightix-inline-*` | Wordmark, divider and tagline on one line. Wide, short spaces (banners, email headers) |
| `freightix-symbol.svg`, `favicon*`, `icon-*`, `apple-touch-icon.png` | App icon and favicon: lime F over a cyan rule |
| `freightix-fix-avatar.*` | FIX tile for social media profile pictures |
| `og-image.png` | 1200x630 link preview |
| `../podcast-cover.jpg` | 3000x3000 podcast artwork (Apple and Spotify spec) |

Themes: `dark` (navy background), `light` (white background), `mono-white`, `mono-navy`
(transparent), `web` (dark artwork, no background or padding, for placing on the site's navy).
PNGs are exported 2400px wide.

## Construction
- Typeface: **Montserrat** ExtraBold 800 (wordmark), Bold 700 (tagline), Black 900 (icons and
  podcast headline). SIL Open Font License, free for logos. Every logo file is outlined, so no
  font is needed to display it.
- Wordmark: HarfBuzz-shaped with Montserrat's own kerning, plus 1.2% tracking.
- Tagline cap height = 36% of the wordmark cap height, tracked +30%. The "!" is lime.
- Cyan rules: thickness = 20% of the tagline cap height, centred on it. Their outer ends align
  exactly with the wordmark's edges.
- Clear space: half the wordmark's cap height on every side.
- Minimum size: wordmark 120px wide on screen; primary lockup 220px wide (so the tagline stays
  readable); app icon 16px.

## Colour
| Token | Hex | Use |
|---|---|---|
| Navy | #0A1630 | Background and ink |
| Lime | #B9F23C | F, IX and "!" on dark backgrounds; buttons |
| Lime deep | #5FA800 | F, IX and "!" on white backgrounds |
| Cyan | #2FC6F6 | Rules and dividers on dark backgrounds |
| Cyan deep | #0E9BD6 | Rules on white backgrounds |
| Mist | #8EA0BF | Muted text on dark backgrounds |

Don't: recolour the lime letters, add glows, gradients or shadows, outline the letters, or set
the wordmark in another font.

## On the website
| Place | File | Size |
|---|---|---|
| Header, over 1180px wide | freightix-wordmark-web.svg | 26px tall |
| Header, 601 to 1180px | same | 22px |
| Header, phones | same | 20px (17px at 350px and under) |
| Footer | freightix-primary-web.svg | min(300px, 100%) wide |

The old `freightrix-*-web.svg` and `freightrix-symbol.svg` filenames are **aliases holding the
new FREIGHTIX artwork**, so an older build template can't bring back the old logo. Delete them
once the site build template uses the `freightix-*` names.

## Rebuilding the assets
`source/` holds the generator. Install the dependencies with
`pip install fonttools brotli uharfbuzz cairosvg`, and download the fonts with
`npm pack @fontsource/montserrat@5.1.0`. Set `MONTSERRAT_DIR` to the package's `files/` folder,
then run `python3 build_brand.py <outdir>`.

## Mobile layout (600px wide and under)
The build template must keep these:
- Header: wordmark, live pill shortened to "N closures" (`.lp-short`), and a menu button
  (`.menubtn`, controls `#sitenav`) that opens the nav as a full-width panel. The inline script
  after `</header>` toggles `.top.open`.
- The live pill carries `aria-label="Road status: ..."` for screen readers.
- Traffic lights (`.legs`): 12px dots plus a status chip in the matching colour; rows at least
  52px tall.
- Map (`.ausmap`): 84% width, capital labels 38 units, town labels hidden, thicker lines.

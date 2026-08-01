# K&D Auto Electric Website Image Package

This package is ready to copy into the `JZGaskin/kd-auto-electric` repository.

## Repository placement

Copy the included `public/images` directory into the repository's existing `public/images` directory.

The package contains:

- One homepage hero image
- Six consistent 16:9 service-card images
- Six supporting shop and service images
- Original owner-supplied photographs for archive/reference
- An asset manifest with source type, placement, alt text, and usage notes

## Source integrity

The files fall into three categories:

1. **Owner-supplied photographs** — authentic K&D images
2. **Video-derived stills** — authentic frames extracted from K&D's commercial
3. **AI-generated illustrations** — created only where K&D supplied no usable photo

The AI-generated files are:

- `/images/hero/kd-hero-workshop.webp`
- `/images/services/farming-industrial.webp`
- `/images/services/emergency-vehicle-conversion.webp`

Use them as illustrative service images. Do not identify depicted people as K&D employees or vehicles as belonging to a named agency.

## Homepage mapping

- Hero: `/images/hero/kd-hero-workshop.webp`
- Automotive Electric: `/images/services/automotive-electric.webp`
- Automotive Repair: `/images/services/automotive-repair.webp`
- Farming & Industrial: `/images/services/farming-industrial.webp`
- Emergency Vehicle Conversion: `/images/services/emergency-vehicle-conversion.webp`
- Transmission & Engine: `/images/services/transmission-engine.webp`
- Intoxalock: `/images/services/intoxalock.webp`

## Hero implementation

Use the hero image as a CSS/background or full-cover `<img>` with:

- `object-fit: cover`
- a dark left-to-right overlay so white text remains readable
- desktop focal point around center/right
- mobile crop tested at 390 px width
- `fetchpriority="high"` and no lazy loading above the fold

Keep all branding text in HTML. Do not bake new text into the image.

## Important

Do not use `kd-diagnostic-tablet.webp`; it was intentionally excluded because the subject was unclear.

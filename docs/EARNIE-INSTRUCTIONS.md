# Earnie Implementation Instructions

Repository: `JZGaskin/kd-auto-electric`
Branch: `main`

Use the attached image package to complete the current K&D Auto Electric website.

## Non-negotiable content rule

The owner's approved wording remains authoritative. Do not rewrite, broaden, narrow, soften, or reinterpret business claims. Only correct obvious grammar, spelling, capitalization, accessibility, or technical presentation issues.

Do not change DNS.

## Install the assets

Copy the package's `public/images` contents into the repository's existing `public/images` directory.

Use these exact homepage mappings:

```ts
Automotive Electric:
  /images/services/automotive-electric.webp

Automotive Repair:
  /images/services/automotive-repair.webp

Farming & Industrial:
  /images/services/farming-industrial.webp

Emergency Vehicle Conversion:
  /images/services/emergency-vehicle-conversion.webp

Transmission & Engine:
  /images/services/transmission-engine.webp

Intoxalock:
  /images/services/intoxalock.webp
```

Replace every homepage `Photo coming soon` placeholder with the mapped image.

## Homepage hero

Use:

`/images/hero/kd-hero-workshop.webp`

Requirements:

- Use it as the homepage hero background or a full-cover image.
- Keep hero copy as HTML, not baked into the image.
- Add a strong dark left-to-right gradient behind the copy.
- Preserve:
  - `Quality STARTS Here`
  - `Quality Service Since 1991`
  - the current owner-approved headline/subtitle
  - the main phone CTA
- Use `object-fit: cover`.
- Test focal positioning at desktop, tablet, and 390 px mobile.
- Do not lazy-load the hero.
- Use `fetchpriority="high"` when rendered as an `<img>`.
- Prevent layout shift with explicit aspect ratio or dimensions.

The hero is an illustrative image. Do not write alt text claiming that the depicted person is Jeremy, a K&D employee, or that the scene is an exact photograph of the K&D shop.

Suggested alt text:

`Illustration of a busy auto electrical repair workshop with vehicles and diagnostic equipment`

## Interior service pages

Add the matching service image near the top of each service page, below or integrated with its page heading:

- Automotive Electric → `/images/services/automotive-electric.webp`
- Automotive Repair → `/images/services/automotive-repair.webp`
- Farming & Industrial → `/images/services/farming-industrial.webp`
- Emergency Vehicle Conversion → `/images/services/emergency-vehicle-conversion.webp`
- Transmission & Engine → `/images/services/transmission-engine.webp`
- Intoxalock → `/images/services/intoxalock.webp`

Do not place text over important image details unless contrast is proven.

## Supporting image placements

Use these where they improve the existing layout without making the site image-heavy:

- `/images/shop/shop-interior.webp`
  Homepage About/shop section or Contact page

- `/images/shop/customer-counter.webp`
  Homepage customer-service/About section

- `/images/shop/shop-front.webp`
  Contact page or Visit Us section

- `/images/shop/building-sign.webp`
  Service Areas page or Contact page

- `/images/shop/battery-display.webp`
  Automotive Electric page near parts/battery content

- `/images/shop/under-hood-service.webp`
  Automotive Repair or Transmission & Engine detail section

Do not force every supporting image onto the homepage. Prioritize a clean layout.

## Source labeling and truthfulness

Read `docs/asset-manifest.json`.

Owner-supplied photographs and commercial stills are authentic K&D material.

The following are AI-generated illustrative images:

- `/images/hero/kd-hero-workshop.webp`
- `/images/services/farming-industrial.webp`
- `/images/services/emergency-vehicle-conversion.webp`

Do not identify depicted people as K&D employees. Do not identify emergency vehicles as belonging to any specific department. Do not create captions that imply the illustrations document completed K&D jobs.

## Remove obsolete placeholder

Do not use or reference:

`kd-diagnostic-tablet.webp`

It was rejected because the subject was unclear.

## Image implementation

For all images:

- Use descriptive alt text from `docs/asset-manifest.json`.
- Use responsive `srcset`/Astro image processing where practical.
- Lazy-load below-the-fold images.
- Do not lazy-load the hero.
- Use explicit dimensions/aspect ratios.
- Keep WebP files as supplied.
- Avoid stretching.
- Use `object-cover` for service cards.
- Keep service-card crop and height consistent.
- Verify mobile cropping manually.

## Review section

Keep the owner's six exact review texts unchanged. Do not shorten or rewrite them.

Improve layout only if necessary. A long review may be full-width or featured, but the exact wording must remain intact.

## Existing owner requirements to preserve

Confirm the current implementation still preserves:

- `Quality Service Since 1991`
- `Quality STARTS Here`
- `Call or stop in for an appointment`
- no toll-free number
- `kdautoelectric@gmail.com`
- no contact form
- owner-approved service details
- dedicated Intoxalock number `(833) 274-0238`
- no Intoxalock monitoring claim
- no unverified aggregate review rating/count
- favicon package
- old-page redirects
- county pages

## QA

Run the production build and deploy the updated preview.

Verify:

1. All six homepage service cards display their assigned images.
2. No `Photo coming soon` placeholder remains.
3. Hero text is readable at desktop and mobile sizes.
4. Hero does not cause layout shift.
5. Every image URL returns HTTP 200.
6. All alt text is present and accurate.
7. Generated illustrations are not captioned as real K&D staff or documented jobs.
8. No toll-free number or old Embarqmail address reappears.
9. Intoxalock CTA uses the correct number.
10. Existing redirects and county pages still work.
11. Production build passes.

Report back with:

- files changed
- image placement list
- build result
- deployed commit SHA
- Netlify preview URL
- any image that crops poorly on mobile
- remaining missing owner photographs

# Baristachaw Landing and Domain Design

## Product boundary

Baristachaw uses two independently deployed web surfaces:

- `baristachaw.com` and `www.baristachaw.com`: public marketing, support, legal, and downloads.
- `app.baristachaw.com`: authenticated app, PWA, API, and Android/iOS WebView parity.

The landing build must not publish an app manifest, service worker, or mobile-web-app metadata. The app build retains those capabilities and uses `https://app.baristachaw.com/` as its canonical production origin.

## Visual system

Visual thesis: a precise coffee laboratory expressed through deep ink-blue photography, white technical space, translucent recipe layers, thin pour paths, and restrained bloom rings.

The first viewport is a full-bleed composition, not a dashboard grid. A real pour-over image provides the visual anchor; the brand, Indonesian promise, concise English alternate, and two primary actions remain readable within the initial mobile and desktop viewport. Downstream sections move into a brighter editorial system for method mechanics, audited coverage, confidence states, support, and downloads.

Motion is limited to a hero entrance, slow pour/bloom depth movement, and scroll reveal. All motion is disabled or reduced under `prefers-reduced-motion`.

## Information architecture

- `/`: hero, problem, solution, supported brewers, feature graphics, evidence, pricing, download, final CTA.
- `/download` and `/download/android`: Android release details and direct signed APK link.
- `/download/playstore` and `/download/appstore`: honest waitlist/coming-soon states.
- `/support`: support guidance and contact form.
- `/privacy`: Play Store-compatible privacy disclosure without invented legal claims.
- `/terms`: clear MVP terms and AI Brew limitations.

Marketing redirects `/app`, `/tools`, `/login`, `/register`, and `/ai-brew` to the app origin. App login and register routes already exist and remain independent of the landing.

## Interaction model

The landing includes a keyboard-accessible navigation drawer, language switcher, support chat panel, waitlist form, and contact form. Support chat is explicitly a guided frontend assistant, not a claim of continuous human support. Contact submission opens the user's email client only when a support email is configured; otherwise it presents a transparent manual-contact state.

The mobile sticky CTA contains only `Try AI Brew` and `Download`. Dialogs trap focus, restore focus when closed, close on Escape, and remain usable above mobile keyboards.

## Evidence and honesty

Current repository evidence may state:

- 16 method families
- 99 audited styles
- 1,000/1,000 method/style audit pass
- 1,000/1,000 source-backed scenario audit pass
- 725 unit tests passed, 4 intentional skips
- mobile tests 40/40
- Android API 35/36 smoke QA passed for the v1.0.1 artifact

The landing must also state that software validates recipe arithmetic, workflow mechanics, vocabulary, confidence, source fidelity, and guardrails. Physical extraction, sensory balance, grinder calibration, water chemistry, and final cup quality still require real brew validation.

## Deployment design

`apps/landing` is a standalone Vite/React workspace with its own `vercel.json`. The existing root Vercel project remains the app project. A second Vercel project named `baristachaw-landing` uses `apps/landing` as its project root and receives the apex and `www` domains.

Cloudflare records remain DNS-only:

- apex record: exact target supplied by Vercel
- `www`: exact CNAME supplied by Vercel
- `app`: existing Vercel CNAME

No credentials, billing settings, registrar ownership, or WHOIS data are modified.

## Release impact

Changing the baked Android WebView origin requires a new Android binary after the app domain migration. The existing v1.0.1 release remains preserved; it must not be silently retagged. The next binary should use the next semantic patch version and version code after all domain and deployment checks pass.

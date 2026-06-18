# Baristachaw

Baristachaw is an AI coffee companion for planning better brews, checking coffee setup decisions, and keeping barista workflows simple on web, PWA, and mobile.

[Marketing Site](https://baristachaw.com) | [Open Web App](https://app.baristachaw.com) | [Download Android APK v1.0.4](https://github.com/baristaahmadmuhtar-creator/Baristachaw/releases/latest/download/baristachaw-android.apk) | [All Releases](https://github.com/baristaahmadmuhtar-creator/Baristachaw/releases)

## What It Does

- **AI Brew** creates practical brew plans for pour-over, AeroPress, Switch, immersion, espresso, moka, cold brew, and more.
- **Method-aware styles** keep each brewer's workflow specific, including style, agitation, water split, bypass, press, valve, wait, and serve cues.
- **Grind Size Advisor** gives a method-aware starting point and adjusts direction from brew time, taste, roast, grinder, and target cup.
- **Coffee Chat** answers barista questions with fast, normal, and deep modes for quick fixes or structured decisions.
- **Scanner** helps inspect coffee labels, brew notes, and related media with account-gated analysis.
- **Collection** keeps recipes, brew plans, notes, and saved ideas organized for repeat use.
- **PWA and mobile parity** let users browse the app first, then sign in when they use protected actions.

## AI Brew

AI Brew is built for actionable starting recipes, not vague coffee advice. It summarizes the recipe, shows brewer style when relevant, highlights hot-water and ice/bypass splits, keeps final ratio visible, and guides the next live step with concise action labels.

The planner is designed to keep method language accurate end to end:

- AeroPress plans use setup, stir, steep, press, bypass, and serve language.
- Hario Switch and Clever style plans use valve, steep, release, and drain language.
- Pour-over plans preserve measured pour targets and agitation guidance.
- Iced plans separate hot extraction from final beverage dilution.

## Tools

Baristachaw includes daily brewing tools for:

- brew ratio and yield checks;
- grinder starting points;
- timer and workflow helpers;
- tasks and brew preparation;
- water and coffee input support for AI Brew.

The Grinder card opens directly to the grind-size panel so users can move from home to a practical grind recommendation without extra navigation.

## Access Model

Users can browse pages before creating an account. Real actions, saved data, AI generation, scanner analysis, chat sending, and collection mutations ask the user to sign in first. This keeps the first impression lightweight while protecting account data and paid AI capacity.

## Android Download

Android builds are distributed through GitHub Releases:

- latest APK: <https://github.com/baristaahmadmuhtar-creator/Baristachaw/releases/latest/download/baristachaw-android.apk>
- latest ZIP: <https://github.com/baristaahmadmuhtar-creator/Baristachaw/releases/latest/download/baristachaw-android.zip>
- release history: <https://github.com/baristaahmadmuhtar-creator/Baristachaw/releases>

The APK is intended for Android users who want the latest MVP mobile shell. The mobile app uses the production Baristachaw web experience for parity across Android, iOS PWA, and desktop web.

## Safety And Quality

Baristachaw keeps coffee recommendations practical and confidence-aware:

- water and grinder data are labeled conservatively when source confidence is limited;
- AI Brew keeps deterministic recipe values protected from unsafe AI claims;
- guest-style backend compatibility is kept behind the product experience, while the UI uses browse-only preview;
- release verification covers lint, build, unit, mobile parity, accessibility, smoke tests, and AI Brew E2E.

## For Developers

Contributor setup and local commands live in [docs/developer-local-setup.md](docs/developer-local-setup.md). The public README is kept product-focused so GitHub visitors can understand the app and download the Android release quickly.

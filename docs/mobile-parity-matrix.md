# Mobile Parity Matrix (Web ↔ iPhone)

Legend:
- `DONE` implemented in `apps/mobile`
- `OPEN` needs follow-up before App Store cutover

## Core Feature Contracts

| Area | Web Contract | Mobile Status | Notes |
|---|---|---|---|
| Auth | Google login/logout/session restore + Apple maintenance placeholder | DONE | Google grant exchange active; Apple UI is maintenance-gated via env flag. |
| Guest Mode | Tools full access + AI read-only preview | DONE | Non-auth users can use Tools and see AI gating copy without empty screens. |
| Startup Fallback | Parity default + timeout fallback native | DONE | 6s timeout, error fallback, 24h cooldown, manual retry action. |
| Home Search | AI search + save result | DONE | Uses `/api/ai` `search`, persists to parity collection store. |
| Chat Modes | normal/fast/deep | DONE | Prompt-mode normalization shared via `@baristaclaw/shared`. |
| Chat History | multi-session persistence | DONE | Session/message persistence in `mobileStore` schema v2. |
| Chat Folders | create/rename/move session/delete folder | DONE | Folder CRUD + session assignment implemented. |
| Chat Attachments | image/video/file/audio analysis | DONE | Image/camera/file pipeline + `analyze_attachment`/`analyze_text`/`transcribe`. |
| Chat TTS | play generated speech | DONE | Uses `generate_speech` and `expo-av` playback. |
| Image Generation | image library in chat | DONE | Uses `/api/ai` `generate_image`. |
| Scanner Modes | auto/ocr/video | DONE | Supports live native camera capture + library/files input. |
| Collection Folders | CRUD + item move | DONE | Folder CRUD + item folder reassignment. |
| Collection Notes | create/edit/delete/search/filter | DONE | Note editor + filter tabs + search + soft delete. |
| Tools Timer | start/pause/reset/presets | DONE | Implemented and persisted in UI state. |
| Tools Ratio | ratio inputs + warnings + extraction output | DONE | Guardrail warnings + extraction yield calculation. |
| Tools Todo | add/toggle/delete persistent tasks | DONE | Persists through parity mobile store. |
| Telemetry | structured error tracking + breadcrumbs | DONE | Sentry errors + breadcrumb taxonomy (`screen_view`, `feature_used`, auth/fallback events). |

## Known Constraints (Local-Free Track)

| Constraint | Impact | Status |
|---|---|---|
| macOS 12.7.6 + Xcode 14.2 | Cannot deploy/debug directly to iOS 18.3.2 physical iPhone | OPEN |
| Free Apple ID signing | Requires periodic re-signing | OPEN |
| App Store build host requirement | Final submit requires modern Xcode host | OPEN |

## Verification Gates

- `npm run check`
- `npm run mobile:lint`
- `npm run mobile:test`
- Manual smoke on simulator: auth/chat/scanner/collection/tools

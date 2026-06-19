# Dependency Audit Exceptions

Last reviewed: 2026-06-19

`npm audit --omit=dev --audit-level=moderate` still exits non-zero for Expo/React Native transitive advisories that require a breaking Expo 56 / React Native 0.86 upgrade. This document is a scoped runtime reachability exception, not a green audit result. Replacing it with an actual passing audit requires a dedicated Expo/RN upgrade branch and full Android/PWA regression pass.

| Advisory family | Audit path | Current decision |
| --- | --- | --- |
| `js-yaml <=4.1.1` DoS | `react-native -> babel-jest -> @jest/transform -> babel-plugin-istanbul -> @istanbuljs/load-nyc-config -> js-yaml` | Deferred. Path is Jest/coverage transform tooling, not app runtime bundle or server runtime. |
| `postcss <8.5.10` CSS stringify XSS | `expo -> @expo/cli -> @expo/metro-config -> postcss` | Deferred. Path is Expo/Metro build tooling; no user-supplied CSS stringify runs in production app/server. |
| `uuid <11.1.1` buffer bounds | `expo -> @expo/config -> @expo/config-plugins -> xcode -> uuid` | Deferred. Path is native config/prebuild tooling; not reachable from PWA/server/mobile runtime request handling. |

Resolved in this pass:

- `ws` high advisory removed from the runtime audit path by non-forced dependency updates.
- `dompurify`, `qs`/`express`, `protobufjs`, and `tar` runtime advisories no longer appear in `npm audit --omit=dev`.

Rules for keeping this exception valid:

- Do not use `--force` audit upgrades on release branches without a dedicated Expo/RN upgrade test plan.
- Re-run `npm audit --omit=dev --audit-level=moderate` before launch.
- Treat any advisory reachable from `/api/*`, PWA-rendered untrusted HTML, auth, billing, quota, or mobile WebView runtime as a blocker, not an exception.

# Baristachaw Domain Migration Status

Checked: June 12, 2026

## Target architecture

| Surface | Canonical URL | Status |
| --- | --- | --- |
| Marketing | `https://baristachaw.com` | Attached to Vercel landing project; Cloudflare apex A record pending |
| Marketing alias | `https://www.baristachaw.com` | Attached to Vercel landing project; Cloudflare DNS record pending |
| App / PWA / API | `https://app.baristachaw.com` | Resolves and serves the production app |
| AI Brew | `https://app.baristachaw.com/tools?tab=ai_brew` | App route available |
| Login | `https://app.baristachaw.com/login` | App route available |
| Register | `https://app.baristachaw.com/register` | App route available |

## DNS observation

- `app.baristachaw.com` resolves through the Vercel CNAME target and returns HTTP 200.
- `baristachaw.com` has no public A/AAAA/CNAME answer yet.
- `www.baristachaw.com` is NXDOMAIN.
- Vercel requires `A @ 76.76.21.21` and currently reports the same A target for `www`.
- Cloudflare records for Vercel must remain DNS-only unless a later tested requirement justifies proxying.

## Repository status

- `apps/landing` is a separate, non-installable marketing build.
- `apps/web` remains the PWA and API application.
- App manifest uses `https://app.baristachaw.com/` as its ID.
- Mobile defaults and EAS profiles use `https://app.baristachaw.com`.
- `baristaclaw` remains only as a legacy deep-link scheme, Expo slug, historical Vercel project name, and historical reports.

## External configuration still required

- Add the exact Vercel-provided apex and `www` records in Cloudflare from an authenticated session.
- Add `https://app.baristachaw.com/**` to Supabase redirect URLs.
- Add `https://app.baristachaw.com/api/auth/callback` to Google/Facebook OAuth callback configuration where applicable.

## Android release impact

The v1.0.2 APK and AAB were rebuilt with `app.baristachaw.com`, version code 3, the existing signing certificate, and no prohibited broad storage/media permissions. Static artifact gates passed. API 35/36 emulator reruns remain pending because the local SDK image installation exceeded the available disk quota; the earlier v1.0.1 runtime lineage passed both emulator levels.

# Mobile Web Parity Gate

Latest baseline for this gate: `15041df2e8a9607382c77000deb6caf85b3b1266`.

Production mobile policy: the store candidate uses the Expo WebView web-parity shell as the primary surface. The web app remains the source of truth for AI Brew, recipe math, language, saved data, and core UX. Native screens are fallback/debug surfaces only and must not be exposed as incomplete production features.

Full language claim: English + Bahasa Indonesia only.

Auth status: Browse-only preview is available. Protected actions require Google, Facebook, or email sign-in. Email/password and authenticated production smoke remain unverified until secure Supabase and `PROD_SMOKE_*` secrets are configured outside source control.

## Parity Matrix

| Area | Web status | Mobile status | Parity level | Test coverage | Remaining gap | Final decision |
|---|---|---|---|---|---|---|
| Home / landing | Public route renders localized launcher and search entry. | WebView loads same route with native shell params. | FULL PARITY | mobile-web-parity.navigation, mobile route smoke | None for web parity shell. | Ship via web parity shell. |
| Navigation / bottom nav | Web bottom nav and route tabs are stable on mobile. | WebView exposes the same web nav; native fallback nav is not production primary. | MOBILE ADAPTED PARITY | bottom-nav-layout, mobile-web-parity.safe-area, mobile-web-parity.navigation | Real iPhone proof still needed before store listing. | Ship after parity and device QA pass. |
| Barista Tools | Tools route exposes AI Brew, Timer, Kalkulator/Rasio, and Tugas. | Same route and tabs load inside native shell. | FULL PARITY | mobile-web-parity.no-dead-feature, mobile.spec | None. | Ship via web parity shell. |
| AI Brew input quick | Quick builder uses web catalog, water, grinder, target, process, and variety inputs. | Same web builder loads inside native shell. | FULL PARITY | mobile-web-parity.ai-brew, test:ai-brew | None. | Ship via web parity shell. |
| AI Brew input pro | Pro builder remains web source of truth. | Same web route is available in native shell. | FULL PARITY | mobile-web-parity.no-dead-feature, test:ai-brew | None. | Ship via web parity shell. |
| AI Brew result summary | Ringkasan and key metrics use protected web planner output. | Same result panel renders through WebView. | FULL PARITY | mobile-web-parity.ai-brew, test:ai-brew | None. | Ship via web parity shell. |
| AI Brew Panduan Seduh | Web guide owns time semantics and method-specific copy. | Same guide renders through WebView. | FULL PARITY | mobile-web-parity.ai-brew, mobile.spec, test:ai-brew | None. | Ship via web parity shell. |
| AI Brew Detail Tambahan | Web detail dedupe and max-actionable-detail rules apply. | Same details render through WebView. | FULL PARITY | aiBrewCompactUxSource, mobile-web-parity.ai-brew | None. | Ship via web parity shell. |
| AI Brew Panduan AI / AI Coach | Web on-demand coach remains guarded and localized. | Same web coach action is available when entitlement allows. | FULL PARITY | test:ai-brew, mobile-web-parity.no-dead-feature | Auth entitlement still depends on production secrets. | Ship with auth status disclosed. |
| AI Brew Cek Rasa | Web taste feedback and one-variable correction are source of truth. | Same UI and copy render through WebView. | FULL PARITY | test:ai-brew, mobile-web-parity.ai-brew | None. | Ship via web parity shell. |
| AI Brew saved recipe | Web save action and collection restore are source of truth. | Web storage and account-backed save run in WebView. | FULL PARITY | mobile-web-parity.storage, collection.spec | Account sync requires auth env. | Ship browse-only preview; save/sync requires auth. |
| Timer | Web timer route and handoff behavior are stable. | Same web tool tab loads in shell. | FULL PARITY | mobile-web-parity.no-dead-feature, mobile.spec | None. | Ship via web parity shell. |
| Calculator / Rasio | Web calculator owns ratio and extraction analysis. | Same calculator loads in shell. | FULL PARITY | mobile-web-parity.no-dead-feature, mobile.spec | None. | Ship via web parity shell. |
| Ukuran Giling / Grind Size | Web calculator grind-size panel owns grinder guidance. | Same panel is exposed in shell. | FULL PARITY | mobile-web-parity.no-dead-feature, test:unit | None. | Ship via web parity shell. |
| Tasks | Web task tab is functional and localized. | Same tab loads in shell. | FULL PARITY | mobile-web-parity.no-dead-feature, mobile.spec | None. | Ship via web parity shell. |
| Coffee collection / saved items | Web collection supports saved recipes and folders. | Same collection route loads in shell. | FULL PARITY | mobile-web-parity.storage, collection.spec | Account sync depends on auth env. | Ship browse-only preview; mutations require auth. |
| Settings | Web language/theme settings remain source of truth. | Same web settings, when navigated, are available in shell. | MOBILE ADAPTED PARITY | language tests, mobile-web-parity.language | Native fallback settings are not production primary. | Ship through web parity. |
| Language switch | Web persists language and renders ID/EN copy. | Native shell passes preferred language to web URL. | FULL PARITY | mobileWebParityGate, mobile-web-parity.language | Do not claim other languages as full. | Ship English + Bahasa Indonesia. |
| Auth login | Web auth route and native bearer bridge are supported. | WebView injects native session, patches same-origin API fetch, opens OAuth externally. | MOBILE ADAPTED PARITY | mobileWebParityGate, mobile:auth:check | Email/password remains unverified without Supabase env. | Ship browse-only preview plus verified providers only. |
| Auth logout | Web logout returns native logout message. | Native shell clears stored session on message. | FULL PARITY | mobileWebParityGate, mobile:test | None after auth env is verified. | Ship with auth status disclosed. |
| Browse-only preview | Public routes can be viewed without a session; protected actions open auth. | Native shell opens the same web routes without a guest-session query. | FULL PARITY | mobileWebParityGate, mobile:test | None. | Ship browse-only preview. |
| Saved data restore | Web local storage and account storage restore old plans. | Same WebView storage behavior is used. | FULL PARITY | mobile-web-parity.storage, test:unit | Cloud restore needs auth env. | Ship local restore; cloud auth unverified. |
| Offline / poor network | Web shows offline and recovery states. | WebView shell shows localized parity error sheet if web load fails. | MOBILE ADAPTED PARITY | mobile-web-parity.errors, mobile:test | Real poor-network device pass still needed. | Ship after device QA. |
| Error boundary | Web error boundaries and native shell error sheet are localized. | WebView shell blocks blank screens with reload/open actions. | MOBILE ADAPTED PARITY | mobile-web-parity.errors, mobileWebParityGate | None for web parity shell. | Ship with localized recovery. |
| Loading states | Web route loading and native shell overlay are localized. | Native shell shows ID/EN loading copy. | MOBILE ADAPTED PARITY | mobileWebParityGate, mobile-web-parity.language | Other locales not claimed. | Ship ID/EN only. |
| Empty states | Web empty states remain source of truth. | Same web UI renders in shell. | FULL PARITY | mobile-web-parity.navigation, collection.spec | None. | Ship via web parity shell. |
| Toast/notification | Web toasts and notices remain source of truth. | Same web toasts render in WebView; native auth sheet uses localized copy. | MOBILE ADAPTED PARITY | mobile-web-parity.language, mobile:test | None for ID/EN. | Ship ID/EN only. |
| Profile/account | Web account state remains source of truth. | Native session bridge synchronizes bearer access when configured. | MOBILE ADAPTED PARITY | mobileWebParityGate, mobile:auth:check | Auth env must be configured for full account QA. | Ship browse-only preview; auth unverified until secrets. |
| Privacy/support links | Web links open same-origin in shell or external browser when external. | WebView navigation allowlist preserves safe link behavior. | MOBILE ADAPTED PARITY | mobileWebParityGate, mobile-web-parity.navigation | Store metadata URLs still need final account proof. | Ship after store metadata pass. |
| About/version | Web version/release data is source of truth where exposed. | Native release env labels build telemetry. | MOBILE ADAPTED PARITY | mobileWebParityGate, mobile:lint | Store build artifact not created yet. | Gate before EAS build. |

## Release Decision Rule

- `WEB PARITY 1:1 READY`: every exposed feature above is full parity and all source, E2E, mobile, a11y, overflow, and public smoke gates pass.
- `WEB PARITY READY WITH DOCUMENTED MOBILE ADAPTATIONS`: all exposed features work, but native shell/auth/offline/store constraints are documented adaptations.
- `WEB PARITY PARTIAL / STORE BUILD BLOCKED`: parity tests pass partially or auth/store credentials are still blocking.
- `NOT READY`: AI Brew parity, recipe parity, navigation, storage, build, a11y, overflow, or public smoke has a blocker.

Current expected decision before EAS credentials and real-device proof: `WEB PARITY READY WITH DOCUMENTED MOBILE ADAPTATIONS` if this gate is green, otherwise `WEB PARITY PARTIAL / STORE BUILD BLOCKED`.

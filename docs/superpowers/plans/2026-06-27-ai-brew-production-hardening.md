# AI Brew Production Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Perkuat Baristachaw end-to-end sampai layak final launch MVP production-ready: AI Brew recipe/profile/target rasa/style/guide/tutorial untuk seluruh alat seduh, terutama AeroPress, Hario Switch 02/03, Chemex, dan seluruh dripper lain; lalu perkuat frontend, backend, admin, billing, payment, CORS, storage, security, testing, commit, push, dan production launch.

**Architecture:** Deterministic recipe engine tetap menjadi source of truth untuk resep. AI/chat hanya boleh menjelaskan, menyesuaikan bahasa, dan memberi troubleshooting di atas plan terstruktur. Catalog JSON, planner TypeScript, workflow guide/tutorial, UI, backend guardrails, admin/billing, dan test matrix harus konsisten lewat kontrak method-style yang eksplisit.

**Tech Stack:** Node >=24, npm >=11, TypeScript, Vite React web app, Expo mobile app, Express/Vercel serverless API, Supabase service REST/storage, Vitest, Playwright, axe, PWA checks.

---

## Current Repo Snapshot

- [ ] Work from branch `codex/beta-launch-qa-refinement` unless the executor intentionally creates `codex/ai-brew-production-hardening`.
- [ ] Preserve unrelated dirty file `data/catalog/exports/phase1/grinders.search.json`; do not revert it and do not include it in commits unless grinder search export regeneration is explicitly part of the implementation.
- [ ] Use these existing core files as anchors:
  - `apps/web/src/features/ai-brew/types.ts`
  - `apps/web/src/features/ai-brew/catalog.ts`
  - `apps/web/src/features/ai-brew/planner.ts`
  - `apps/web/src/features/ai-brew/workflowGuide.ts`
  - `apps/web/src/features/ai-brew/workflowTutorials.ts`
  - `apps/web/src/features/ai-brew/AiBrewPanel.tsx`
  - `apps/web/public/data/ai-brew/*.json`
  - `server-api/ai.ts`, `server-api/_aiGuardrails.ts`, `server-api/_orchestration.ts`
  - `server-api/_shared.ts`, `server.ts`, `api/[...route].ts`
  - `server-api/admin/management.ts`, `server-api/admin/_access.ts`
  - `apps/web/src/pages/AdminManagement.tsx`, `apps/web/src/services/adminApi.ts`
  - `server-api/billing/checkout.ts`, `server-api/billing/proof.ts`, `server-api/billing/manualPayments.ts`
  - `server-api/payment/mayar.ts`
  - `apps/web/src/components/billing/AiAccessGate.tsx`, `apps/web/src/services/billing.ts`
- [ ] Treat current catalog scale as the baseline to protect: 47 visible drippers, 114 device brew profiles, 8 target profiles, 40 manual presets, 16 Switch programmes, 14 Switch dose rows, 7 Switch troubleshooting rows, 250 grinders, 3,677 grinder settings, 97 processes, 182 varieties, 111 water profiles.
- [ ] Honor the factual gap: `recipeStyle` is currently explicit in device JSON mainly for AeroPress and French Press. Other methods have TypeScript style resolvers and tutorial logic, but the catalog contract is not equally explicit yet.
- [ ] Keep honesty boundary in product copy and docs: software validation can prove deterministic consistency, leakage guardrails, ratio/time/temp bounds, and UI/backend behavior. It cannot honestly prove physical sensory taste without real brewing cupping data.

## Phase 0 - Baseline And Safety

- [ ] Run `git status --short --branch` and record dirty files before edits.
- [ ] Run baseline checks before changing behavior:
  - `npm run check`
  - `npm run test:ai-brew:method-style-report`
  - `npm run test:ai-brew:readiness99`
  - `npm run test:gate:local`
- [ ] If a baseline command fails, capture the failing test names and inspect whether failure predates this work. Do not hide pre-existing failure; either fix it if in scope or document it in the final launch report.
- [ ] Create a local implementation note at `docs/ai-brew-production-hardening-report.md` and update it after every phase with: files changed, tests run, failures, unresolved risk.

## Phase 1 - Canonical Method Style Contract

- [ ] Add `apps/web/src/features/ai-brew/methodStyleContracts.ts`.
- [ ] In that file define one typed contract for every method family currently present in `AiBrewMethodFamily`:
  - `v60`
  - `chemex`
  - `kalita_wave`
  - `clever_dripper`
  - `hario_switch`
  - `origami`
  - `april`
  - `melitta`
  - `kono`
  - `french_press`
  - `aeropress`
  - `siphon`
  - `moka_pot`
  - `cold_brew`
  - `batch_brew`
  - `espresso`
- [ ] Each method contract must include:
  - stable `methodFamily`
  - supported `styleId` values
  - Indonesian and English labels
  - target rasa mapping for all 8 target profiles: `balance_clean`, `more_sweetness`, `more_acidity`, `more_body`, `floral_transparent`, `fruit_forward`, `soft_round`, `dense_comforting`
  - compatible dripper ids or family fallback
  - required workflow phases
  - forbidden vocabulary leakage from other methods
  - recommended ratio/temp/grind/time envelopes
  - iced support flag and bypass support flag
  - output fields required by UI, export, tutorial, and AI guardrails
- [ ] Export helpers:
  - `getMethodStyleContract(methodFamily)`
  - `getMethodStyle(methodFamily, styleId)`
  - `resolveDefaultStyleForTarget(methodFamily, targetProfileId, context)`
  - `validatePlanAgainstMethodStyleContract(plan)`
  - `listAllMethodStyleCases()`
- [ ] Modify `apps/web/src/features/ai-brew/types.ts` so style ids and target profile ids are not duplicated across files without type checking.
- [ ] Add `tests/unit/aiBrewMethodStyleContracts.test.ts` to assert:
  - every `AiBrewMethodFamily` has a contract
  - every style has labels, target mapping, workflow phases, and guardrail rules
  - no style id is orphaned in UI/tutorial/planner tests
  - total style coverage remains at least the current `aiBrewMethodStyleCoverage` expectation of 70 style cases

## Phase 2 - Catalog And Data Hardening

- [ ] Update `apps/web/public/data/ai-brew/device-brew-profiles.v2026-06.json` so every production method profile has explicit `recipeStyle`, not only AeroPress and French Press.
- [ ] For Hario Switch, keep exact device separation:
  - `hario-switch-02`
  - `hario-switch-03`
  - `mugen-x-switch`
  - generic hot/iced fallbacks only when exact device is unavailable
- [ ] For AeroPress, keep all existing production styles and make each one explicit in profile metadata:
  - `standard`
  - `inverted`
  - `bypass`
  - `no_bypass`
  - `bright_clean`
  - `sweet_body`
- [ ] For Chemex, make style metadata explicit:
  - `traditional_three_pour`
  - `competition_multi_pulse`
  - `continuous_center_pour`
  - `iced_chemex`
  - `high_dose_heavy_body`
- [ ] For flat-bottom and immersion methods, make style metadata explicit for Kalita, Clever, French Press, Batch Brew, and Cold Brew.
- [ ] For cone drippers, make style metadata explicit for V60, Origami, April, Melitta, and Kono.
- [ ] For pressure/vacuum/stovetop methods, make style metadata explicit for Espresso, Moka Pot, and Siphon.
- [ ] Update `apps/web/public/data/ai-brew/manual-brew-presets.v2026-06.json` where presets currently borrow generic technique patterns so the copy and metadata are method-native. Do not leave Switch/Clever/French Press/Moka/Siphon/Cold Brew presets labeled or explained through AeroPress-specific semantics.
- [ ] Add a catalog integrity script or extend `scripts/ai-brew-method-style-audit.mjs` to fail when:
  - visible dripper has no method family
  - visible dripper resolves to no tutorial
  - production device profile has no explicit recipe style
  - target profile mapping is missing for any method
  - Switch 02/03/MUGEN exact profiles regress into ambiguous generic Switch guide output

## Phase 3 - Planner Integration

- [ ] Modify `apps/web/src/features/ai-brew/planner.ts`.
- [ ] Replace one-off profile preference in `resolveDeviceProfileSelection()` with contract-driven method style resolution for all methods, not only Kalita, Origami, AeroPress, and French Press.
- [ ] In `finalizePlanCore()`, normalize method style before per-method planners run, then re-validate after the planner returns.
- [ ] Ensure every plan exposes these fields coherently:
  - `methodFamily`
  - `recipeStyle`
  - `expectedCupProfile`
  - `workflowGuideSteps`
  - `workflowValidation`
  - `guardrails`
  - method-specific style fields such as `aeropressStyle`, `chemexStyle`, `cleverDripperStyle`, `switchProgramme`, and equivalent fields for other families
- [ ] Update `buildPlanMethodBrief()`, `buildPlanRecipeName()`, `buildPlanDescription()`, `buildPlanSteps()`, `buildPlanIngredients()`, and `buildPlanMetadata()` so exported recipes preserve style, target rasa, exact dripper, and honesty boundaries.
- [ ] Add regression tests in `tests/unit/aiBrewPlanner.test.ts`:
  - every visible dripper builds a plan
  - every method has target-aware style selection
  - every recipe export includes method-native phases
  - no plan for AeroPress, Switch, Clever, Chemex, Moka, Siphon, Cold Brew, Batch Brew, or Espresso leaks pour-over-only language

## Phase 4 - AeroPress From Baseline To Strong

- [ ] Modify `apps/web/src/features/ai-brew/aeropressCalibration.ts`.
- [ ] Keep existing strengths: target-aware temp, stir, steep, press, stop-before-hiss, bypass chamber split, roast-aware adjustments.
- [ ] Add explicit mapping for target rasa to AeroPress sensory intent:
  - clean balance
  - sweetness
  - acidity lift
  - body
  - floral transparency
  - fruit-forward juiciness
  - soft roundness
  - dense comfort
- [ ] Add guardrails for:
  - chamber capacity
  - bypass dilution range
  - inverted safety
  - press resistance
  - over-stir and under-stir
  - grind too fine for safe press
  - iced dilution split
- [ ] Update `apps/web/src/features/ai-brew/workflowGuide.ts` and `workflowTutorials.ts` so each AeroPress style has exact phases:
  - setup
  - charge
  - stir
  - steep
  - press
  - stop-before-hiss
  - bypass when applicable
  - serve
- [ ] Extend `tests/unit/aiBrewAeroPressBypassMatrix.test.ts`:
  - all 6 AeroPress styles x 8 targets x roast levels x water archetypes x grinder archetypes
  - reject pour-over terms
  - reject unrealistic bypass over chamber capacity
  - assert every recipe has a troubleshooting cue for sour, hollow, bitter, muddy, weak, and stalled press
- [ ] Update `docs/ai-brew-method-matrix.md`: AeroPress may only move from `PRODUCTION BASELINE` to stronger wording if the test matrix passes and the copy says software validation, not physical cupping proof.

## Phase 5 - Hario Switch 02/03/MUGEN Hardening

- [ ] Modify `apps/web/src/features/ai-brew/switchPlanner.ts`.
- [ ] Update these data files:
  - `apps/web/public/data/ai-brew/switch-programmes.v2026-06.json`
  - `apps/web/public/data/ai-brew/switch-dose-matrix.v2026-06.json`
  - `apps/web/public/data/ai-brew/switch-troubleshooting.v2026-06.json`
  - `apps/web/public/data/ai-brew/switch-knowledge.v2026-06.json`
- [ ] Guarantee exact behavior differences:
  - Switch 02 has smaller recipe envelope and tighter bypass/steep capacity rules.
  - Switch 03 supports larger dose and more forgiving immersion volume.
  - MUGEN x SWITCH has slower flow/percolation assumptions and distinct guide copy.
- [ ] Style coverage must include at least:
  - hybrid immersion bloom plus percolation finish
  - full immersion release
  - percolation-forward Switch
  - iced Switch
  - high-body Switch
  - bright/transparent Switch
- [ ] Add safety and clarity guardrails:
  - valve closed before immersion fill
  - valve release timing
  - chamber overfill warning
  - drawdown target
  - stalled drain recovery
  - no accidental Clever-only language
- [ ] Extend `tests/unit/aiBrewSwitchSafeRecovery.test.ts` and `tests/unit/aiBrewPlanner.test.ts` for Switch 02, Switch 03, and MUGEN x SWITCH across all target profiles.
- [ ] Add or extend an e2e case under `tests/e2e/` that selects Switch 02 and Switch 03 in the UI, generates a plan, opens guide detail, and verifies the visible guide names the selected device correctly.

## Phase 6 - Chemex, Flat-Bottom, Cone, Immersion, Pressure, And Cold Methods

- [ ] Chemex: modify `apps/web/src/features/ai-brew/chemexPlanner.ts`.
  - Keep the current five style ids.
  - Add target-specific cup intent and failure recovery for papery, hollow, bitter, weak, slow, and astringent outcomes.
  - Assert paper rinse, center pour, pulse/continuous logic, and iced split are visible where appropriate.
- [ ] Kalita: modify `apps/web/src/features/ai-brew/kalitaPlanner.ts`.
  - Preserve 155/185 size nuance.
  - Add explicit flat-bottom bed saturation and edge-channeling guardrails.
- [ ] Clever: modify `apps/web/src/features/ai-brew/cleverPlanner.ts`.
  - Differentiate closed immersion, reverse water-first, hybrid staged release, iced, and high-dose concentrate.
  - Ensure valve/release language does not collapse into Switch copy.
- [ ] V60/Origami/April/Melitta/Kono: update their resolver/planner paths and contract coverage.
  - V60 must keep spiral/pulse/percolation logic.
  - Origami must differentiate cone vs wave filter behavior.
  - April must preserve recipe structure suited to April drippers.
  - Melitta and Kono must include realistic flow and filter shape language.
- [ ] French Press: preserve existing strong style coverage and make tutorial/contract consistency explicit.
- [ ] Moka Pot: strengthen dose, water level, heat, sputter-stop, and safety guide. Do not describe it as pour-over or espresso.
- [ ] Cold Brew: strengthen immersion time, grind, dilution, concentrate, fridge/room-temp safety, and iced serving guide.
- [ ] Batch Brew: strengthen brew basket, batch size, grind, agitation, bypass, and commercial brewer assumptions.
- [ ] Siphon: strengthen vacuum phase, drawdown, agitation, heat management, and safety cues.
- [ ] Espresso: keep honest baseline if real-world calibration is insufficient. Add guardrails for dose/yield/time/grind, but do not claim full sensory production strength without machine/grinder validation.

## Phase 7 - Workflow Guide, Tutorial, And Localization

- [ ] Modify `apps/web/src/features/ai-brew/workflowGuide.ts`.
- [ ] Modify `apps/web/src/features/ai-brew/workflowTutorials.ts`.
- [ ] Modify localization files if guide labels are duplicated outside the tutorial module.
- [ ] For every method/style case, enforce:
  - exact method-native phase names
  - target rasa explanation
  - grinder adjustment cue
  - water cue when relevant
  - failure recovery
  - iced-specific dilution or ice split where relevant
  - no copied vocabulary from unrelated methods
- [ ] Keep guide density modes meaningful in `AiBrewPanel.tsx`:
  - Lite: minimum steps, no clutter
  - Basic: safe everyday recipe
  - Advanced: variables and recovery
  - Pro: full guardrails and target rationale
- [ ] Extend `tests/unit/aiBrewWorkflowTutorials.test.ts` so it validates exact style tutorial detail for all visible drippers and all method style contracts.

## Phase 8 - Frontend AI Brew UX

- [ ] Modify `apps/web/src/features/ai-brew/AiBrewPanel.tsx`.
- [ ] Keep the first screen operational; do not replace it with marketing content.
- [ ] Make style selection low-effort:
  - show method-specific style chips only after dripper/method is known
  - show selected target rasa as a concise control, not long explanatory text
  - show exact device name for Switch 02/03/MUGEN, AeroPress, Chemex, and other drippers
  - expose guide density without overwhelming default users
- [ ] In generated result cards, show:
  - recipe title
  - exact dripper
  - style
  - ratio/dose/water/temp/grind/time
  - target rasa
  - expected cup profile
  - method-native guide phases
  - warnings only when relevant
- [ ] Add empty/loading/error states that do not shift layout or hide controls.
- [ ] Verify mobile responsiveness for AI Brew panel, guide drawer, recipe export, and saved recipe flow.
- [ ] Extend UI tests:
  - `tests/e2e/ai-brew-*.spec.ts`
  - `tests/unit/aiBrewMethodStyleCoverage.test.ts`
  - `tests/unit/aiBrewWorkflowTutorials.test.ts`
- [ ] Run Playwright screenshot checks for desktop and mobile after implementation.

## Phase 9 - Backend AI, Guardrails, And Cross-Layer Consistency

- [ ] Modify `server-api/ai.ts`.
- [ ] Modify `server-api/_aiGuardrails.ts`.
- [ ] Modify `server-api/_orchestration.ts`.
- [ ] Modify shared AI contracts in `packages/shared/src/` if the response shape must become explicit.
- [ ] Ensure backend AI never invents recipe parameters that conflict with deterministic `BrewPlan`.
- [ ] Add or strengthen guardrails:
  - method mismatch
  - unsupported grinder/water/process values
  - unsafe temperature or pressure language
  - medical/health claims
  - hallucinated payment/admin state
  - prompt injection through catalog or user message
- [ ] Ensure chat explanations can cite style, target rasa, and guide phases from the actual plan.
- [ ] Strengthen tests:
  - `tests/unit/aiGuardrailsCentral.test.ts`
  - `tests/unit/aiBrewGuardrailClassification.test.ts`
  - `tests/unit/aiOrchestration.test.ts`
  - `tests/unit/serverOrchestrationContextBleed.test.ts`

## Phase 10 - Admin UX And Backend Logic

- [ ] Modify `server-api/admin/management.ts`.
- [ ] Modify `server-api/admin/_access.ts` only if role enforcement gaps are found.
- [ ] Modify `apps/web/src/pages/AdminManagement.tsx`.
- [ ] Modify `apps/web/src/services/adminApi.ts`.
- [ ] Reduce admin mental effort:
  - clear user search/filter
  - obvious billing/manual payment state
  - one-step operator note flow for critical mutations
  - self-lockout protection visible before submit
  - success/failure feedback tied to exact mutation
  - audit trail readable by support/admin
- [ ] Backend must enforce, not trust UI:
  - admin role allowlist and claims
  - operator note required for critical actions
  - self-demotion/self-suspension prevention
  - manual payment entitlement grant idempotency
  - promo usage accounting
  - safe error responses
- [ ] Add or strengthen tests:
  - `tests/unit/adminManagementHandler.test.ts`
  - `tests/unit/adminManagementClient.test.ts`
  - `tests/e2e/admin-*.spec.ts`

## Phase 11 - Billing, Payment, Proof Upload, And Entitlements

- [ ] Modify `server-api/billing/checkout.ts`.
- [ ] Modify `server-api/billing/proof.ts`.
- [ ] Modify `server-api/billing/manualPayments.ts`.
- [ ] Modify `server-api/_supabaseAdmin.ts`.
- [ ] Modify `apps/web/src/components/billing/AiAccessGate.tsx`.
- [ ] Modify `apps/web/src/services/billing.ts`.
- [ ] Make manual payment lifecycle explicit:
  - `draft`
  - `pending_proof`
  - `proof_uploaded`
  - `under_review`
  - `approved`
  - `rejected`
  - `expired`
- [ ] Store proof metadata consistently. When a signed upload URL is issued, record storage bucket/path/status instead of leaving it as ambiguous `metadata_only`.
- [ ] Add admin review visibility for proof status, proof file metadata, signed read URL availability, reviewer, reviewed time, rejection reason, and entitlement grant result.
- [ ] Keep checkout protections:
  - no duplicate pending invoice
  - no same/lower active plan repurchase
  - correct upgrade delta
  - promo normalization and usage accounting
  - idempotency across Supabase and runtime fallback
- [ ] Decide `server-api/payment/mayar.ts`:
  - preferred MVP final: remove public route from route table if Mayar is disabled and manual billing is canonical
  - alternative: wrap with shared CORS, trusted-origin enforcement, auth, rate limit, safe env gating, and tests
- [ ] Add or strengthen tests:
  - `tests/unit/billingCheckoutHandler.test.ts`
  - `tests/unit/billingProofHandler.test.ts`
  - `tests/unit/billingManualPaymentHandler.test.ts`
  - `tests/e2e/billing-*.spec.ts`

## Phase 12 - CORS, Route Parity, Security Headers, And Storage

- [ ] Modify `server-api/_shared.ts` only through small, tested helpers.
- [ ] Add `server-api/_routeSecurity.ts` only if it reduces duplication without changing behavior silently.
- [ ] Ensure every mutating route uses:
  - `applyCors`
  - `enforceTrustedRequestOrigin`
  - auth when account state or billing state changes
  - rate limit for sensitive endpoints
  - no-store where personal/admin/billing data is returned
  - sanitized errors
- [ ] Check route parity across:
  - `server.ts`
  - `api/[...route].ts`
  - `api/admin.ts`
  - `api/billing.ts`
  - `vercel.json`
- [ ] Add tests that fail if a route exists locally but is unreachable on Vercel rewrite or catch-all.
- [ ] Verify security headers stay aligned between `server.ts` and `vercel.json`:
  - CSP
  - HSTS
  - X-Frame-Options
  - X-Content-Type-Options
  - Referrer-Policy
  - Permissions-Policy
  - COOP/CORP where applicable
- [ ] Storage hardening:
  - `apps/web/src/features/ai-brew/storage.ts`
  - `apps/web/src/features/ai-brew/cloudSync.ts`
  - `apps/web/src/services/storageService.ts`
  - mobile AsyncStorage/local persistence if affected
- [ ] Ensure storage never writes raw secrets, auth tokens, payment proof content, or admin-only details to local storage.

## Phase 13 - Test Matrix And Verification

- [ ] Run fast local checks after each small set of changes:
  - `npm run check`
  - targeted `npx vitest run <changed-test-file>`
- [ ] Run AI Brew focused matrix:
  - `npm run test:ai-brew`
  - `npm run test:ai-brew:method-style-matrix`
  - `npm run test:ai-brew:method-style-guides`
  - `npm run test:ai-brew:method-style-language`
  - `npm run test:ai-brew:method-style-ui`
  - `npm run test:ai-brew:aeropress-bypass`
  - `npm run test:ai-brew:switch`
  - `npm run test:ai-brew:readiness99`
- [ ] Run backend/admin/billing/security checks:
  - `npm run test:gate:local`
  - `npm run prod:env:check`
  - `npm run launch:doctor`
  - `npm run release:verify`
- [ ] Run frontend verification:
  - `npm run build`
  - `npm run test:e2e`
  - `npm run test:a11y`
  - `npm run test:pwa`
- [ ] If heavy stress tests are practical in the machine budget, run:
  - `npm run test:ai-brew:deep`
  - `npm run test:ai-brew:real-world-1000`
  - `npm run test:ai-brew:10m-smoke`
- [ ] Do not claim `500k`, `1m`, or `10m` stress validation unless the exact command completed in this implementation branch.

## Phase 14 - Documentation And Launch Readiness

- [ ] Update method docs:
  - `docs/ai-brew-method-matrix.md`
  - `docs/ai-brew-method-style-inventory.md`
  - `docs/ai-brew-method-style-coverage-report.md`
  - `docs/ai-brew-method-style-ui-ux-report.md`
  - `docs/ai-brew-method-style-final-verdict.md`
- [ ] Update launch/admin/billing docs if routes or flows change:
  - `README.md`
  - `docs/ai-brew-production-hardening-report.md`
  - existing admin/billing docs if present
- [ ] Include an explicit final verdict table:
  - method
  - number of styles tested
  - target profiles covered
  - UI covered
  - tutorial covered
  - backend guardrail covered
  - remaining honest limitation
- [ ] Production launch checklist:
  - required env vars present
  - Supabase service role scoped and available
  - billing/manual payment QR configured
  - CORS origins match production domains
  - CSP does not block required assets
  - admin allowlist configured
  - smoke test account available
  - rollback path documented

## Phase 15 - Commit, Push, And Production

- [ ] Before commit, run `git diff --stat` and inspect every changed file.
- [ ] Do not stage unrelated `data/catalog/exports/phase1/grinders.search.json` unless implementation intentionally regenerated it and the diff is reviewed.
- [ ] Commit in logical chunks when possible:
  - contract/catalog hardening
  - planner/guide/tutorial hardening
  - AI Brew frontend UX
  - backend/admin/billing/security hardening
  - docs/tests/launch readiness
- [ ] Run final local verification after the last commit:
  - `npm run check`
  - `npm run test:ai-brew:readiness99`
  - `npm run test:gate:local`
  - `npm run build`
- [ ] Push the branch with `git push -u origin <branch>`.
- [ ] Run production deployment only after env validation and release gates pass.
- [ ] After production deploy, run:
  - `npm run smoke:prod`
  - `npm run smoke:prod:auth`
  - any configured billing/admin smoke script
- [ ] Final report must include:
  - commit hash
  - pushed branch
  - deployment URL
  - exact commands run
  - pass/fail status
  - unresolved risk
  - honest sensory validation limitation

## Definition Of Done

- [ ] Every visible dripper resolves to an explicit method family, style, recipe profile, guide, tutorial, and UI state.
- [ ] AeroPress, Hario Switch 02/03/MUGEN, Chemex, V60, Kalita, Clever, French Press, Origami, April, Melitta, Kono, Moka Pot, Cold Brew, Batch Brew, Siphon, and Espresso have deterministic recipe behavior with method-native language.
- [ ] All 8 target rasa profiles alter recipe intent in a visible, tested way.
- [ ] Workflow guides have no cross-method vocabulary leakage.
- [ ] AI/chat cannot override deterministic recipe parameters without being blocked or corrected by guardrails.
- [ ] Admin management is usable, safe, audited, and backend-enforced.
- [ ] Billing/manual payment lifecycle is idempotent, reviewable, and storage-aware.
- [ ] CORS, trusted-origin enforcement, headers, route parity, and storage rules are tested.
- [ ] All required local gates pass.
- [ ] Commit and push are complete.
- [ ] Production deploy and smoke checks are complete before claiming final launch.

## Recommended Execution Mode

- [ ] Use `superpowers:subagent-driven-development` for implementation because this plan spans recipe science, UI, backend, billing, and security in parallel.
- [ ] If subagents are unavailable, use `superpowers:executing-plans` and execute phases sequentially, committing after each stable phase.

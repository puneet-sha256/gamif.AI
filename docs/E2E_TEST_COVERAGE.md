# E2E Test Coverage

Playwright end-to-end test suite for Gamif.AI. Runs against a real dev server (`npm run dev:full:test`) in file storage mode with the OTP email bypass enabled. Tests assert behaviour by both UI interaction and direct API calls.

## How to run

```bash
# One-time: install Playwright browsers
npx playwright install chromium

# Run the full suite (~10-15 min depending on AI latency)
npm run test:e2e

# Single spec
npx playwright test tests/e2e/v2-rewards.spec.ts

# Headed mode (watch a browser open)
npm run test:e2e:headed

# Interactive UI runner
npm run test:e2e:ui
```

## Environment setup

The test suite runs with two env vars beyond the normal dev defaults:

| Env var | Why |
|---|---|
| `STORAGE_MODE=file` | Tests use `data/users.json` instead of Cosmos. Isolated, fast, deterministic. |
| `E2E_TEST_MODE=true` | `sendOtp` skips the email send. `verifyOtp` accepts code `000000` as a skeleton key (the real OTP also still works). Disabled in production. |

Both are set automatically by the `dev:full:test` script via `cross-env`. CI passes them explicitly.

The Azure OpenAI key from `.env` is required — the v2 reward path is AI-driven and tests exercise it. The `temperature=0` + seed-pinned config keeps responses stable enough for deterministic assertions.

## Seeded test users

`tests/e2e/globalSetup.ts` seeds these users at every run. Each represents a specific onboarding state so individual specs can pick their starting point. Password: `TestPass123!`

| Key | Email | State |
|---|---|---|
| `tour` | `tour-test@example.com` | Fully onboarded + catalog. Used by `onboardingTour.spec.ts`. |
| `v2Ready` | `v2-ready@example.com` | Fully onboarded + neutral catalog (difficulty 3 across all rows). Used by `v2-rewards.spec.ts`, `reward-claim.spec.ts`. |
| `needsIntake` | `needs-intake@example.com` | Profile + goals done, no catalog. Used by `intake.spec.ts`. |
| `needsProfile` | `needs-profile@example.com` | No profile yet. Used by `auth.spec.ts`, `profile-goals.spec.ts`. |
| `needsGoals` | `needs-goals@example.com` | Profile set, no goals. Used by `profile-goals.spec.ts`. |
| `veteran` | `veteran@example.com` | Has multi-day `activityHistory`, stats, catalog. Used by `streaks.spec.ts`, `shop.spec.ts`. |

## Spec files and coverage

### `auth.spec.ts`
Registration, login, session persistence.

| Test | Verifies |
|---|---|
| Login as fully-onboarded user → dashboard renders | AuthContext flow + session load |
| Login as user without profileData → profile setup screen | `getOnboardingStatus()` step routing |
| Login as user without goalsData → goals setup screen | Step routing for partial onboarding |
| Register new user via UI with OTP bypass → profile setup screen | `sendOtp` + `verifyOtpAndRegister` + OTP bypass + auto-login |
| Session persists after refresh | `loadCurrentUser` + localStorage `solo_leveling_session_id` |
| Logout clears session and routes to auth | `userDatabase.logout()` clears storage |

### `profile-goals.spec.ts`
Profile and goals onboarding screens.

| Test | Verifies |
|---|---|
| Profile setup with DOB picker persists name + dateOfBirth | `ProfileData` schema with DOB (post-#58 work) |
| Goals min-length is enforced (≥ 50 chars) | Frontend validation |
| Goals setup completes → dashboard / intake modal | Routing to dashboard after onboarding |

### `intake.spec.ts`
Milestone 1B intake calibration modal.

| Test | Verifies |
|---|---|
| Intake modal fires for user with goals but no catalog | Dashboard gate `!user.catalog` |
| Full intake flow → catalog written, modal closes, no re-fire | 12-card walk + extraction + persistence |
| Intake populates `calibration.goalTags` | `intake-extraction.prompt.md` emits goal_tags correctly |

### `v2-rewards.spec.ts`
Milestone 1C/1D core: extraction → tier classification → catalog lookup → reward → feedback.

| Test | Verifies |
|---|---|
| Single workout → goal-aligned reward with rateBreakdown + signature | Time-based unit path |
| Solving leetcodes → count rateBreakdown | Count-based unit path |
| Content-aware goal_advancement: Python article = goal-aligned, sci-fi novel = category-aligned | Same `reading_session` tag, different content → different tier (1.0× vs 0.80×) |
| Soft cap on duration (200-min workout) | `min(value, soft_cap_min)` enforcement |
| Count daily_cap (15 hard leetcodes credits 5) | `min(value, daily_cap)` enforcement |
| Effort-pair swap on unsuccessful attempt | `*_attempt` tag substitution, time unit |
| Inferred-effort penalty (× 0.85) | `value_source !== 'stated'` |
| Negation + aspirational filtering produces 0 activities | Prompt rule + server `value <= 0` filter |
| Multiple activities in one log → multiple entries | Extraction returns array, each persisted independently |
| **Consistency guarantee: same activity → identical XP/shards** | THE headline v2 promise |
| Feedback `up` → +1 stability, no rate change | `applyFeedbackToRow` upvote path |
| Feedback `under` pre-stability → rate × 1.10 | Pre-stability multiplier |
| Feedback convergence: `under` at stability=10 → ×1.05 | Stability gate flips multiplier to tight band |

### `reward-claim.spec.ts`
Reward claim flow.

| Test | Verifies |
|---|---|
| Claim modal shows rate breakdown + feedback chips per activity | UI breakdown line + 3 chips (👍/🔼/🔽) |
| Claim All → stats updated, unclaimed cleared | `updateExperience` + `updateShards` + clearRewards |

### `streaks.spec.ts`
Activity history + streak data.

| Test | Verifies |
|---|---|
| Veteran user has populated activityHistory | Seed data + assembleUser deserialisation |
| Activity heatmap component renders | Frontend chart code |
| Streak multipliers section renders | Streak calculation flows through to UI |

### `shop.spec.ts`
Shop + inventory.

| Test | Verifies |
|---|---|
| Add shop item via API → appears in Shop tab | `addShopItem` + UI |
| Buy with sufficient shards → deducts + adds to inventory | `buyShopItem` transactional update |
| Buy with insufficient shards → graceful failure | Server-side balance check |

### `tasks-crud.spec.ts`
Task management.

| Test | Verifies |
|---|---|
| Add → update → delete custom task | `addTaskToGeneratedTasks`, `updateTaskInGeneratedTasks`, `deleteTaskFromGeneratedTasks` |

### `onboardingTour.spec.ts` (pre-existing)
First-time tour overlay. Untouched by this PR; covers 13-step tour flow, skip, esc, relaunch, anchor positioning.

## Known gaps / out of scope

These are intentional omissions to keep the suite tractable. Worth adding in a follow-up:

- **Catalog miss + AI valuation path** — hard to trigger with normal activities because the 41-row seed catalog is broad. Would need esoteric activity descriptions and would still be flaky depending on the model's tag-mapping decisions.
- **Cross-category attribute split** (sports_play, mentorship) — feature not yet implemented in `rewardCalculationV2.ts`. Test will be added once the split lands.
- **Streak decay across long gaps** — would require time-travel or seeded date manipulation.
- **Forgot password / OTP for password reset** — same OTP bypass would work but flow isn't yet covered.

## Regression watchlist

These are the most likely regression vectors based on the merged history. Tests above were prioritised to catch them.

| Regression | Caught by |
|---|---|
| `ProfileData.age → dateOfBirth` migration breaks onboarding | `auth.spec.ts` (login routing), `profile-goals.spec.ts` |
| Per-category daily XP cap reintroduced → activities pay 0 | `v2-rewards.spec.ts` (consistency, multiple activities) |
| Goal tier classification becomes non-deterministic across runs | `v2-rewards.spec.ts` (consistency test) |
| Extraction prompt regresses on negation/aspirational handling | `v2-rewards.spec.ts` (negation test) |
| Feedback rate adjustment loses stability gate | `v2-rewards.spec.ts` (convergence test) |
| Session storage key changes / localStorage breaks session restore | `auth.spec.ts` (session persistence) |

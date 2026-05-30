# Rewards Calibration — Design Notes

Working design for making XP/shard rewards **consistent, personalised, and effort-based**. This document captures the full design conversation and supersedes any earlier notes.

> **Status:** Design complete, implementation not yet started.
> **Branch:** `feature/rewards-calibration` (based on `origin/main`)

---

## Problem statement

Current behaviour (see `src/server/utils/rewardCalculation.ts`, `src/server/prompts/activity-analysis.prompt.md`, `src/server/routes/aiRoutes.ts`):

- Daily AI-generated tasks carry per-task `xp` (0–25) and `shards` (0–50) — AI-invented numbers that vary day to day.
- Activity rewards multiply these unstable baselines by AI-chosen `effort_ratio`, `similarity_score`, and `alignment_factor`.
- Result: the same activity ("30-min run") earns different XP/shards depending on what tasks happened to be generated that day and how the model rolled its continuous-float judgements.

Three root causes of inconsistency:

1. **Daily task baseline drift** — base XP/shards for "Workout Session" varies day to day.
2. **Match-type drift** — the same activity classifies as `exact` one day, `similar` another → different multiplier.
3. **AI non-determinism** — `effort_ratio` etc. wobble across calls even with identical input (no `temperature=0` / seed pinning).

**User-stated goal:** *"a single activity on day one and day two should give the same amount of XP and shards."*

---

## Core design principle — "AI is the cataloger, table is the payer"

Separate **classification** (AI, once per novel activity) from **valuation** (deterministic lookup, every time).

- AI judges the worth of a new kind of activity once → result is written to the user's personal catalog.
- Every subsequent occurrence of that activity is a table lookup — identical input, identical output.
- AI's intelligence is preserved where it matters: understanding novel, nuanced, blended activities. Consistency is guaranteed for everything it has already seen.

---

## Personal catalog — per-user, not global

**Decision:** each user gets their own catalog, seeded from an onboarding conversation. No shared global rates.

**Why per-user:**
- The app's philosophy is self-improvement, not competition. A presentation earns more for someone who finds public speaking terrifying than for someone who does it every day — both are right, because the reward reflects personal growth.
- Eliminates the "first user anchors the rate for everyone" problem.
- Users who change their goals or skill level can recalibrate without affecting anyone else.

**Trade-off acknowledged:** no network effects, no shared learning across users. Accepted — self-improvement > competition.

---

## Onboarding calibration intake

### UX pattern — options + free text on the same card

Every intake question is presented as a **card with 4–5 selectable options plus an always-visible "describe in your own words" text box**. This is the same pattern Claude Code uses (quick replies + free input). The user can:

1. **Pick an option only** → fast path; AI uses the option as the signal.
2. **Pick an option + type extra detail** → option anchors the answer; text adds nuance.
3. **Skip the options, type only** → AI extracts entirely from free text.

All three modes feed the same extraction step.

**Why hybrid beats both pure approaches:**

| | Pure MCQ | Pure chat | **Hybrid (this)** |
|---|---|---|---|
| Speed for typical users | ✅ One tap | ❌ Multi-turn | ✅ One tap |
| Nuance captured | ❌ Lost | ✅ Full | ✅ Full (if used) |
| "None of these fits" | ❌ Trapped | ✅ Natural | ✅ Built-in textbox |
| Intimidation level | ✅ Low | ⚠ Some hesitate | ✅ Low |
| Structured for AI | ✅ Direct | ⚠ Needs extraction | ✅ Both signals work |
| Familiar UX | ✅ Yes | ⚠ Newer | ✅ Yes |

Pure MCQ collapses real nuance. Example: *"I'm not very comfortable giving a presentation in front of leadership or unknown people, but when I know people, I'm a bit comfortable. Talking to a friend is not a problem."* — no four-option question can capture that. The text box is what saves it.

### Question card layout

```
─────────────────────────────────────────────────────────
  How comfortable are you with communication in
  professional settings?

  ◯ Very comfortable in most situations
  ◯ Comfortable with people I know, nervous with strangers
  ◯ Comfortable one-on-one, anxious in groups or on stage
  ◯ Uncomfortable with unfamiliar people or large audiences
  ◯ Generally uncomfortable in professional communication

  ┌───────────────────────────────────────────────────────┐
  │ None of these quite fit? Or want to add detail?       │
  │ Type here…                                            │
  └───────────────────────────────────────────────────────┘

                                            [ Continue → ]
─────────────────────────────────────────────────────────
```

### Survey structure

After the user sets their goals, the AI generates a tailored intake:
- **3 question cards per stated goal** (current level, perceived difficulty, biggest barrier)
- **1 category catch-all card per category** (covers activities outside stated goals)

Total: ~12 cards. Most users complete in under 5 minutes via taps; users who add free-text detail spend slightly longer in exchange for a more accurate catalog.

### Example — Priya's intake

> Goals: *"I want to build muscle and get fit, learn DSA, and improve my communication skills for leadership."*

**Goal 1: Build muscle and get fit**

> Q1. How many days a week do you currently exercise or work out?
> `0 days` / `1–2 days` / `3–4 days` / `5+ days`
> Free text: *(empty)*

> Q2. When you do work out, how hard do you push yourself?
> `Very light` / `Moderate` / `Intense` / `Maximum effort`
> Free text: *(empty)*

> Q3. What's your biggest barrier to staying consistent?
> `Lack of time` / `Low motivation` / `Don't know what to do` / `Recovery / soreness`
> Free text: *(empty)*

**Goal 2: Learn DSA**

> Q4. How many coding problems (LeetCode or similar) have you solved in the past month?
> `None` / `1–10` / `11–30` / `30+`

> Q5. How hard is it to stay focused during a study or coding session?
> `Very easy` / `Manageable` / `Hard` / `Very hard`

> Q6. When stuck on a problem, how long before you look for hints or give up?
> `Under 10 min` / `10–30 min` / `30–60 min` / `I rarely give up`

**Goal 3: Communication for leadership** ← uses the free-text box

> Q7. How comfortable are you with communication in professional settings?
> Selected option: *"Uncomfortable with unfamiliar people or large audiences"*
> Free text: *"Especially with leadership or people I've never met. Friends and close colleagues are no problem. In mixed groups I tend to hang back unless I really know the topic."*

> Q8. What feels hardest for you in communication?
> Selected option: *"Presenting ideas clearly"*
> Free text: *(empty)*

> Q9. How often do you initiate professional conversations or networking?
> Selected option: *"Sometimes"*
> Free text: *"Mostly with people I already work with. I avoid initiating with strangers."*

**Category catch-alls**

> Q10. Outside your goals, how physically active are you day-to-day?
> `Mostly sedentary` / `Light activity` / `Moderately active` / `Very active`

> Q11. Outside your goals, how often do you engage in general learning — reading, podcasts, courses?
> `Rarely` / `Occasionally` / `Regularly` / `Daily habit`

> Q12. Outside your goals, how socially engaged are you — conversations, meetings, collaborations?
> `Mostly solo` / `Some interaction` / `Regular interaction` / `Highly social`

### Structured extraction after the intake

The user never sees this step. After they finish the cards, a single AI extraction call converts all `{question, option, free_text}` triples into structured catalog signals:

```json
{
  "catalog_signals": [
    { "tag": "presentation",      "modifier": "leadership_audience", "category": "Charisma", "difficulty": 5 },
    { "tag": "presentation",      "modifier": "unknown_audience",    "category": "Charisma", "difficulty": 5 },
    { "tag": "presentation",      "modifier": "known_audience",      "category": "Charisma", "difficulty": 2 },
    { "tag": "social_initiation", "modifier": "stranger",            "category": "Charisma", "difficulty": 4 },
    { "tag": "social_initiation", "modifier": "friend",              "category": "Charisma", "difficulty": 1 },
    { "tag": "group_speak",       "modifier": "mixed",               "category": "Charisma", "difficulty": 3 }
  ]
}
```

If Priya had only picked option 4 on Q7 (no free text), the extraction would have produced **one** broad signal: `presentation|Charisma|unknown_audience → difficulty 4`. The free text turned that one signal into six fine-grained catalog rows.

### Summary card — user verifies

After extraction, the user sees a confirmation card they can correct before the catalog is committed:

> *Here's what we understood about you. Tap anything to correct it.*
> - Presenting to leadership / unknown audiences → **Very challenging**
> - Presenting to people you know → **Manageable**
> - Starting conversations with strangers → **Challenging**
> - Talking to friends / known colleagues → **No problem**
> - Speaking in mixed groups → **Depends on the topic**

Corrections feed back into the catalog before it's first used. Builds trust from day one.

### UI decisions to nail down before building

- **Selection mode:** the option group is a single-select (radio) but the text box is independent — user can have both filled. Treat the text as additional context layered on the selection, not a replacement.
- **Text-box visibility:** always visible, visually secondary (smaller, lighter border) so it doesn't compete with the options.
- **Placeholder:** *"None of these quite fit? Or want to add detail? Type here…"* — explicitly invites both use cases.
- **Character limit:** soft limit ~300 chars with a counter. Long enough for nuance, short enough to keep extraction fast and prevent rambling.
- **Skip behavior:** if user provides neither an option nor text, "Continue" is disabled. If both are provided, both are sent.

---

## From survey answers to catalog rates

**Core formula:** harder for you = higher reward rate. The system rewards the challenge you are overcoming, not the activity in absolute terms.

```
rate_multiplier = 0.75 + (difficulty_score × 0.25)
```

| Difficulty | Multiplier | Meaning |
|---|---|---|
| 1 | 1.00× | Very easy — low rate |
| 2 | 1.25× | Somewhat easy |
| 3 | 1.50× | Moderate |
| 4 | 1.75× | Challenging |
| 5 | 2.00× | Very hard — high rate |

Applied to a global floor rate per category + unit type. Example for Priya vs someone who finds presentations easy:

| User | Tag | Difficulty | Rate |
|---|---|---|---|
| Priya | `presentation\|Charisma\|unknown_audience` | 5 | 40 XP flat |
| Alex (comfortable) | `presentation\|Charisma\|unknown_audience` | 1 | 20 XP flat |

Same activity. Legitimately different rewards. Both are right.

---

## Activity signature

Every activity is normalised to a stable fingerprint:

```
<tag> | <category> | <modifier>
```

- `tag` — canonical activity name (`running`, `leetcode_problem`, `mentor_engineer`)
- `category` — `Strength` | `Intelligence` | `Charisma`
- `modifier` — per-tag dimension: intensity / difficulty / audience tier / focus level

**Duration / count is NOT part of the signature** — it is applied at lookup time as a multiplier against the stored rate.

---

## Catalog row format

```json
"running|Strength|moderate": {
  "unit": "time",
  "xp_per_min": 0.70,
  "shards_per_min": 1.40,
  "soft_cap_min": 90,
  "typical_duration": 30,
  "auto_added": false,
  "seeded_by_goal": "build muscle and get fit",
  "stability_score": 0,
  "feedback_count": 0,
  "version": 1
}
```

Three unit types:

| Unit | Catalog stores | Reward formula |
|---|---|---|
| `time` | `xp_per_min`, `shards_per_min`, `soft_cap_min` | `rate × min(duration, cap)` |
| `count` | `xp_per_unit`, `shards_per_unit`, `daily_cap` | `rate × min(count, cap)` |
| `event` | `xp_flat`, `shards_flat`, `daily_cap` | `flat × min(occurrences, cap)` |

`seeded_by_goal` tracks which goal created each row — used when the user changes goals.

---

## Daily task generation — tasks output signatures, not XP

**Current:** AI generates `{ title, description, xp: 20, shards: 40 }` — invented numbers.

**New:** AI generates `{ title, description, tag, category, modifier, expected_duration_min }`. The system looks up the user's personal catalog to compute the expected reward shown on the task card.

```json
{
  "title": "Workout Session",
  "description": "Do a 45-minute strength or resistance workout",
  "category": "Strength",
  "tag": "workout_strength",
  "modifier": "moderate",
  "expected_duration_min": 45
}
```

Expected reward on card: catalog lookup → `0.70 XP/min × 45 = 32 XP` (Priya's rate). Another user with a higher difficulty score sees a higher expected reward for the same card. Same task, personalised preview.

---

## Goal-alignment bonus tiers

When the user logs activities, AI classifies each as one of four match types against their daily tasks and goals. The classification is discrete (not a continuous float), so there is no AI non-determinism in the multiplier magnitude.

| Match type | When | Bonus |
|---|---|---|
| **Goal-exact** | Directly matches a planned daily task | 1.20× |
| **Goal-similar** | Same domain as a planned task, not identical | 1.10× |
| **Goal-aligned** | Advances a stated goal, not a specific task | 1.00× |
| **Category-aligned** | Matches Strength / Intelligence / Charisma but not a stated goal | 0.80× |
| **Unrelated** | No category or goal fit | No reward |

The AI only decides *which tier* — the magnitude is fixed code. This is the key difference from the old `similarity_score` (0.0–1.0, AI-invented on every call).

---

## Lookup flow (full)

```
User logs activity
       ↓
AI extraction (temperature=0, seed=fixed)
  → { tag, category, modifier, value, value_source, completed, confidence }
       ↓
Confidence check: any required field missing for this unit type?
       ↓
   YES — fire clarification card (see next section)        NO — continue
       ↓
Build signature: tag|category|modifier
       ↓
Lookup in user's personal catalog
       ↓
    HIT?                          MISS?
     ↓                              ↓
Deterministic reward            AI valuation step
rate × value × goal_bonus       (anchored to 3+ existing seed rows)
                                    ↓
                                Write new row to catalog
                                    ↓
                                Pay reward (same formula)
       ↓
Persist to taskHistory + unclaimedRewards
```

---

## Clarification dialogue for vague logs

When a user logs an activity without the details needed to compute a fair reward, the system asks back rather than guessing. *"I worked out today"* is ambiguous — duration and intensity are missing — and inferring them silently has been one of the sources of historical reward inconsistency.

### Trigger rule

The activity extraction step emits a `confidence` value per field. After extraction, before lookup:

| Tag unit | Required fields | If any are null → |
|---|---|---|
| `time` | `duration_min`, `modifier` | Clarify |
| `count` | `count`, `modifier` | Clarify if either missing |
| `event` | `modifier` only | Clarify only if modifier missing |

### Card layout (same hybrid pattern as intake)

```
─────────────────────────────────────────────
 Quick — just need a couple details for your
 workout to calculate the right reward.

 How long was it?
 ◯ Under 15 min   ◯ 15–30   ◯ 30–60   ◯ 60+
 [ Or type a number… ]

 How intense did it feel?
 ◯ Light      ◯ Moderate    ◯ Intense
 [ Anything else to add? ]

 [ Skip — use my best guess ]      [ Confirm ]
─────────────────────────────────────────────
```

User taps `30–60` + `Moderate` → merged into the extraction → `{duration_min: 45, modifier: "moderate"}` → reward computed.

### When NOT to clarify (keep friction low)

| Situation | Behaviour |
|---|---|
| `count`-based activity, count stated ("solved 2 leetcodes") | No clarify — duration not required |
| `event`-based activity ("gave a presentation") | No clarify if modifier inferable |
| `time`-based activity, duration stated | No clarify |
| Modifier missing but typical default exists | Pre-fill default, soft confirmation only |
| Activity clearly minor ("walked to the kitchen") | Skip extraction, no reward, no card |

### Hard rules

1. **Max 2 clarification cards per logged activity.** After that, accept defaults with inferred-effort penalty (×0.85) and move on.
2. **Batch clarifications across activities.** If user logs 3 activities and 2 are vague, ask once with all the missing fields, not three separate cards.
3. **Always dismissible** via "Skip — use my best guess." Skipping accepts the inferred-effort penalty rather than blocking the reward.
4. **No clarification on backfill submissions ≥ 1 day old.** User likely doesn't remember exact details — accept defaults with penalty.

### Why this matters

Without clarification, the system silently picked a 30-min default for *"I worked out"* and a moderate intensity guess — both invented, both contributing to perceived inconsistency. Asking back is honest: the user provides the truth, the system rewards it accurately.

---

## Effort vs. outcome — paired tags

The app's philosophy: *"you get better by trying, not just by succeeding."* Unsuccessful effort must pay. Every count/event tag has a paired time-based effort tag:

| Outcome tag (count/event) | Effort tag (time) |
|---|---|
| `leetcode_problem` | `leetcode_attempt` |
| `presentation` | `presentation_prep` |
| `cold_call` | `cold_call_practice` |
| `interview` | `interview_prep` |
| `article_published` | `writing_session` |
| `workout_completed` | `workout_attempted` |

AI picks based on `completed: true | false | partial` in the journal. Rates calibrated so solving outpays equivalent-time attempting — but attempting always pays something meaningful.

---

## Feedback loop — catalog evolves with the user

After each reward claim, an optional feedback prompt:

```
You earned 22 XP for "mentored a junior dev for 45 min"
[ 👍 Feels right ]  [ 🔽 Too much ]  [ 🔼 Too little ]
```

| Response | Rate adjustment | Notes |
|---|---|---|
| Too little | `rate × 1.10` | Capped at 2× seed floor |
| Too much | `rate × 0.92` | Floor at 0.5× seed floor |
| Feels right | No change | Increments `stability_score` |

**Stability score:** starts at 0, increments on "Feels right" and non-flagged uses, decrements on corrections. Once `stability_score ≥ 10`, adjustments shrink to ±5%. The row has converged to the user's truth.

Recalibration quiz can be offered every 90 days or on demand. On retake:
- `auto_added: false` seed rows recompute from new scores.
- `auto_added: true` earned rows keep their stability unless user explicitly resets.

---

## AI tasks and model assignments

Every AI call in this system is enumerated below. Each runs with `temperature=0` and a fixed `seed` so the same input deterministically produces the same output. The intelligent work is split into small focused calls instead of one monolithic prompt — easier to debug, retry, and tune individually.

| # | AI task | When it fires | Complexity | Recommended model |
|---|---|---|---|---|
| 1 | **Intake question generation** | Once, after user sets goals | Moderate — creative + structured | `gpt-4o-mini` / `claude-haiku-4-5` |
| 2 | **Intake answer extraction** | Once, after user finishes intake cards | High — nuanced free text → structured catalog signals | `gpt-4o` / `claude-sonnet-4-6` |
| 3 | **Intake summary generation** | After extraction, before user confirms | Low — light rephrasing for display | `gpt-4o-mini` / `claude-haiku-4-5` |
| 4 | **Daily task generation** | Each morning, per user | Moderate — pick catalog-aware tags | `gpt-4o-mini` / `claude-haiku-4-5` |
| 5 | **Activity extraction** | Every daily-activity submission | High — natural language → tag + modifier + value + completion | `gpt-4o` / `claude-sonnet-4-6` |
| 6 | **Clarification dialogue** | When extracted fields are incomplete | Moderate — decide what to ask, merge follow-up answers | `gpt-4o` / `claude-sonnet-4-6` |
| 7 | **Goal-alignment classification** | Per logged activity | Low — discrete tier selection | `gpt-4o-mini` / `claude-haiku-4-5` |
| 8 | **Catalog miss valuation** | Rare — only on novel signature | High — anchored reasoning over seed rows | `gpt-4o` / `claude-sonnet-4-6` |
| 9 | **Recalibration retake handling** | On user-initiated re-intake | High — same shape as #2 | `gpt-4o` / `claude-sonnet-4-6` |

### Two-tier model strategy

- **Smart tier** (tasks 2, 5, 6, 8, 9): the brain of the system. These produce the outputs that determine reward accuracy and catalog growth. Use `gpt-4o` or `claude-sonnet-4-6`.
- **Fast tier** (tasks 1, 3, 4, 7): structured-format work where reasoning isn't load-bearing. Use `gpt-4o-mini` or `claude-haiku-4-5`.
- **Do not use Opus** for any runtime task — ~5× the cost of Sonnet with no quality gain on these workloads. Reserve Opus for design work, not production calls.

### Why split into 9 calls instead of fewer

The current system uses one monolithic `analyzeDailyActivity` call that classifies, scores effort, and assigns XP/shards in one shot. Splitting yields:

- **Cleaner failure modes** — if extraction succeeds but valuation fails, retry only the valuation. Today, a failure anywhere requires re-running the whole pipeline.
- **Selective caching** — task generation can cache per `(goals, calibration)` pair across days. Activity classification can cache per `(signature, user_goals_hash)`. The monolithic call cached nothing.
- **Targeted tuning** — when a specific behaviour drifts (e.g. valuations creeping high), the prompt for that one task is fixed in isolation.
- **Cost discipline** — only the high-reasoning calls use the expensive model. Goal-alignment classification (called every activity) runs on the cheap tier.

### Determinism guards on every call

- `temperature=0`
- Fixed `seed` (per task type; doesn't need to be unique per user)
- `response_format: json_object` for all structured outputs
- Schema validation in code — if a call returns malformed JSON, retry once with a stricter system prompt, then fail with a clear error

These together eliminate the "AI rolls different numbers on different days" failure mode that motivated this whole redesign.

---

## Worked example — Priya, full flow

**Catalog after onboarding (excerpt):**
```
workout_strength  | Strength    | moderate | time  | 0.70 XP/min | cap 90min
leetcode_problem  | Intelligence| medium   | count | 13 XP/unit  | cap 5/day
leetcode_attempt  | Intelligence| hard     | time  | 0.42 XP/min | cap 90min
presentation      | Charisma    | unknown  | event | 40 XP flat  | cap 2/day
social_initiation | Charisma    | stranger | count | 12 XP/unit  | cap 5/day
```

**Evening log:** *"Did a 40-min workout, solved 2 medium leetcodes, and led today's standup."*

| Activity | Signature | Match | Reward |
|---|---|---|---|
| 40-min workout | `workout_strength\|Strength\|moderate` → hit | Goal-exact (1.20×) | `0.70 × 40 × 1.20 = 34 XP` |
| 2 medium leetcodes | `leetcode_problem\|Intelligence\|medium` → hit | Goal-exact (1.20×) | `13 × 2 × 1.20 = 31 XP` |
| Led standup | `standup_facilitation\|Charisma\|team` → **miss** | — | AI valuation → 20 XP, row written |

**Total: 85 XP.** New catalog row:
```
standup_facilitation | Charisma | team | event | 20 XP flat | stability: 0
```

Next time Priya leads standup → instant hit → 20 XP. Deterministic.

**Priya gives feedback:** 🔼 Too little → `20 × 1.10 = 22 XP`. She taps 👍 three more times → row stabilises at 22 XP.

---

## Edge cases — mitigation catalogue

### 1. Catalog integrity
- **Tag duplication.** AI invents `mentor_engineer`, `mentoring_session`, `mentor_dev`. **Mitigation:** AI prompt lists existing similar tags first; propose new only if none fits. Periodic dedup script flags near-duplicates for merge.
- **Calibration drift.** Month-6 auto-added rows drift from seed scale. **Mitigation:** AI valuation always anchors against ≥3 immutable seed rows, never the full catalog.
- **Seed re-tuning.** Bumping a seed rate changes expectations. **Mitigation:** version catalog (`v1`, `v2`); never back-rewrite `taskHistory`.

### 2. Boundary cases
- **Cross-category blends.** "Mentored a junior dev" = Charisma + Intelligence. **Mitigation:** catalog rows declare `secondary_category` with split (e.g. 70/30). Reward splits across both attribute pools.
- **No category fits.** "Cleaned the house." **Mitigation:** low-XP Strength bucket for physical chores, or friendly "not tracked here" message.
- **Catastrophic outcomes.** "Workout, pulled a muscle." **Mitigation:** keep the effort reward. Don't penalise bad luck.

### 3. Adversarial / gaming
- **Lexicon optimisation.** User calls everything "intense." **Mitigation:** daily cap per signature AND per category (e.g. max 80 XP/day in Strength). AI cross-checks intensity vs duration ("intense workout for 5 min" gets normalised down).
- **Duplicate submissions.** Same workout logged twice in different words. **Mitigation:** check signatures against `taskHistory` for same `activityDate`. Prompt "similar to existing entry — combine, replace, or keep both?"
- **Cumulative dumping.** "Did 20 problems this week" on Sunday. **Mitigation:** require `activityDate` per activity. Daily caps naturally limit.
- **Inflated counts.** "Did 500 push-ups." **Mitigation:** per-tag `max_per_session` sanity ceiling. Outliers capped or flagged.

### 4. Time / reporting
- **Backfill.** Tuesday's run logged on Friday. **Mitigation:** allow backfill ≤7 days. **Critical:** recompute streaks when backfilling.
- **Time-zone edge.** 11:55pm vs 12:05am. **Mitigation:** trust client local date; ask "today or yesterday?" if submitted before 4am.
- **Aspirational.** "Going to study tonight." **Mitigation:** extraction prompt filters to past-tense only.
- **Negation.** "I didn't work out today." **Mitigation:** extraction detects negations and skips.

### 5. AI failure modes
- **Hallucinated activities.** AI invents what wasn't said. **Mitigation:** every entry must be grounded in user text; low-confidence flag → skip.
- **Wrong category.** "Workout" → Intelligence. **Mitigation:** validate AI's `category` against catalog row's declared category. Catalog wins.
- **Malformed JSON.** **Mitigation:** existing fallback parser at `aiRoutes.ts:233`; retry with stricter prompt before giving up.
- **Rate explosion.** AI proposes 1.5 XP/min for stretching. **Mitigation:** clamp per category (Strength: 0.1–0.7 XP/min). Clamped rows flagged for review.

### 6. UX / transparency
- **Showing rates.** Mechanical vs arbitrary. **Compromise:** show outcome breakdown ("18 XP for 60 min hard leetcode attempt"), not raw rate.
- **Disputes.** **Recommendation:** "report an issue with this reward" button on each `taskHistory` entry, feeds catalog review.
- **Catalog miss UX.** Show user why: "First time we've seen 'mentoring' — based on similar activities, this is worth 22 XP."

### 7. Long-tail / philosophical
- **Goal changes.** Rows tagged with old goal are flagged for recalibration; `taskHistory` entries are immutable (categories stamped at activity time).
- **Streak guilt.** Soft-decay (×0.65) already softens; consider "rest day token" earned at 30-day streak milestone (1 free skip / 30 days).
- **Off-spirit activities.** "Drank 6 beers." Extraction prompt skips non-self-improvement activities. No lecture, just no reward.

---

## Pre-ship priorities (v1 must-haves)

1. **Tag duplication mitigation** — without it the catalog rots and consistency dies.
2. **Daily caps per signature and per category** — biggest anti-gaming lever, smallest UX cost.
3. **Summary card after onboarding intake** — user must be able to correct AI's interpretation of their answers before catalog is used.

---

## Files this will touch (implementation)

| File | Change |
|---|---|
| `src/server/prompts/activity-extraction.prompt.md` | **Rename/rewrite** of `activity-analysis.prompt.md` — extraction only, emits `confidence` flag, no XP/shard output |
| `src/server/prompts/activity-valuation.prompt.md` | **New** — fires on catalog miss, anchored to seed rows |
| `src/server/prompts/activity-clarification.prompt.md` | **New** — generates clarification questions for incomplete extractions |
| `src/server/prompts/goal-alignment.prompt.md` | **New** — classifies activity into one of 5 alignment tiers |
| `src/server/prompts/task-generation.prompt.md` | Output `tag + modifier` instead of `xp + shards` |
| `src/server/prompts/intake-question-generation.prompt.md` | **New** — generates 4–5 options + free-text prompts per goal |
| `src/server/prompts/intake-extraction.prompt.md` | **New** — converts intake card answers into catalog signals |
| `src/server/prompts/intake-summary.prompt.md` | **New** — light prose summary of extracted signals for user confirmation |
| `src/server/utils/rewardCalculation.ts` | Replaced with signature lookup + goal-bonus tier logic |
| `src/server/db/` | New `catalogRepository` + interface; new `catalog` sub-doc per user |
| `src/server/routes/aiRoutes.ts` | Orchestration changes for new flow |
| `src/shared/types/` | Catalog and signature types |
| `src/components/` | Onboarding intake component — card UI with options + free-text box (post-goals step) |
| `src/components/Dashboard.tsx` | Reward claim shows breakdown; feedback prompt (👍/🔽/🔼) |

---

## Open questions (to resolve before implementation)

- [ ] **Cosmos catalog storage:** new `activityCatalog` container (partition `/userId`) or `catalog` sub-doc on the user's existing partition? Leaning sub-doc to avoid cross-partition reads.
- [ ] **Intake UI placement:** new step in the existing onboarding flow (`auth → profile → goals → [intake cards] → dashboard`), or a modal on first login after goals are set? The latter is less disruptive. *(Card UX itself is resolved: options + free-text box per card.)*
- [ ] **Recalibration trigger:** offer after 90 days, on goal change, or on demand only?
- [ ] **Streak interaction:** keep current 10+ XP/day rule? The new model rewards effort more reliably — worth revisiting once rates are tuned.
- [ ] **Migration of existing `taskHistory`:** stamp old entries with their original values and start new system clean. Do not retro-score. *(Agreed.)*
- [ ] **Seed catalog draft:** need ~30–40 hand-curated rows across Strength / Intelligence / Charisma as the AI's valuation anchors.

---

## Changelog

- 2026-05-17 — Added clarification dialogue for vague activity logs (fires when extraction confidence is low); enumerated all 9 AI tasks with model recommendations (two-tier strategy: Sonnet/gpt-4o for reasoning, Haiku/gpt-4o-mini for structured work); expanded prompt file list.
- 2026-05-17 — Replaced pure chat intake with hybrid card pattern: 4–5 options + always-visible free-text box per question. Matches Claude Code's quick-replies-plus-input pattern.
- 2026-05-16 — Full design overhaul: per-user catalog, onboarding intake, goal-alignment tiers, feedback loop, paired effort/outcome tags, task generation outputs signatures. Captures full "Rewards_Calibration" session.
- 2026-05-03 — Initial design doc (global catalog, signature/lookup model, edge cases).

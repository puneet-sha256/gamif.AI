# Feature 13 — First-Time User Onboarding Tour

**Status:** Proposed
**Priority:** P0
**Scope:** Medium
**Owner:** _TBD_

## Overview

After a brand-new user completes registration, profile setup, and goals setup, the dashboard suddenly presents four tabs, ring charts, streak cards, an activity heatmap, an "Unclaimed Rewards" button, a "Log Daily Activities" CTA, a custom shop, and an inventory — none of which are self-explanatory. New users do not know what XP, shards, streaks, or activity logging are *for*, nor that the daily-activity → AI-analysis → claim-rewards loop is the core game loop.

This feature adds an opt-out, anchored tooltip tour that fires the first time the dashboard renders for a user, walking them through every functional surface of the current app and the purpose of each. It explains what Gamif.AI does (gamified self-development inspired by Solo Leveling: turn real-world activities into XP, shards, and attribute growth), how the daily loop works, and where to find each feature. The tour is fully responsive, persists completion state on the user record so it does not re-fire across devices, and can be re-launched on demand from a small "Show tour" link in the Profile tab.

## Goals

1. Reduce time-to-first-activity-log for new users.
2. Make the daily loop (log → analyze → claim) discoverable without reading docs.
3. Cover every current top-level feature: Profile / Tasks / Inventory / Shop tabs, level/XP, shards, streaks, activity heatmap, unclaimed rewards, custom tasks, custom shop items, theme toggle.
4. Work cleanly on mobile (320px+) and desktop without different content.

## Non-Goals

- Not a settings/preferences screen — only a one-time tour.
- Not interactive teaching (no "click this to continue" gating).
- Does not cover features that don't exist yet (achievements, parties, etc. — those will get their own spec extensions when shipped).

## User Stories

- As a newly-registered user landing on the dashboard for the first time, I see a welcome tooltip explaining what Gamif.AI is and how the daily loop works, then I'm walked through each tab and key control.
- As a user mid-tour, I can press **Next**, **Back**, **Skip**, or close (Esc / X / outside-click) at any time. Skipping or finishing both mark the tour complete.
- As a returning user on a new device, I do not see the tour again because completion is stored server-side.
- As a user who skipped too quickly, I can re-launch the tour from a "Show tour" link in my Profile tab.
- As a mobile user, every bubble fits on screen, anchors visibly to its target, and never gets clipped by the safe-area inset or the on-screen keyboard.

## Tour content (13 steps)

The tour anchors via `data-tour="<key>"` attributes added to existing elements (no DOM restructuring). Steps that live on a non-active tab cause the tour to switch tabs before showing the bubble.

| # | Anchor key | Tab | Title | Body |
|---|---|---|---|---|
| 1 | `welcome` (centered modal, no anchor) | — | **Welcome to Gamif.AI** | "Turn real-world progress into XP, shards, and stat growth — Solo Leveling for your actual life. Log what you did each day, an AI matches it to your goals, and you level up. Let's tour the controls." |
| 2 | `header-greeting` | profile | **Your hub** | "Everything happens here. Switch tabs at the top, claim rewards from the header, or log out anytime." |
| 3 | `unclaimed-rewards` | profile | **Unclaimed Rewards** | "When the AI matches your activities to tasks/goals, the rewards land here. Click the badge to view and claim XP and shards." |
| 4 | `theme-toggle` | profile | **Theme toggle** | "Switch between light and dark themes. Your choice persists across sessions." |
| 5 | `tab-nav` | profile | **Four tabs** | "**Profile** for stats, **Tasks** for daily challenges, **Inventory** for what you own, **Shop** for what you want." |
| 6 | `level-card` | profile | **Level & XP** | "Total XP determines your level. Earn it by logging activities that match your tasks and goals. Levels 1–10 cost 100 XP each, then the cost grows in 50-XP steps." |
| 7 | `shards-card` | profile | **Shards** | "💎 Shards are your currency. Earn them alongside XP, then spend them in the Shop on rewards you set for yourself." |
| 8 | `streak-multipliers` | profile | **Streak multipliers** | "Streak = consecutive days with any activity. Hit 10+ XP in a category daily to grow that category's multiplier — your shard rewards grow with it. Miss a day and the streak softly decays instead of resetting." |
| 9 | `ring-chart` | profile | **Attribute distribution** | "Your XP splits across **Strength**, **Intelligence**, and **Charisma** — the AI assigns each activity to one. The ring shows your balance; aim for a shape you like." |
| 10 | `activity-heatmap` | profile | **Activity heatmap** | "A year-at-a-glance view of your daily XP. Tap any cell to see exactly what you logged that day." |
| 11 | `tasks-tab` | tasks | **Tasks** | "AI-generated daily tasks based on your goals, plus any custom tasks you add. Edit, delete, or add your own with the buttons on the right." |
| 12 | `log-activity-btn` | tasks | **Log Daily Activities — the core loop** | "This is the most important button. Once a day, write what you actually did — the AI matches it to tasks and goals, calculates XP and shards, and queues them in Unclaimed Rewards. Skip this and nothing levels up." |
| 13 | `shop-tab` + `inventory-tab` (combined, anchors shop tab; mentions inventory) | shop | **Shop & Inventory** | "Add real-world rewards (a movie night, new headphones, a coffee) to your wishlist with a shard price. Buy them when you've earned enough — purchased items live in Inventory and consumables can be 'used' there." |

The final step's primary button label is **Start playing** instead of **Next**, and dismisses the tour.

## Data Model

Tour-completion state lives client-side in `localStorage`, keyed by user id so it doesn't leak across accounts on shared devices:

```
localStorage key: `gamifai_tour_completed_<userId>`
value: 'true' (string) when completed/skipped, key absent otherwise
```

No server-side schema change, no Cosmos sub-doc change, no migration. Tradeoff: the tour will re-fire if a user signs in on a fresh device or after clearing browser storage. We accept this — the tour content is short and useful as a refresher, and avoiding backend changes keeps the feature additive and risk-free.

## API Endpoints

None. State is purely client-side.

## UI/UX

### Component

Add `src/components/OnboardingTour.tsx` and `OnboardingTour.css`. Hand-rolled rather than `react-joyride` so we can precisely control mobile positioning, theme integration, and tab switching without fighting the library.

```
<OnboardingTour
  isOpen={shouldShowTour}
  steps={TOUR_STEPS}
  activeTab={activeTab}
  onTabChange={setActiveTab}
  onComplete={() => updateUser({ tourCompleted: true })}
  onSkip={() => updateUser({ tourCompleted: true })}
/>
```

### Anchoring

Each step targets `[data-tour="<key>"]`. The component reads `getBoundingClientRect()` of the anchor and positions a tooltip card adjacent to it, choosing placement (top / bottom / left / right) based on which side has the most viewport room. Steps with no anchor (step 1) render as a centered modal.

### Visual

- Semi-transparent dark backdrop (`rgba(0,0,0,0.55)`) over the page.
- A radial "spotlight" cutout via SVG mask around the anchor's bounding rect, padded 8px, with rounded corners matching the anchor.
- Tooltip card: rounded 12px, theme-aware background (`var(--bg-elevated)`), 1px border (`var(--border)`), max-width `clamp(280px, 90vw, 380px)`, padding 16px.
- Header row: "Step N of 13" + close (×) button.
- Title (`var(--text-primary)`, 1.05rem, weight 600).
- Body (`var(--text-secondary)`, 0.9rem, line-height 1.5).
- Footer row: **Skip tour** (text button, left) · progress dots (center) · **Back / Next** (filled button, right). Last step: **Start playing**.
- Caret triangle on the side of the card touching the anchor.

### Responsive behavior

- **≥ 768px (desktop/tablet):** card placed beside anchor with caret. Backdrop covers full viewport.
- **480–767px (mobile/small tablet):** card pinned to bottom of viewport (above safe-area inset) regardless of anchor position; the spotlight still highlights the anchor and we auto-scroll the anchor into view if it's off-screen.
- **< 480px (small mobile):** same bottom-pinned layout; card width = `calc(100vw - 24px)`. Step 1 (welcome) becomes full-screen rather than centered modal.
- Anchors that are off-screen because they're inside a non-active tab: the tour calls `onTabChange(step.tab)` first, waits one frame for layout, then measures and positions.
- On viewport resize / orientation change: re-measure anchor and reposition without restarting the step.
- On scroll: tooltip follows anchor; if anchor scrolls out of view, smoothly scrolls it back into view.

### Keyboard & accessibility

- `Esc` skips the tour.
- `←` / `→` navigate prev / next.
- `Enter` advances.
- Focus moves to the tooltip card when each step renders; focus returns to anchor on close.
- Card is `role="dialog"` with `aria-labelledby`/`aria-describedby` pointing at the title and body.
- Backdrop is `aria-hidden`; it does not trap pointer events from the anchored element (clicking the highlighted control is allowed but has no effect on tour state — Next/Back drive the flow).
- Reduced-motion users get instant transitions instead of fade animations.

### Re-launch

Add a small `Show tour` link in the Profile tab header — clicking it sets a local `forceShowTour` flag, opens the tour with step 1, and on completion **does not** re-flip `tourCompleted` (so re-launching doesn't change the persisted "seen it" state, it stays true).

## Edge Cases

| Case | Behavior |
|---|---|
| User registers, completes profile + goals, but task-generation API fails — no tasks visible on Tasks tab | Tour still shows step 11 with the empty-tasks copy; no special branching. |
| User skips tour | `localStorage` key set immediately; tour does not re-fire on next dashboard mount on this device. |
| User closes the browser mid-tour without skipping or completing | localStorage key is **not** set — tour resumes at step 1 next visit. (We do not persist intermediate step.) |
| Existing user (account predates this feature) | No localStorage key on this device → tour fires once on their next dashboard load. Acceptable: the explanation is useful even for existing users. |
| User signs in on a new device | Key is per-device; tour fires once on that device. |
| Anchor element not in DOM (e.g. activity heatmap hidden because user has no history) | Step degrades to a centered modal showing the same title/body without the spotlight. |
| User on mobile with on-screen keyboard open during tour | Card remains at the bottom-of-viewport, above `env(keyboard-inset-height, 0)`. |
| Tour mounts before user data has loaded | Tour gates on `user && user.goalsData` (same condition as dashboard rendering); does not race. |
| User clears browser storage | Tour fires again — minor annoyance, not broken. |

## Metrics

Telemetry not currently in the codebase, so this spec adds none. If we add analytics later, instrument:
- `tour.started`, `tour.step_viewed { step }`, `tour.skipped { atStep }`, `tour.completed`
- Time spent per step
- Funnel: tour-completed users vs. skip users — does first-week activity-log rate differ?

## Dependencies

- **Existing:** `ThemeContext` for theme-aware styling.
- **External:** none.
- **Code that changes:**
  - `src/components/Dashboard.tsx` — sprinkle `data-tour` attributes (via small wrapper divs where the target component does not forward props), mount `OnboardingTour`
  - new: `src/components/OnboardingTour.tsx`, `OnboardingTour.css`, `src/components/onboardingTourSteps.tsx`

## Rollout

Single PR, no flags needed. Behavior is purely additive: existing users see the tour once on next login on each device, new users see it on first dashboard render. No backend or DB changes. Risk surface is limited to the new component — if it breaks visually, users see a degraded modal but the dashboard underneath is unaffected.

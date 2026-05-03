import type { TourStep } from './OnboardingTour'

export const ONBOARDING_TOUR_STEPS: TourStep[] = [
  {
    key: '',
    title: 'Welcome to Gamif.AI',
    body: (
      <>
        Turn real-world progress into XP, shards, and stat growth — Solo Leveling
        for your actual life. Log what you did each day, an AI matches it to your
        goals, and you level up.
        <br />
        <br />
        Let's tour the controls.
      </>
    ),
  },
  {
    key: 'header-greeting',
    tab: 'profile',
    title: 'Your hub',
    body: (
      <>
        Everything happens here. Switch tabs at the top, claim rewards from the
        header, or log out anytime.
      </>
    ),
  },
  {
    key: 'unclaimed-rewards',
    tab: 'profile',
    title: 'Unclaimed Rewards',
    body: (
      <>
        When the AI matches your daily activities to your tasks and goals, the
        rewards land here. Click to view and claim XP and shards.
      </>
    ),
  },
  {
    key: 'theme-toggle',
    tab: 'profile',
    title: 'Theme toggle',
    body: <>Switch between light and dark themes. Your choice persists across sessions.</>,
  },
  {
    key: 'tab-nav',
    tab: 'profile',
    title: 'Four tabs',
    body: (
      <>
        <strong>Profile</strong> for stats, <strong>Tasks</strong> for daily
        challenges, <strong>Inventory</strong> for what you own,{' '}
        <strong>Shop</strong> for what you want.
      </>
    ),
  },
  {
    key: 'level-card',
    tab: 'profile',
    title: 'Level & XP',
    body: (
      <>
        Total XP determines your level. Earn it by logging activities that match
        your tasks and goals. Levels 1–10 cost 100 XP each, then the cost grows
        in 50-XP steps every 10 levels.
      </>
    ),
  },
  {
    key: 'shards-card',
    tab: 'profile',
    title: 'Shards',
    body: (
      <>
        💎 Shards are your currency. Earn them alongside XP, then spend them in
        the Shop on rewards you set for yourself.
      </>
    ),
  },
  {
    key: 'streak-multipliers',
    tab: 'profile',
    title: 'Streak multipliers',
    body: (
      <>
        Streak = consecutive days with any activity. Hit 10+ XP in a category
        daily to grow that category's multiplier — your shard rewards scale with
        it. Miss a day and the streak softly decays instead of resetting.
      </>
    ),
  },
  {
    key: 'ring-chart',
    tab: 'profile',
    title: 'Attribute distribution',
    body: (
      <>
        Your XP splits across <strong>Strength</strong>,{' '}
        <strong>Intelligence</strong>, and <strong>Charisma</strong> — the AI
        assigns each activity to one. The ring shows your balance; aim for a
        shape you like.
      </>
    ),
  },
  {
    key: 'activity-heatmap',
    tab: 'profile',
    title: 'Activity heatmap',
    body: (
      <>
        A year-at-a-glance view of your daily XP. Tap any cell to see exactly
        what you logged that day.
      </>
    ),
  },
  {
    key: 'tasks-tab',
    tab: 'tasks',
    title: 'Tasks',
    body: (
      <>
        AI-generated daily tasks based on your goals, plus any custom tasks you
        add. Edit, delete, or add your own with the buttons on the right.
      </>
    ),
  },
  {
    key: 'log-activity-btn',
    tab: 'tasks',
    title: 'Log Daily Activities — the core loop',
    body: (
      <>
        This is the most important button. Once a day, write what you actually
        did — the AI matches it to tasks and goals, calculates XP and shards,
        and queues them in Unclaimed Rewards.{' '}
        <strong>Skip this and nothing levels up.</strong>
      </>
    ),
  },
  {
    key: 'shop-tab',
    tab: 'shop',
    title: 'Shop & Inventory',
    body: (
      <>
        Add real-world rewards (a movie night, new headphones, a coffee) to your
        wishlist with a shard price. Buy them when you've earned enough —
        purchased items live in Inventory, and consumables can be "used" there.
      </>
    ),
  },
]

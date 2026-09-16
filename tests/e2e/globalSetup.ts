import { TEST_USER, createDefaultCatalog, createGeneratedTasks, seedUsers } from './fixtures'

export { TEST_USER } from './fixtures'

export default async function globalSetup() {
  seedUsers([
    {
      ...TEST_USER,
      profileData: {
        name: 'Tour Tester',
        dateOfBirth: '2001-01-01',
      },
      goalsData: {
        longTermGoals:
          'Build muscle through consistent strength training, learn TypeScript and React deeply for career growth, and develop public-speaking confidence.',
      },
      catalog: createDefaultCatalog(),
      generatedTasks: createGeneratedTasks({
        Strength: [
          {
            id: 'seed-str-1',
            description: 'Complete a 30-minute strength workout focused on compound lifts.',
            expected_duration_minutes: 30,
            xp: 30,
            shards: 8,
          },
        ],
        Intelligence: [
          {
            id: 'seed-int-1',
            description: 'Read a chapter on advanced TypeScript types and take notes.',
            expected_duration_minutes: 45,
            xp: 30,
            shards: 8,
          },
        ],
        Charisma: [
          {
            id: 'seed-cha-1',
            description: 'Practice a 2-minute extemporaneous speech on a topic of choice.',
            expected_duration_minutes: 20,
            xp: 30,
            shards: 8,
          },
        ],
      }),
    },
  ])
}

import { CosmosClient, Database, Container } from '@azure/cosmos'
import { logger } from '../../utils/logger'

let client: CosmosClient | null = null
let database: Database | null = null
let usersContainer: Container | null = null
let sessionsContainer: Container | null = null

const DATABASE_ID = process.env.COSMOS_DATABASE || 'gamifai-db'
const USERS_CONTAINER = 'users'
const SESSIONS_CONTAINER = 'sessions'
const SESSION_TTL = 86400 // 24 hours in seconds

export async function initializeCosmos(): Promise<void> {
  const endpoint = process.env.COSMOS_ENDPOINT
  const key = process.env.COSMOS_KEY

  if (!endpoint || !key) {
    throw new Error(
      'COSMOS_ENDPOINT and COSMOS_KEY environment variables are required for Cosmos DB storage mode'
    )
  }

  logger.custom('🌐', 'Initializing Azure Cosmos DB connection...')

  client = new CosmosClient({ endpoint, key })

  // Create database if not exists
  const { database: db } = await client.databases.createIfNotExists({ id: DATABASE_ID })
  database = db
  logger.success(`Cosmos DB database: ${DATABASE_ID}`)

  // Create users container (partition key: /userId)
  const { container: users } = await database.containers.createIfNotExists({
    id: USERS_CONTAINER,
    partitionKey: { paths: ['/userId'] },
  })
  usersContainer = users
  logger.success(`Cosmos DB container: ${USERS_CONTAINER} (partition key: /userId)`)

  // Create sessions container (partition key: /sessionId, TTL enabled)
  const { container: sessions } = await database.containers.createIfNotExists({
    id: SESSIONS_CONTAINER,
    partitionKey: { paths: ['/sessionId'] },
    defaultTtl: SESSION_TTL,
  })
  sessionsContainer = sessions
  logger.success(`Cosmos DB container: ${SESSIONS_CONTAINER} (partition key: /sessionId, TTL: ${SESSION_TTL}s)`)

  logger.success('Azure Cosmos DB initialized successfully')
}

export function getUsersContainer(): Container {
  if (!usersContainer) {
    throw new Error('Cosmos DB not initialized. Call initializeCosmos() first.')
  }
  return usersContainer
}

export function getSessionsContainer(): Container {
  if (!sessionsContainer) {
    throw new Error('Cosmos DB not initialized. Call initializeCosmos() first.')
  }
  return sessionsContainer
}

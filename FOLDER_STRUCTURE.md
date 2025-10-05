# Folder Structure - Services Organization

## Updated Structure (✅ Clear Separation)

```
src/
├── client/                    # Frontend-specific code
│   └── services/             # Client-side services (API clients, frontend utilities)
│       ├── fileUserDatabase.ts   # Frontend API client for user data
│       └── userDatabase.ts       # Abstract user database interface
│
├── server/                   # Backend-specific code
│   ├── routes/              # Express route handlers
│   ├── services/            # Server-side services (business logic, external APIs)
│   │   └── azureAIService.ts    # Backend service for Azure AI integration
│   ├── utils/               # Server utility functions
│   └── ai/                  # AI-related backend code
│
├── components/              # React components
├── contexts/               # React contexts
├── shared/                 # Shared types and utilities
└── types/                  # Type definitions
```

## Before vs After

### ❌ Before (Confusing)
```
src/
├── services/               # Mixed frontend and backend? Unclear!
└── server/
    └── services/          # More services? Which is which?
```

### ✅ After (Clear)
```
src/
├── client/
│   └── services/          # Clearly frontend services
└── server/
    └── services/          # Clearly backend services
```

## Service Responsibilities

### Frontend Services (`src/client/services/`)
- **Purpose**: Handle client-side API communication
- **Examples**: HTTP clients, local storage managers, frontend data utilities
- **Usage**: Imported by React components and contexts

### Backend Services (`src/server/services/`)
- **Purpose**: Handle server-side business logic and external integrations
- **Examples**: AI services, external API clients, business logic services
- **Usage**: Imported by Express routes and other backend modules

## Benefits of This Structure

1. **🎯 Clear Separation**: Immediately obvious what's frontend vs backend
2. **📦 Better Organization**: Related services are grouped together
3. **🔍 Easier Navigation**: Developers know exactly where to find things
4. **🚀 Scalability**: Easy to add more client or server services
5. **👥 Team Collaboration**: Clear boundaries for frontend and backend developers

## Import Examples

```typescript
// Frontend code importing client services
import { userDatabase } from '../client/services/fileUserDatabase'

// Backend code importing server services  
import { azureAIService } from '../services/azureAIService'
```

This structure follows common patterns used in full-stack applications and makes the codebase much more maintainable!
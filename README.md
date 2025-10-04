# 🎮 Gamif.AI - AI Powered Gamified Personal Development

A **React TypeScript web application** inspired by the "Solo Leveling" anime/manhwa theme. Transform your personal development journey into an RPG-like experience where you level up real-life skills and achieve goals through gamification.

## 🌟 Features

### 🔐 **Authentication & Profile System**
- Secure user registration and login system
- Personalized player profile creation
- Session-based authentication with persistent data

### 🎯 **RPG Character System**
- **Dynamic Level Calculation** - Experience-based leveling with scaling formula
- **Attribute System** - Strength, Intelligence, and Charisma attributes
- **Experience Distribution** - Visual breakdown of skill development
- **Progress Tracking** - Real-time level progression with experience bars

### 📊 **Advanced Dashboard**
- **Tabbed Interface** - Profile, Tasks & Challenges, Inventory, and Shop sections
- **Ring Chart Visualization** - Interactive SVG charts showing attribute distribution
- **Level Progress Display** - Dynamic calculation using `xp_for_level(n) = 100 + Math.floor((n - 1) / 10) * 50`
- **Responsive Design** - Optimized for desktop, tablet, and mobile devices

### 🎨 **Modern UI/UX**
- Clean light theme with blue gradient accents (#3b82f6, #06b6d4)
- Interactive hover effects and smooth animations
- Professional glass-morphism design elements
- High contrast typography for excellent readability

### 💾 **Robust Data Architecture**
- **Shared Type System** - Centralized TypeScript interfaces for frontend/backend consistency
- **Experience-Only Storage** - Single source of truth for level calculations
- **File-Based Database** - Persistent JSON storage with automatic data validation

## 🛠️ Tech Stack

### Frontend
- **React 19** - Modern React with latest features
- **TypeScript** - Type-safe development
- **Vite** - Fast build tool with HMR
- **React Router** - Client-side routing
- **Context API** - State management

### Backend
- **Node.js** - Runtime environment
- **Express.js** - Web application framework
- **TypeScript** - Type-safe server development
- **File-based Storage** - JSON data persistence

### Development Tools
- **ESLint** - Code linting
- **Concurrently** - Run multiple commands simultaneously
- **TSX** - TypeScript execution

## 🚀 Getting Started

### Prerequisites
- **Node.js** (v18 or higher)
- **npm** or **yarn**

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/sharmapuneet_microsoft/gamif.AI.git
   cd gamif.AI
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start the application**
   ```bash
   npm run start
   ```

   This command runs both the backend server and frontend client concurrently:
   - **Frontend**: http://localhost:5173/
   - **Backend API**: http://localhost:3001/

### Alternative Start Methods

```bash
# Start only the frontend (development server)
npm run dev

# Start only the backend server
npm run server

# Build for production
npm run build

# Preview production build
npm run preview

# Run linter
npm run lint
```

## 🎯 Application Flow

### User Journey
```
Registration → Profile Setup → Goals Setup → Dashboard (4 Tabs)
```

1. **🔐 Authentication Screen**
   - Register new account or login
   - Secure password validation
   - Clean, professional interface

2. **👤 Profile Setup**
   - Enter Player name and age
   - Set monthly expenditure limit
   - Choose preferred currency
   - Progress: Step 1 of 2

3. **🎯 Goals Setup**
   - Define comprehensive long-term development objectives
   - Cover areas like fitness, learning, career, social skills, hobbies, finances, and well-being
   - Detailed goal descriptions for motivation
   - Progress: Step 2 of 2

4. **📊 Main Dashboard - 4 Sections**

   ### **Profile Tab**
   - Personal information display
   - **Dynamic Level Calculation** (based on total experience)
   - **Experience Progress Bar** (shows progress to next level)
   - **Shards Balance** (in-game currency)
   - **Ring Chart Visualization** - Interactive SVG chart showing experience distribution:
     - 🔴 **Strength** - Physical and action-based activities
     - 🔵 **Intelligence** - Learning and problem-solving tasks  
     - 🟣 **Charisma** - Social and communication skills
   - **Interactive Legends** with hover effects and percentage breakdowns

   ### **Tasks & Challenges Tab**
   - Active task tracking with progress bars
   - Weekly challenges with XP and Shard rewards
   - Task completion status and deadlines

   ### **Inventory Tab**
   - Achievement badges (locked/unlocked states)
   - Collectible items and power-ups
   - Progress tracking for accomplishments

   ### **Shop Tab**
   - **Rewards Section** - Real-world treats and experiences
   - **Power-ups Section** - XP boosters and gameplay enhancements
   - **Shard-based Economy** - Earn through task completion, spend on rewards

## 🎮 Leveling System

### **Experience Formula**
```javascript
xp_for_level(n) = 100 + Math.floor((n - 1) / 10) * 50
```

### **Level Progression**
- **Levels 1-10**: 100 XP per level (total: 1,000 XP)
- **Levels 11-20**: 150 XP per level (total: 2,500 XP)
- **Levels 21-30**: 200 XP per level (total: 4,500 XP)
- **Levels 31-40**: 250 XP per level (total: 7,000 XP)
- And so on... (+50 XP requirement every 10 levels)

### **Attribute System**
- **Total Experience** = Strength + Intelligence + Charisma
- **Ring Chart** displays percentage distribution across attributes
- **Dynamic Calculation** - Level determined entirely from total experience
- **Single Source of Truth** - No stored level field, calculated in real-time

## 📁 Project Structure

```
├── src/
│   ├── components/              # React components
│   │   ├── AuthScreen.tsx       # Login/Registration
│   │   ├── ProfileSetup.tsx     # Profile creation
│   │   ├── GoalsSetup.tsx       # Goal setting
│   │   ├── Dashboard.tsx        # Main tabbed dashboard
│   │   ├── LoadingScreen.tsx    # Loading states
│   │   └── *.css               # Component styling
│   ├── contexts/               # React Context providers
│   │   └── AuthContext.tsx     # Authentication state management
│   ├── services/               # API and data services
│   │   ├── userDatabase.ts     # User data operations
│   │   └── fileUserDatabase.ts # File-based storage
│   ├── shared/                 # Shared type definitions
│   │   └── types/              # TypeScript interfaces
│   │       ├── user.types.ts   # User and stats interfaces
│   │       ├── auth.types.ts   # Authentication types
│   │       ├── api.types.ts    # API response types
│   │       ├── context.types.ts # Context types
│   │       └── index.ts        # Unified exports
│   └── assets/                 # Static resources
├── data/                       # JSON data storage
│   ├── users.json             # User accounts and progress
│   └── sessions.json          # Active user sessions
├── server.ts                  # Express backend server
├── public/                    # Static assets
└── package.json              # Dependencies and scripts
```

## 🔧 Available Scripts

| Command | Description |
|---------|-------------|
| `npm run start` | Start both frontend and backend |
| `npm run dev` | Start frontend development server |
| `npm run server` | Start backend API server |
| `npm run build` | Build for production |
| `npm run preview` | Preview production build |
| `npm run lint` | Run ESLint |
| `npm run dev:full` | Run frontend and backend concurrently |

## 💾 Data Storage & Architecture

### **File-Based Database System**
- **User data**: `data/users.json` - Player profiles, stats, and progress
- **Sessions**: `data/sessions.json` - Active authentication sessions
- **Automatic validation**: Type-safe data operations

### **Shared Type System**
Centralized TypeScript interfaces ensure consistency between frontend and backend:
```typescript
interface UserStats {
  experience: number      // Single source of truth for level calculation
  shards: number         // In-game currency
  strength: number       // Physical/action attribute XP
  intelligence: number   // Learning/mental attribute XP  
  charisma: number      // Social/communication attribute XP
}
```

### **Experience-Based Leveling**
- **No stored level field** - Calculated dynamically from total experience
- **Prevents data inconsistency** - Level always matches experience
- **Future-proof** - Level formula changes apply to all users automatically

## 🎨 Theme & Design

### **Visual Identity**
- **Modern Light Theme** with professional blue gradients
- **Typography**: Orbitron (futuristic headers) + Rajdhani (clean body text)
- **Color Palette**: 
  - Primary Blue: #3b82f6
  - Secondary Cyan: #06b6d4
  - Accent Red: #ef4444 (Strength)
  - Accent Purple: #8b5cf6 (Charisma)

### **Interactive Elements**
- **Glass-morphism effects** with backdrop blur
- **Smooth hover animations** with transform and shadow effects
- **Progress indicators** with gradient fills
- **Ring chart visualizations** with SVG animations
- **Responsive grid layouts** adapting to all screen sizes

### **Accessibility Features**
- High contrast text ratios
- Keyboard navigation support
- Screen reader friendly structure
- Mobile-optimized touch targets

## 🔒 Security Features

- Password hashing and validation
- Session-based authentication
- Input validation and sanitization
- Error handling and user feedback

## 🐛 Troubleshooting

### Common Issues

1. **"Failed to save profile" error**
   - Fixed in latest version
   - Ensure both frontend and backend are running

2. **Dependencies not installed**
   ```bash
   rm -rf node_modules package-lock.json
   npm install
   ```

3. **Port conflicts**
   - Frontend: Change port in `vite.config.ts`
   - Backend: Change PORT in `server.ts`

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License.

## 🎯 Future Enhancements

### **Phase 1 - Core Features**
- [ ] **Task Management System** - Create, assign, and complete attribute-specific tasks
- [ ] **Achievement Engine** - Unlock badges and milestones
- [ ] **Shop Functionality** - Purchase rewards with earned shards
- [ ] **XP Multipliers** - Temporary boosts and power-ups

### **Phase 2 - Advanced Features**
- [ ] **Firebase Integration** - Cloud storage and real-time sync
- [ ] **Social Features** - Friend lists and progress sharing
- [ ] **Leaderboards** - Community rankings and competitions
- [ ] **Progress Analytics** - Detailed charts and insights

### **Phase 3 - AI Integration**
- [ ] **Smart Task Generation** - AI-powered personalized challenges
- [ ] **Progress Predictions** - ML-based goal achievement forecasting
- [ ] **Adaptive Difficulty** - Dynamic XP requirements based on user behavior
- [ ] **Intelligent Recommendations** - Personalized development suggestions

### **Phase 4 - Mobile & Extended Platforms**
- [ ] **React Native App** - Native mobile experience
- [ ] **PWA Support** - Offline functionality and push notifications
- [ ] **Desktop App** - Electron-based standalone application
- [ ] **API Integration** - Connect with fitness trackers and productivity tools

---

**Level up your life with Gamif.AI! 🚀**

*Transform your personal development journey into an engaging RPG experience where every skill learned and goal achieved contributes to your character's growth.*

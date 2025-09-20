# 🎮 Gamif.AI - AI powered Gamified Personal Development

A **React TypeScript web application** inspired by the "Solo Leveling" anime/manhwa theme. Transform your personal development journey into an RPG-like experience where you level up real-life skills and achieve goals through gamification.

## 🌟 Features

- **🔐 User Authentication** - Secure registration and login system
- **👤 Hunter Profile Setup** - Create your personalized character profile
- **🎯 RPG-Style Goal Setting** - Set goals in Strength, Intelligence, and Charisma categories
- **📊 Progress Dashboard** - Track your real-life character progression
- **🎨 Solo Leveling Theme** - Immersive UI with anime-inspired design
- **💾 File-Based Database** - Persistent data storage with JSON files
- **🔄 Real-Time Updates** - Hot module reloading for smooth development

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
Registration → Profile Setup → Goals Setup → Dashboard
```

1. **🔐 Authentication Screen**
   - Register new account or login
   - Secure password validation
   - Solo Leveling themed interface

2. **👤 Profile Setup**
   - Enter Hunter name and age
   - Set monthly expenditure limit
   - Choose preferred currency
   - Progress: Step 1 of 2

3. **🎯 Goals Setup**
   - Define Strength goals (fitness, physical activities)
   - Set Intelligence goals (learning, skills)
   - Create Charisma goals (social, communication)
   - Progress: Step 2 of 2

4. **📊 Dashboard**
   - View Hunter Profile
   - Track goal progress
   - Monitor character stats
   - Access all features

## 📁 Project Structure

```
├── src/
│   ├── components/          # React components
│   │   ├── AuthScreen.tsx   # Login/Registration
│   │   ├── ProfileSetup.tsx # Profile creation
│   │   ├── GoalsSetup.tsx   # Goal setting
│   │   └── Dashboard.tsx    # Main dashboard
│   ├── contexts/            # React Context providers
│   │   └── AuthContext.tsx  # Authentication state
│   ├── services/            # API and data services
│   │   └── fileUserDatabase.ts
│   └── firebase/            # Firebase config (future use)
├── data/                    # JSON data storage
├── server.ts               # Express backend server
└── public/                 # Static assets
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

## 💾 Data Storage

The application uses a **file-based database** system:
- **User data**: `data/users.json`
- **Sessions**: `data/sessions.json`
- **Automatic backup**: `data/backup/` directory

## 🎨 Theme & Design

Inspired by the **Solo Leveling** manhwa/anime:
- Dark theme with purple/blue gradients
- Futuristic fonts (Orbitron, Rajdhani)
- Animated backgrounds and effects
- Hunter System terminology
- RPG-style progression elements

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

- [ ] Firebase integration for cloud storage
- [ ] Real-time notifications
- [ ] Achievement system
- [ ] Social features and leaderboards
- [ ] Mobile responsive design
- [ ] Progress analytics and insights

---

**Level up your life with Gamif.AI! 🚀**

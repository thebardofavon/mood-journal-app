# Mood Journal — Your Intelligent Wellness Companion

> Transform your mental wellness journey with AI-powered insights, sentiment analysis, and personalized guidance.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Built with SvelteKit](https://img.shields.io/badge/Built%20with-SvelteKit-FF3E00.svg)](https://kit.svelte.dev/)
[![Progressive Web App](https://img.shields.io/badge/PWA-Ready-5A0FC8.svg)](https://web.dev/progressive-web-apps/)

## ✨ Features

### 🧠 AI-Powered Intelligence

- **🆕 Cognitive Distortion Detection**: Detect unhelpful thinking patterns (10 types from CBT) and get evidence-based reframing suggestions
- **Sentiment Analysis**: Automatic mood detection and scoring for every entry
- **Keyword Extraction**: Discover themes and patterns in your thoughts
- **AI Companion**: Chat with a supportive AI that understands your journey (OpenAI, Groq, Gemini, Local Ollama)
- **Pattern Recognition**: Identify emotional cycles and triggers
- **Positive Anchors**: Extract and save positive evidence to revisit on tough days

### 📊 Advanced Analytics

- **Mood Trends**: Visualize emotional patterns over time with interactive charts
- **Streak Tracking**: Build consistency with journaling streaks
- **Insights Dashboard**: Comprehensive statistics and wellness metrics
- **Search & Discovery**: Semantic search to find past entries instantly

### 🎮 Gamification

- **Achievements System**: 20+ unlockable achievements across 5 categories
- **XP & Leveling**: Earn experience points and level up your journaling practice
- **Progress Tracking**: Visual progress bars and milestone celebrations

### 🧘 Wellness Features

- **Smart Recommendations**: Personalized wellness suggestions based on mood patterns
- **Breathing Exercises**: Guided techniques for stress and anxiety
- **Journaling Prompts**: 1000+ curated prompts across 5 categories
- **Pattern Insights**: Automatic detection of anxiety, stress, and sadness patterns

### 📱 Modern Experience

- **Progressive Web App**: Install on any device, works offline
- **Beautiful UI**: Modern design with shadcn/ui components
- **Dark Mode**: Easy on the eyes, day or night
- **Mobile Optimized**: Touch-friendly, responsive design
- **Export Options**: PDF, JSON, and Markdown export

### 🔒 Privacy & Security

- **End-to-End Encryption** (roadmap)
- **Local-First**: Your data, your device
- **No Tracking**: No analytics, no cookies, no data mining
- **Secure Auth**: Production-grade authentication with session management
- **Rate Limiting**: Protection against abuse

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ and npm
- SQLite (included with better-sqlite3)

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/mood-journal-app.git
cd mood-journal-app

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your configuration

# Run database migrations
npm run db:push

# Start development server
npm run dev
```

Visit `http://localhost:5173` and start journaling!

## 📱 PWA Installation

The app can be installed on any device:

1. **Mobile**: Tap "Share" → "Add to Home Screen"
2. **Desktop**: Click the install icon in the address bar
3. **Offline**: Works without internet connection

## 🛠️ Tech Stack

- **Frontend**: [SvelteKit](https://kit.svelte.dev/) + [Svelte 5](https://svelte.dev/) (with runes)
- **UI Components**: [shadcn-svelte](https://www.shadcn-svelte.com/) + [Tailwind CSS](https://tailwindcss.com/)
- **Database**: [Drizzle ORM](https://orm.drizzle.team/) + SQLite
- **Authentication**: Custom session-based auth with Argon2
- **AI Integration**: OpenAI, Groq, Google Gemini, Ollama
- **Charts**: [Chart.js](https://www.chartjs.org/)
- **Markdown**: [Marked](https://marked.js.org/) + DOMPurify

## 📚 Documentation

- **[ENHANCEMENT_ROADMAP.md](./ENHANCEMENT_ROADMAP.md)** - Complete product vision and 11-phase roadmap
- **[IMPLEMENTATION_GUIDE.md](./IMPLEMENTATION_GUIDE.md)** - Step-by-step technical implementation guide
- **[ENHANCEMENT_SUMMARY.md](./ENHANCEMENT_SUMMARY.md)** - Summary of latest improvements
- **[APP_BLUEPRINT.md](./APP_BLUEPRINT.md)** - Architecture and design decisions
- **[IMPROVEMENTS_SUMMARY.md](./IMPROVEMENTS_SUMMARY.md)** - Production security improvements

## 🎯 Roadmap Highlights

### ✅ Completed

- Authentication system with OAuth support
- NLP analysis (sentiment, keywords, entities)
- AI companion with multi-provider support
- Advanced analytics and visualization
- Search and export functionality
- PWA foundation (manifest, service worker, offline support)
- Achievements system (20+ achievements)
- Wellness recommendations engine

### 🔄 In Progress

- Achievement database integration and UI
- Wellness recommendations UI
- Voice journaling (Web Speech API)
- Install prompt component

### 🚀 Coming Soon

- Native mobile apps (iOS & Android)
- Enhanced data visualizations (heatmaps, word clouds)
- Smart reminders and notifications
- End-to-end encryption
- Social features (optional, privacy-first)

See [ENHANCEMENT_ROADMAP.md](./ENHANCEMENT_ROADMAP.md) for the complete vision.

## 🧪 Testing

```bash
# Run unit tests
npm test

# Run e2e tests
npm run test:e2e

# Type checking
npm run check

# Linting
npm run lint
```

## 📦 Building for Production

```bash
# Build the application
npm run build

# Preview production build
npm run preview
```

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request. For major changes, please open an issue first to discuss what you would like to change.

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🌟 Acknowledgments

- Built with [SvelteKit](https://kit.svelte.dev/)
- UI components from [shadcn-svelte](https://www.shadcn-svelte.com/)
- Icons from [Emoji](https://emojipedia.org/)
- Inspired by the mental wellness community

## 💬 Support

- 📧 Email: support@moodjournal.app
- 🐛 Issues: [GitHub Issues](https://github.com/yourusername/mood-journal-app/issues)
- 💡 Feature Requests: [GitHub Discussions](https://github.com/yourusername/mood-journal-app/discussions)

## 🎉 Star History

If you find this project helpful, please consider giving it a star! ⭐

---

**Made with ❤️ for mindful journaling**

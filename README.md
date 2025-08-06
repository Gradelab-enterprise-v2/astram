# GradeLab - AI-Powered Educational Assessment Platform

GradeLab is a comprehensive educational assessment platform that leverages AI to automate grading, provide personalized feedback, and streamline the evaluation process for educators.

## 🚀 Features

- **Auto-Grade System**: AI-powered evaluation of student answer sheets
- **Personalized Feedback**: Detailed, student-specific performance insights
- **Question Generation**: AI-assisted question paper creation
- **Google Classroom Integration**: Seamless sync with Google Classroom
- **Test Management**: Comprehensive test creation and management
- **Student Analytics**: Detailed performance tracking and reporting
- **Multi-format Support**: PDF processing and text extraction
- **Real-time Collaboration**: Live grading and feedback

## 📋 Prerequisites

- **Node.js** (v18 or higher)
- **npm** or **yarn** package manager
- **Git** for version control

## 🏃‍♂️ Quick Start

### 1. Clone the Repository

```bash
git clone https://github.com/your-username/gl304.git
cd gl304
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Start Development Server

```bash
npm run dev
```

The application will be available at `http://localhost:5173`

## 📚 Project Structure

```
gl304/
├── src/
│   ├── components/          # React components
│   ├── hooks/              # Custom hooks
│   ├── pages/              # Page components
│   ├── services/           # API services
│   ├── types/              # TypeScript types
│   └── utils/              # Utility functions
├── supabase/
│   ├── functions/          # Edge functions
│   ├── migrations/         # Database migrations
│   └── config.toml         # Supabase config
├── docs/                   # Documentation
└── scripts/                # Build scripts
```

## 🧪 Available Scripts

```bash
# Development
npm run dev                 # Start development server
npm run build              # Build for production
npm run preview            # Preview production build
npm run lint               # Run linter

# Database (requires Supabase setup)
npm run supabase:start     # Start local Supabase
npm run supabase:stop      # Stop local Supabase
npm run db:reset           # Reset database
npm run db:push            # Push database changes
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 🆘 Support

For support and questions, please create an issue on GitHub.
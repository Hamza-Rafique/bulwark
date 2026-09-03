# 🛡️ Bulwark

### AI-Powered Code Review That Actually Works

[![GitHub stars](https://img.shields.io/github/stars/Hamza-Rafique/bulwark)](https://github.com/yourusername/bulwark/stargazers)
[![GitHub issues](https://img.shields.io/github/issues/Hamza-Rafique/bulwark)](https://github.com/yourusername/bulwark/issues)
[![License](https://img.shields.io/github/license/Hamza-Rafique/bulwark)](https://github.com/yourusername/bulwark/blob/main/LICENSE)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](http://makeapullrequest.com)

> **Stop bugs before they reach production. Bulwark automatically analyzes PRs, detects risks, and generates tests using AI.**

![Bulwark Demo](/🛡️-Bulwark-AI-Code-Review-That-Actually-Works.png)

---

## ✨ Features

| Feature | Description |
|---------|-------------|
| 🔍 **Instant PR Analysis** | Automatically scans every pull request for risks |
| 🤖 **AI Test Generation** | Generates unit tests for new code using AI |
| ⚠️ **Risk Detection** | Flags security vulnerabilities and code quality issues |
| 🔒 **Security Scanning** | Detects SQL injection, XSS, hardcoded credentials, and more |
| 📊 **Developer Insights** | Learn from team feedback patterns |
| 💬 **Slack Integration** | Real-time notifications for every PR |
| 📈 **Analytics Dashboard** | Track bot performance and team adoption |
| 🏢 **Enterprise Ready** | Multi-tenant support with audit logging |

---

## 🚀 Quick Start

### Prerequisites

- Node.js (v18 or higher)
- A GitHub account
- An OpenAI API key (or OpenRouter for free)

### Installation

```bash
# Clone the repository
git clone https://github.com/Hamza-Rafique/bulwark.git
cd bulwark

# Install dependencies
npm install

# Copy environment variables
cp .env.example .env

# Start the server
npm start
```
---

### Configuration

- Create a .env file with your credentials:
  
```bash
# GitHub App Configuration
APP_ID=your_app_id
WEBHOOK_SECRET=your_webhook_secret
PRIVATE_KEY_PATH=./private-key.pem

# AI Configuration (OpenAI or OpenRouter)
OPENAI_API_KEY=your_api_key
OPENAI_MODEL=gpt-4o-mini
OPENAI_BASE_URL=https://api.openai.com/v1

# Optional: Slack Integration
SLACK_WEBHOOK_URL=your_slack_webhook_url

# Optional: Admin Secret for API access
ADMIN_SECRET=your_admin_secret
```

# 📦 Installation

## 1. Create a GitHub App

Go to **Settings → Developer settings → GitHub Apps**

Click **"New GitHub App"**

Fill in the details:

- **Name:** Bulwark
- **Webhook URL:** `https://your-domain.com/api/webhook`
- **Permissions:**
  - Pull requests: Read & write
  - Contents: Read-only
  - Metadata: Read-only
- **Subscribe to events:** Pull request

Generate and download the private key.

Install the app on your repositories.

## 2. Deploy the Bot

### Option A: Railway (Recommended)

[![Deploy on Railway](https://railway.app/button.svg)](https://railway.app)

### Option B: Heroku

```bash
heroku create bulwark-bot
heroku config:set APP_ID=your_app_id
heroku config:set WEBHOOK_SECRET=your_secret
git push heroku main
```

### Option C: DigitalOcean App Platform

Push to GitHub and deploy using DigitalOcean's App Platform.

---

## 🎯 How It Works

### The 3-Phase Analysis

**Detection Phase (0-5s)**
- Bot detects a new PR
- Posts "Analysis in Progress" comment
- Extracts changed code files

**Analysis Phase (5-15s)**
- Scans for 17+ risk patterns
- Extracts functions
- Generates tests using AI
- Validates generated tests

**Output Phase (15s)**
- Posts comprehensive analysis
- Shows generated tests
- Lists detected risks
- Provides next steps

### What It Detects

| Category | Patterns |
|----------|----------|
| 🔴 Critical | SQL Injection, XSS, Hardcoded Credentials, Path Traversal |
| 🟠 High | Null Pointer, Unhandled Async, Weak Encryption, Missing Validation |
| 🟡 Medium | Deprecated APIs, Memory Leaks, Rate Limiting Missing |
| 🟢 Low | Console Statements, Too Many Parameters, Complex Conditions |

---

## 🛠️ Development

### Running Locally

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Run tests
npm test

# Lint code
npm run lint

# Format code
npm run format
```

### Project Structure

```
bulwark/
├── src/
│   ├── dashboard.js          # Dashboard routes
│   ├── feedback-logger.js    # Feedback database
│   ├── test-generator.js     # AI test generation
│   ├── pattern-scanner.js    # Risk pattern detection
│   ├── function-extractor.js # Code analysis
│   ├── test-validator.js     # Test validation
│   ├── slack-notifier.js     # Slack integration
│   ├── beta-signup.js        # Beta user management
│   ├── team-management.js    # Enterprise features
│   ├── audit-logger.js       # Audit logging
│   ├── rule-engine.js        # Custom rules
│   ├── analytics.js          # Analytics tracking
│   └── logger.js             # Logging
├── public/
│   └── index.html            # Landing page
├── data/
│   ├── db.json               # Feedback database
│   ├── teams.json            # Team data
│   ├── audit.json            # Audit logs
│   └── analytics.json        # Analytics data
├── app.js                    # Main application
├── risk-patterns.json        # Risk detection patterns
├── package.json
└── .env
```

---

## 📊 API Endpoints

### Public Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/health` | GET | Health check |
| `/test` | GET | Test endpoint |
| `/api/stats` | GET | Feedback statistics |
| `/api/beta/signup` | POST | Beta signup |
| `/api/feedback` | POST | Submit feedback |
| `/` | GET | Landing page |
| `/dashboard` | GET | Dashboard |
| `/dashboard/analytics` | GET | Analytics dashboard |

### Enterprise Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/enterprise/organizations` | POST | Create organization |
| `/api/enterprise/organizations` | GET | Get organizations |
| `/api/enterprise/organizations/:orgId/members` | POST | Add member |
| `/api/enterprise/rules` | POST | Create custom rule |
| `/api/enterprise/rules` | GET | Get rules |
| `/api/enterprise/audit` | GET | Get audit logs |
| `/api/enterprise/audit/summary` | GET | Audit summary |
| `/api/analytics/summary` | GET | Analytics summary |

---

## 🔧 Configuration

### Risk Patterns

Customize risk detection in `risk-patterns.json`:

```json
{
  "id": "my-custom-rule",
  "name": "Custom Rule",
  "severity": "high",
  "description": "Detects specific pattern",
  "fix": "How to fix it",
  "regex": "regex-pattern-here"
}
```

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `APP_ID` | ✅ | GitHub App ID |
| `WEBHOOK_SECRET` | ✅ | GitHub Webhook Secret |
| `PRIVATE_KEY_PATH` | ✅ | Path to private key |
| `OPENAI_API_KEY` | ✅ | OpenAI API key |
| `OPENAI_MODEL` | ❌ | AI model (default: gpt-4o-mini) |
| `SLACK_WEBHOOK_URL` | ❌ | Slack webhook URL |
| `ADMIN_SECRET` | ❌ | Admin API secret |
| `PORT` | ❌ | Server port (default: 3000) |

---

## 🤝 Contributing

We welcome contributions! Here's how you can help:

### How to Contribute

1. Fork the repository
2. Create a feature branch:
   ```bash
   git checkout -b feature/amazing-feature
   ```
3. Make your changes
4. Run tests:
   ```bash
   npm test
   ```
5. Commit your changes:
   ```bash
   git commit -m "Add amazing feature"
   ```
6. Push to the branch:
   ```bash
   git push origin feature/amazing-feature
   ```
7. Open a Pull Request

### Areas We Need Help

- 🧪 More test frameworks support (Python, Java, Go)
- 🔒 Additional security patterns
- 🌍 Internationalization
- 📚 Documentation improvements
- 🎨 UI/UX enhancements

---

## 📄 License

This project is licensed under the Apache 2.0 License - see the LICENSE file for details.

---

## 🙏 Acknowledgments

- Built with ❤️ by the Bulwark team
- Powered by OpenAI and GitHub APIs
- Inspired by the need for better code review automation

---

## 📧 Contact

- **Issues:** GitHub Issues
- **Email:** your-email@example.com
- **Twitter:** @yourhandle
- **Website:** bulwark.dev

---

## ⭐ Star History

![Star History Chart](https://api.star-history.com/svg?repos=Hamza-Rafique/bulwark&type=Date)


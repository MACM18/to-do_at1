# 📋 Daily Task & Team Monitoring PWA

A modern, mobile-first Progressive Web App (PWA) built for iPhone, Mac, and small VPS hosting. Manage personal work focus, track team deliverables, record daily logs & blockers, and automatically send rich HTML Gmail reports every morning and evening.

---

## ✨ Features

- **📱 Mobile-First PWA (iOS & Mac Ready)**:
  - Add to Home Screen on iPhone & Safari for a standalone app experience.
  - Safe-area insets, smooth gestures, and high-contrast responsive dark/light theme.
  - 3-Tab intuitive bottom navigation: **My Tasks**, **Team View**, and **Settings**.

- **🎯 Personal Daily Focus & Smart Progress Calculation**:
  - **Single-click 0% $\leftrightarrow$ 100% toggle** for tasks without subtasks (with celebratory confetti).
  - **Weighted Subtask Progress**: $(\text{Done Subtasks} / \text{Total Subtasks}) \times 100\%$, with automatic status transitions (`TODO` $\rightarrow$ `IN_PROGRESS` $\rightarrow$ `DONE`).
  - **Pending Carry-over Backlog**: Tasks from past dates remain flagged as backlog until resolved.
  - **Recurring Schedules**: Set tasks to renew `DAILY` or `WEEKLY`.

- **👥 Team Monitoring & Work Logs**:
  - View each team member's active tasks, progress bars, and completion score.
  - Record daily notes and blockers for the team summary.
  - Assign new tasks to team members directly.

- **📧 Automated & On-Demand Gmail Reporting**:
  - **☀️ Morning Plan & Backlog Report**: Dispatches current day's focus + carry-over backlog from past dates.
  - **🌙 Evening Team Summary Report**: Aggregates all team members' progress, completed items, notes, and blockers into an executive HTML summary.
  - **Configurable Schedule**: Set morning/evening dispatch times (e.g. `08:00` / `18:00`) with built-in cron.
  - **One-Tap Manual Triggers**: "Send Morning Plan 🚀" and "Send Daily Log 🚀" directly from the UI.

- **⚙️ Full Settings & Employee Management**:
  - Add, edit, or deactivate team members and assign roles (`LEAD`, `MEMBER`).
  - Configure SMTP host, port, Gmail address, App Password, and comma-separated recipients.
  - Test SMTP connection and send test emails with instant diagnostics.

---

## 🚀 Quick Start (Local Development)

### 1. Install dependencies & initialize DB
```bash
npm install
npx prisma db push
npm run seed
```

### 2. Run development server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🔑 Configuring Gmail SMTP & App Password

To send daily reports via Gmail:
1. Enable **2-Step Verification** on your [Google Account Security](https://myaccount.google.com/security).
2. Go to [Google App Passwords](https://myaccount.google.com/apppasswords).
3. Create a new App Name (e.g., `Daily Task PWA`) and generate a **16-character App Password**.
4. In the app, navigate to the **Settings** tab:
   - **SMTP Host**: `smtp.gmail.com`
   - **SMTP Port**: `465` (SSL enabled)
   - **Sender Email**: Your Gmail address
   - **App Password**: The 16-character generated password
   - **Email Recipients**: Comma-separated list (e.g., `boss@company.com, me@gmail.com`)
5. Click **Test Connection 🔌** and **Save All Settings**.

---

## 📱 Installing on iPhone & Mac (PWA)

### On iPhone (Safari):
1. Open the app URL in Safari.
2. Tap the **Share button** (square with an arrow pointing up).
3. Scroll down and tap **"Add to Home Screen"**.
4. Launch the app directly from your Home Screen with a full-screen native feel.

### On Mac (Chrome / Safari):
- **Safari**: File $\rightarrow$ *Add to Dock...*
- **Chrome**: Click the install icon in the address bar or *Settings* $\rightarrow$ *Save and Share* $\rightarrow$ *Install page as app...*

---

## 🌐 Deploying to a Small VPS

### Option A: Docker Compose (Recommended)
1. Copy the repository to your VPS.
2. Run:
```bash
docker compose up -d --build
```
The app will start on port `3000` with persistent SQLite storage in `./prisma/data`.

### Option B: PM2 / Node.js
```bash
npm install
npx prisma db push
npm run build
pm2 start npm --name "daily-task-tracker" -- start
```

### Option C: External VPS Cron Webhook
If you prefer triggering reports from your VPS system crontab (`crontab -e`):
```bash
# Morning report at 8:00 AM
0 8 * * * curl -s http://localhost:3000/api/cron?type=morning

# Evening summary report at 6:00 PM
0 18 * * * curl -s http://localhost:3000/api/cron?type=evening
```

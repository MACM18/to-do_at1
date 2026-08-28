# 📋 Daily Task & Team Monitoring PWA

A mobile-first Progressive Web App (PWA) with a 2-column desktop experience, designed for iPhone, Mac, and small VPS hosting. Manage personal work focus, track team deliverables, record daily logs & blockers, and automatically send tabular Gmail reports every morning and evening.

---

## ✨ Features

- **📱 Mobile-First & 🖥️ 2-Column Desktop Experience**:
  - **My Tasks**: 2-column view with quick-tag task creator, active tasks, carry-over backlog, compacted completed tasks, and fast email triggers sidebar.
  - **Team View**: 2-column monitor with member cards, direct task assigner, and live completion rate metrics.
  - **Settings Hub**: 2-column configuration with Gmail SMTP, shift timings, recipient lists, employee management, and live test diagnostics.
  - Full PWA with iOS "Add to Home Screen" standalone app support.

- **🎯 Personal Daily Focus & Smart Progress Calculation**:
  - **0% $\leftrightarrow$ 100% toggle** for single-click task completion.
  - **Weighted Subtask Computation**: Dynamically calculates progress percentage as $(\text{Done Subtasks} / \text{Total Subtasks}) \times 100\%$.
  - **Carry-over Backlogs**: Unresolved tasks from previous days stay pinned as backlogs.
  - **Recurring Schedules**: Auto-resets daily or weekly routines.

- **📧 Automated & Manual Gmail Tabular Reports**:
  - **☀️ Morning "Day Plan"**: Tabular report with Shift start (`8.30`), Plan preparation, tasks, priority, and assigned by (start/end times blank).
  - **🌙 Evening "Task Log"**: Tabular report with start/end times (`8.45` - `9.00`, `9.00` - `5.30`), Shift off (`5.30`), and live overall productivity percentage (`93.61%`).
  - **Cron Automation**: Runs automatically at your configured morning and evening hours.

---

## 🐳 Production Deployment (PostgreSQL + Docker + GHCR CI/CD)

### Continuous Deployment Workflow:
1. When code is pushed to the `main` branch, GitHub Actions (`.github/workflows/deploy.yml`) builds the container image and pushes it to **GitHub Container Registry (GHCR)**: `ghcr.io/<your-username>/to-do_at1:latest`.
2. On your VPS, `docker compose up -d` boots both the web application and **PostgreSQL 16**.
3. **Database Persistence**: PostgreSQL data is stored in the Docker volume `postgres_data` so all your tasks, logs, and settings persist permanently across container updates and restarts.
4. **Auto-Migration on Boot**: The container runs `docker-entrypoint.sh` to automatically sync the Prisma schema with PostgreSQL and seed initial configuration on first boot.

### Deploying on your VPS:
```bash
# 1. Copy docker-compose.yml to your VPS directory (e.g. /opt/daily-tracker)
mkdir -p /opt/daily-tracker
cd /opt/daily-tracker

# 2. Run with Docker Compose
docker compose up -d
```

---

## 🔑 Gmail SMTP & App Password Setup

1. Enable **2-Step Verification** on your [Google Account Security](https://myaccount.google.com/security).
2. Go to [Google App Passwords](https://myaccount.google.com/apppasswords).
3. Create a new App Name (e.g., `Daily Task PWA`) and generate a **16-character App Password**.
4. In the app's **Settings** tab:
   - **SMTP Host**: `smtp.gmail.com`
   - **SMTP Port**: `465` (SSL enabled)
   - **Sender Email**: Your Gmail address
   - **App Password**: The 16-character generated password
   - **Email Recipients**: Comma-separated list (e.g. `manager@company.com, me@gmail.com`)
5. Click **Test SMTP Connection** and **Save Settings**.

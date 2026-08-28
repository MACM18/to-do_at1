# 📋 Daily Task & Team Monitoring PWA

A mobile-first Progressive Web App (PWA) with a 2-column desktop experience, designed for iPhone, Mac, and Dokploy VPS hosting. Manage personal work focus, track team deliverables, record daily logs & blockers, customize daily check-in/check-out shift hours, and automatically send tabular Gmail reports every morning and evening.

---

## ✨ Features

- **📱 Mobile-First & 🖥️ 2-Column Desktop Experience**:
  - **My Tasks**: 2-column view with quick-tag task creator, active tasks, carry-over backlog, compacted completed tasks, daily check-in/check-out hours customizer, and fast email triggers.
  - **Team View**: 2-column monitor with member cards, direct task assigner, and monthly report generator with CSV and Print/PDF export.
  - **Settings Hub**: 2-column configuration with Gmail SMTP, shift timings, recipient lists, employee management, and live test diagnostics.
  - Full PWA with iOS "Add to Home Screen" standalone app support.

- **🎯 Personal Daily Focus & Smart Progress Calculation**:
  - **0% $\leftrightarrow$ 100% toggle** for single-click task completion.
  - **Weighted Subtask Computation**: Dynamically calculates progress percentage as $(\text{Done Subtasks} / \text{Total Subtasks}) \times 100\%$.
  - **Carry-over Backlogs**: Unresolved tasks from previous days stay pinned as backlogs.
  - **Recurring Schedules**: Auto-resets daily or weekly routines.

- **📧 Tabular Gmail Reports**:
  - **☀️ Morning "Day Plan"**: Tabular report with Shift start / Check-in time, Plan preparation, tasks, priority, and assigned by (start/end times blank).
  - **🌙 Evening "Task Log"**: Tabular report with start/end times, Shift off / Check-out time, and live overall productivity percentage.

---

## 🚀 CI/CD Deployment with GHCR & Dokploy VPS Webhook

### GitHub Actions Flow (`.github/workflows/deploy.yml`):
1. On push to `main`, GitHub Actions builds the Docker image and publishes it to **GitHub Container Registry (GHCR)**: `ghcr.io/<owner>/to-do_at1:latest`.
2. Runs a dedicated **Python script** (`scripts/trigger_deploy.py`) with authentic browser headers (`User-Agent`, `sec-ch-ua`, `Accept-Language`) to trigger your **Dokploy application webhook**.
3. **Cloudflare WAF Safe**: The Python script bypasses Cloudflare bot protection so the webhook trigger is never blocked.

### Setting up GitHub Secrets:
In your GitHub Repository $\rightarrow$ **Settings** $\rightarrow$ **Secrets and variables** $\rightarrow$ **Actions**, add:
- `DOKPLOY_WEBHOOK_URL`: Your Dokploy application redeploy webhook URL.
- `DOKPLOY_WEBHOOK_SECRET`: *(Optional)* If your Dokploy webhook requires a secret token.

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

'use client';

import React, { useState, useTransition } from 'react';
import {
  Settings,
  Mail,
  Users,
  Clock,
  Send,
  CheckCircle2,
  AlertCircle,
  Shield,
  Eye,
  EyeOff,
  UserPlus,
  Edit2,
  Trash2,
  Loader2,
  HelpCircle,
  Sparkles,
  Calendar,
} from 'lucide-react';
import UserModal from './UserModal';
import {
  updateConfig,
  testSmtpConnectionAction,
  sendTestEmailAction,
  triggerMorningReportAction,
  triggerEveningSummaryAction,
} from '@/lib/actions/config-actions';
import { deleteUser } from '@/lib/actions/user-actions';

interface SettingsTabProps {
  config: any;
  users: any[];
  currentUser: any;
}

export default function SettingsTab({
  config: initialConfig,
  users,
  currentUser,
}: SettingsTabProps) {
  const [config, setConfig] = useState(initialConfig);
  const [smtpHost, setSmtpHost] = useState(initialConfig?.smtpHost || 'smtp.gmail.com');
  const [smtpPort, setSmtpPort] = useState(initialConfig?.smtpPort || 465);
  const [smtpSecure, setSmtpSecure] = useState(initialConfig?.smtpSecure !== false);
  const [smtpUser, setSmtpUser] = useState(initialConfig?.smtpUser || '');
  const [smtpPassword, setSmtpPassword] = useState(initialConfig?.smtpPassword || '');
  const [senderName, setSenderName] = useState(
    initialConfig?.senderName || 'Daily Focus & Team Tracker'
  );
  const [emailRecipients, setEmailRecipients] = useState(
    initialConfig?.emailRecipients || ''
  );
  const [morningReportTime, setMorningReportTime] = useState(
    initialConfig?.morningReportTime || '08:00'
  );
  const [eveningReportTime, setEveningReportTime] = useState(
    initialConfig?.eveningReportTime || '18:00'
  );
  const [shiftStartTime, setShiftStartTime] = useState(
    initialConfig?.shiftStartTime || '8.30'
  );
  const [prepEndTime, setPrepEndTime] = useState(
    initialConfig?.prepEndTime || '8.45'
  );
  const [shiftEndTime, setShiftEndTime] = useState(
    initialConfig?.shiftEndTime || '5.30'
  );
  const [autoSendMorningReport, setAutoSendMorningReport] = useState(
    Boolean(initialConfig?.autoSendMorningReport)
  );
  const [autoSendDailyLog, setAutoSendDailyLog] = useState(
    Boolean(initialConfig?.autoSendDailyLog)
  );

  const [showPassword, setShowPassword] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [testEmailAddress, setTestEmailAddress] = useState('');
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<any>(null);
  const [statusMessage, setStatusMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  const [isPending, startTransition] = useTransition();

  // Save Config
  const handleSaveConfig = (e: React.FormEvent) => {
    e.preventDefault();
    setStatusMessage(null);

    startTransition(async () => {
      try {
        const updated = await updateConfig({
          smtpHost,
          smtpPort: Number(smtpPort),
          smtpSecure,
          smtpUser,
          smtpPassword,
          senderName,
          emailRecipients,
          morningReportTime,
          eveningReportTime,
          shiftStartTime,
          prepEndTime,
          shiftEndTime,
          autoSendMorningReport,
          autoSendDailyLog,
        });
        setConfig(updated);
        setStatusMessage({
          type: 'success',
          text: 'Settings, shift timing & schedules updated successfully!',
        });
      } catch (err: any) {
        setStatusMessage({
          type: 'error',
          text: err.message || 'Failed to save settings',
        });
      }
    });
  };

  // Test SMTP Connection
  const handleTestConnection = () => {
    setStatusMessage(null);
    startTransition(async () => {
      const res = await testSmtpConnectionAction({
        smtpHost,
        smtpPort: Number(smtpPort),
        smtpSecure,
        smtpUser,
        smtpPassword,
      });
      if (res.success) {
        setStatusMessage({ type: 'success', text: res.message });
      } else {
        setStatusMessage({ type: 'error', text: res.message });
      }
    });
  };

  // Send Test Email
  const handleSendTestEmail = () => {
    if (!testEmailAddress.trim() && !emailRecipients.trim()) {
      setStatusMessage({
        type: 'error',
        text: 'Please enter a test recipient email address.',
      });
      return;
    }

    setStatusMessage(null);
    startTransition(async () => {
      const target = testEmailAddress.trim() || emailRecipients.split(',')[0].trim();
      const res = await sendTestEmailAction(target);
      if (res.success) {
        setStatusMessage({ type: 'success', text: res.message });
      } else {
        setStatusMessage({ type: 'error', text: res.message });
      }
    });
  };

  // Manual Force Morning Report
  const handleForceMorningReport = () => {
    setStatusMessage(null);
    startTransition(async () => {
      const res = await triggerMorningReportAction(currentUser.id);
      if (res.success) {
        setStatusMessage({ type: 'success', text: res.message });
      } else {
        setStatusMessage({ type: 'error', text: res.message });
      }
    });
  };

  // Manual Force Evening Summary
  const handleForceEveningSummary = () => {
    setStatusMessage(null);
    startTransition(async () => {
      const res = await triggerEveningSummaryAction(undefined, currentUser.id);
      if (res.success) {
        setStatusMessage({ type: 'success', text: res.message });
      } else {
        setStatusMessage({ type: 'error', text: res.message });
      }
    });
  };

  // Delete User
  const handleDeleteUser = (userId: string) => {
    if (window.confirm('Are you sure you want to remove this team member?')) {
      startTransition(async () => {
        try {
          await deleteUser(userId);
          setStatusMessage({ type: 'success', text: 'Team member removed.' });
        } catch (err: any) {
          setStatusMessage({ type: 'error', text: err.message });
        }
      });
    }
  };

  return (
    <div className="space-y-8 pb-28">
      {/* Top Banner */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-3xl p-5 sm:p-6 text-white shadow-xl border border-slate-800">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-blue-600/30 border border-blue-500/30 text-blue-400">
            <Settings className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-white">
              App Settings & Automation Hub
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">
              Configure Gmail SMTP, shift report hours, recipient emails, and team members
            </p>
          </div>
        </div>

        {/* Status Toast Alert */}
        {statusMessage && (
          <div
            className={`mt-4 p-3.5 rounded-2xl text-xs font-semibold flex items-center gap-2.5 animate-in fade-in duration-200 ${
              statusMessage.type === 'success'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                : 'bg-red-500/20 text-red-300 border border-red-500/30'
            }`}
          >
            {statusMessage.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
            )}
            <span>{statusMessage.text}</span>
          </div>
        )}
      </div>

      {/* 1. Team & Employee List Management */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 sm:p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
                Team & Employee Management
              </h2>
              <p className="text-xs text-slate-500">Add, edit, or deactivate team members</p>
            </div>
          </div>

          <button
            onClick={() => {
              setEditingUser(null);
              setIsUserModalOpen(true);
            }}
            className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all shadow-sm flex items-center gap-1.5"
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>Add Member</span>
          </button>
        </div>

        <div className="divide-y divide-slate-100 dark:divide-slate-800">
          {users.map((u) => (
            <div
              key={u.id}
              className="py-3 flex items-center justify-between gap-3 text-xs"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-bold flex items-center justify-center">
                  {u.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900 dark:text-slate-100">{u.name}</span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                        u.role === 'LEAD'
                          ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                          : 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300'
                      }`}
                    >
                      {u.role}
                    </span>
                    {!u.isActive && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300">
                        Inactive
                      </span>
                    )}
                  </div>
                  <div className="text-slate-500">{u.email}</div>
                </div>
              </div>

              <div className="flex items-center gap-1">
                <button
                  onClick={() => {
                    setEditingUser(u);
                    setIsUserModalOpen(true);
                  }}
                  className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
                  title="Edit User"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
                {users.length > 1 && (
                  <button
                    onClick={() => handleDeleteUser(u.id)}
                    disabled={isPending}
                    className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30"
                    title="Remove User"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 2. Gmail / SMTP Configuration Form */}
      <form
        onSubmit={handleSaveConfig}
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 sm:p-6 shadow-sm space-y-6"
      >
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400">
              <Mail className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
                Gmail & SMTP Email Configuration
              </h2>
              <p className="text-xs text-slate-500">Configure email dispatch and recipient list</p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setShowHelp(!showHelp)}
            className="text-xs text-blue-600 dark:text-blue-400 flex items-center gap-1 hover:underline"
          >
            <HelpCircle className="w-4 h-4" />
            <span>Gmail Setup Guide</span>
          </button>
        </div>

        {/* Gmail App Password Helper */}
        {showHelp && (
          <div className="p-4 rounded-2xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/50 text-xs text-blue-900 dark:text-blue-200 space-y-2">
            <h4 className="font-bold flex items-center gap-1.5">
              <Shield className="w-4 h-4 text-blue-600" /> How to get a Gmail App Password:
            </h4>
            <ol className="list-decimal list-inside space-y-1 text-slate-700 dark:text-slate-300">
              <li>Open your Google Account: <a href="https://myaccount.google.com/security" target="_blank" rel="noreferrer" className="text-blue-600 font-bold underline">Security Settings</a>.</li>
              <li>Ensure <strong>2-Step Verification</strong> is enabled.</li>
              <li>Go to <strong>App Passwords</strong> (<a href="https://myaccount.google.com/apppasswords" target="_blank" rel="noreferrer" className="text-blue-600 font-bold underline">myaccount.google.com/apppasswords</a>).</li>
              <li>Generate a 16-character password and paste below.</li>
            </ol>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* SMTP Host */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              SMTP Host
            </label>
            <input
              type="text"
              required
              value={smtpHost}
              onChange={(e) => setSmtpHost(e.target.value)}
              placeholder="smtp.gmail.com"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* SMTP Port */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              SMTP Port & SSL
            </label>
            <div className="flex gap-2">
              <input
                type="number"
                required
                value={smtpPort}
                onChange={(e) => setSmtpPort(Number(e.target.value))}
                placeholder="465"
                className="w-28 px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-300 cursor-pointer bg-slate-50 dark:bg-slate-800/50 px-3 rounded-xl border border-slate-200 dark:border-slate-700 flex-1">
                <input
                  type="checkbox"
                  checked={smtpSecure}
                  onChange={(e) => setSmtpSecure(e.target.checked)}
                  className="rounded text-blue-600 focus:ring-blue-500"
                />
                <span>SSL / Secure</span>
              </label>
            </div>
          </div>

          {/* Sender Email (Gmail Address) */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Gmail / Sender Email *
            </label>
            <input
              type="email"
              required
              value={smtpUser}
              onChange={(e) => setSmtpUser(e.target.value)}
              placeholder="your.email@gmail.com"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Gmail App Password */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Gmail App Password (16 characters) *
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={smtpPassword}
                onChange={(e) => setSmtpPassword(e.target.value)}
                placeholder="xxxx xxxx xxxx xxxx"
                className="w-full pl-3.5 pr-10 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Sender Display Name */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Sender Display Name
            </label>
            <input
              type="text"
              value={senderName}
              onChange={(e) => setSenderName(e.target.value)}
              placeholder="Daily Focus & Team Tracker"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Email Recipients */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Email Recipients (Comma-separated) *
            </label>
            <input
              type="text"
              required
              value={emailRecipients}
              onChange={(e) => setEmailRecipients(e.target.value)}
              placeholder="manager@company.com, me@gmail.com"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* 3. Shift Timing Configuration */}
        <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-3">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400">
              <Calendar className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
              Report Shift Timings (Shown in Table Rows)
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                Shift Start (e.g. 8.30)
              </label>
              <input
                type="text"
                value={shiftStartTime}
                onChange={(e) => setShiftStartTime(e.target.value)}
                placeholder="8.30"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 text-xs text-slate-900 dark:text-slate-100"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                Plan Prep End (e.g. 8.45)
              </label>
              <input
                type="text"
                value={prepEndTime}
                onChange={(e) => setPrepEndTime(e.target.value)}
                placeholder="8.45"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 text-xs text-slate-900 dark:text-slate-100"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                Shift End (e.g. 5.30)
              </label>
              <input
                type="text"
                value={shiftEndTime}
                onChange={(e) => setShiftEndTime(e.target.value)}
                placeholder="5.30"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 text-xs text-slate-900 dark:text-slate-100"
              />
            </div>
          </div>
        </div>

        {/* Testing Buttons */}
        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleTestConnection}
              disabled={isPending || !smtpUser || !smtpPassword}
              className="px-3.5 py-2 rounded-xl bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 text-xs font-bold transition-colors disabled:opacity-50"
            >
              Test Connection 🔌
            </button>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="email"
              value={testEmailAddress}
              onChange={(e) => setTestEmailAddress(e.target.value)}
              placeholder="Send test to email..."
              className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-slate-100 focus:outline-none flex-1 sm:w-56"
            />
            <button
              type="button"
              onClick={handleSendTestEmail}
              disabled={isPending || !smtpUser || !smtpPassword}
              className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all disabled:opacity-50 shrink-0"
            >
              Send Test ✉️
            </button>
          </div>
        </div>

        {/* 4. Automation Schedule Pickers */}
        <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-4">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400">
              <Clock className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
              Automated Dispatch Times (HH:MM)
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Morning Report Schedule */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  ☀️ Morning Day Plan (No times)
                </span>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={autoSendMorningReport}
                    onChange={(e) => setAutoSendMorningReport(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-slate-300 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-slate-600 peer-checked:bg-emerald-600"></div>
                </label>
              </div>

              <div>
                <label className="block text-[11px] text-slate-500 mb-1">
                  Dispatch Time (HH:MM)
                </label>
                <input
                  type="time"
                  value={morningReportTime}
                  onChange={(e) => setMorningReportTime(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none"
                />
              </div>
            </div>

            {/* Evening Summary Schedule */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  🌙 Evening Task Log (With times)
                </span>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={autoSendDailyLog}
                    onChange={(e) => setAutoSendDailyLog(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-slate-300 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-slate-600 peer-checked:bg-emerald-600"></div>
                </label>
              </div>

              <div>
                <label className="block text-[11px] text-slate-500 mb-1">
                  Dispatch Time (HH:MM)
                </label>
                <input
                  type="time"
                  value={eveningReportTime}
                  onChange={(e) => setEveningReportTime(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Save Changes Button */}
        <div className="pt-2 flex justify-end">
          <button
            type="submit"
            disabled={isPending}
            className="px-6 py-2.5 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all shadow-md shadow-blue-500/20 active:scale-95 flex items-center gap-2"
          >
            {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            Save All Settings & Sync Cron
          </button>
        </div>
      </form>

      {/* 5. Manual Instant Force Trigger Panel */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 sm:p-6 shadow-sm space-y-4">
        <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="p-2 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400">
            <Send className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
              One-Time Manual Force Triggers
            </h2>
            <p className="text-xs text-slate-500">Instantly generate and dispatch email reports</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <button
            type="button"
            onClick={handleForceMorningReport}
            disabled={isPending || !smtpUser || !smtpPassword}
            className="p-4 rounded-2xl bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/30 dark:hover:bg-amber-950/50 border border-amber-200 dark:border-amber-900/50 text-left transition-all active:scale-98 disabled:opacity-50"
          >
            <div className="text-xs font-bold text-amber-900 dark:text-amber-300 flex items-center gap-1.5">
              <span>☀️</span> Force Send &quot;Day Plan&quot; Email
            </div>
            <p className="text-[11px] text-amber-700/80 dark:text-amber-400/80 mt-1">
              Dispatches {currentUser.name}&apos;s Day Plan without start/end times in exact table format.
            </p>
          </button>

          <button
            type="button"
            onClick={handleForceEveningSummary}
            disabled={isPending || !smtpUser || !smtpPassword}
            className="p-4 rounded-2xl bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/30 dark:hover:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-900/50 text-left transition-all active:scale-98 disabled:opacity-50"
          >
            <div className="text-xs font-bold text-indigo-900 dark:text-indigo-300 flex items-center gap-1.5">
              <span>🌙</span> Force Send &quot;Task Log&quot; Email
            </div>
            <p className="text-[11px] text-indigo-700/80 dark:text-indigo-400/80 mt-1">
              Dispatches Task Log with full start/end times and productivity ratio in exact table format.
            </p>
          </button>
        </div>
      </div>

      {/* User Modal */}
      <UserModal
        isOpen={isUserModalOpen}
        onClose={() => setIsUserModalOpen(false)}
        editingUser={editingUser}
      />
    </div>
  );
}

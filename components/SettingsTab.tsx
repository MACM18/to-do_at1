"use client";

import React, { useState, useTransition } from "react";
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
  Zap,
  Lock,
  KeyRound,
  ShieldAlert,
} from "lucide-react";
import UserModal from "./UserModal";
import ConfirmDialog from "./ConfirmDialog";
import {
  updateConfig,
  testSmtpConnectionAction,
  sendTestEmailAction,
  triggerMorningReportAction,
  triggerEveningSummaryAction,
} from "@/lib/actions/config-actions";
import { deleteUser, updateUserPassword } from "@/lib/actions/user-actions";
import { formatTo24HrDot } from "@/lib/time-utils";

interface SettingsTabProps {
  config: any;
  users: any[];
  currentUser: any;
}

export default function SettingsTab({
  config: initialConfig,
  users: initialUsers,
  currentUser,
}: SettingsTabProps) {
  const [config, setConfig] = useState(initialConfig);
  const [users, setUsers] = useState<any[]>(initialUsers);
  const [activeAction, setActiveAction] = useState<
    | "saveConfig"
    | "testEmail"
    | "forceMorning"
    | "forceEvening"
    | "changePassword"
    | "deleteUser"
    | null
  >(null);
  const [isPending, startTransition] = useTransition();
  const [statusMessage, setStatusMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  // Form State
  const [smtpHost, setSmtpHost] = useState(
    initialConfig?.smtpHost || "smtp.gmail.com",
  );
  const [smtpPort, setSmtpPort] = useState(initialConfig?.smtpPort || 465);
  const [smtpSecure, setSmtpSecure] = useState(
    initialConfig?.smtpSecure ?? true,
  );
  const [smtpUser, setSmtpUser] = useState(initialConfig?.smtpUser || "");
  const [hasSavedPassword, setHasSavedPassword] = useState(
    Boolean(initialConfig?.smtpPassword),
  );
  const [isEditingPassword, setIsEditingPassword] = useState(
    !initialConfig?.smtpPassword,
  );
  const [smtpPassword, setSmtpPassword] = useState("");
  const [senderName, setSenderName] = useState(
    initialConfig?.senderName || "Daily Focus & Team Tracker",
  );
  const [toRecipients, setToRecipients] = useState(
    initialConfig?.toRecipients || initialConfig?.emailRecipients || "",
  );
  const [ccRecipients, setCcRecipients] = useState(
    initialConfig?.ccRecipients || "",
  );
  const [bccRecipients, setBccRecipients] = useState(
    initialConfig?.bccRecipients || "",
  );

  // Automation & Shift State (24-hour format)
  const [morningReportTime, setMorningReportTime] = useState(
    initialConfig?.morningReportTime || "08:00",
  );
  const [eveningReportTime, setEveningReportTime] = useState(
    initialConfig?.eveningReportTime || "17:30",
  );
  const [shiftStartTime, setShiftStartTime] = useState(
    formatTo24HrDot(initialConfig?.shiftStartTime || "08.30"),
  );
  const [prepEndTime, setPrepEndTime] = useState(
    formatTo24HrDot(initialConfig?.prepEndTime || "08.45"),
  );
  const [shiftEndTime, setShiftEndTime] = useState(
    formatTo24HrDot(initialConfig?.shiftEndTime || "17.30"),
  );
  const [autoSendDailyLog, setAutoSendDailyLog] = useState(
    Boolean(initialConfig?.autoSendDailyLog),
  );

  const [showPassword, setShowPassword] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [testEmailAddress, setTestEmailAddress] = useState("");
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<any>(null);
  const [userToDelete, setUserToDelete] = useState<string | null>(null);

  // Password Management State
  const [selectedPasswordUserId, setSelectedPasswordUserId] = useState<string>(
    users[0]?.id || "",
  );
  const [newTargetPassword, setNewTargetPassword] = useState("");
  const [confirmTargetPassword, setConfirmTargetPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [isPasswordConfirmOpen, setIsPasswordConfirmOpen] = useState(false);

  const isAdmin = currentUser?.role === "ADMIN" || currentUser?.role === "LEAD";

  // Save Config
  const handleSaveConfig = (e: React.FormEvent) => {
    e.preventDefault();
    setStatusMessage(null);

    startTransition(async () => {
      try {
        const payload: any = {
          smtpHost,
          smtpPort: Number(smtpPort),
          smtpSecure,
          smtpUser,
          senderName,
          emailRecipients: toRecipients,
          toRecipients,
          ccRecipients,
          bccRecipients,
          morningReportTime,
          eveningReportTime,
          shiftStartTime,
          prepEndTime,
          shiftEndTime,
          autoSendDailyLog,
        };

        if (isEditingPassword && smtpPassword.trim()) {
          payload.smtpPassword = smtpPassword.trim();
        }

        const updated = await updateConfig(payload);
        setConfig(updated);
        if (updated.smtpPassword) {
          setHasSavedPassword(true);
          setIsEditingPassword(false);
          setSmtpPassword("");
        }
        setStatusMessage({
          type: "success",
          text: "Settings, shift timings, and To/CC/BCC recipients saved successfully.",
        });
      } catch (err: any) {
        setStatusMessage({
          type: "error",
          text: err.message || "Failed to save settings",
        });
      }
    });
  };

  // Test SMTP Connection
  const handleTestConnection = () => {
    setStatusMessage(null);
    setActiveAction("saveConfig");
    startTransition(async () => {
      try {
        const res = await testSmtpConnectionAction({
          smtpHost,
          smtpPort: Number(smtpPort),
          smtpSecure,
          smtpUser,
          smtpPassword:
            isEditingPassword && smtpPassword.trim()
              ? smtpPassword.trim()
              : undefined,
        });
        if (res.success) {
          setStatusMessage({ type: "success", text: res.message });
        } else {
          setStatusMessage({ type: "error", text: res.message });
        }
      } finally {
        setActiveAction(null);
      }
    });
  };

  // Send Test Email
  const handleSendTestEmail = () => {
    if (!testEmailAddress.trim() && !toRecipients.trim()) {
      setStatusMessage({
        type: "error",
        text: "Please enter a test recipient email address.",
      });
      return;
    }

    setStatusMessage(null);
    setActiveAction("testEmail");
    startTransition(async () => {
      try {
        const target =
          testEmailAddress.trim() || toRecipients.split(",")[0].trim();
        const res = await sendTestEmailAction(target);
        if (res.success) {
          setStatusMessage({ type: "success", text: res.message });
        } else {
          setStatusMessage({ type: "error", text: res.message });
        }
      } finally {
        setActiveAction(null);
      }
    });
  };

  // Manual Force Morning Report
  const handleForceMorningReport = () => {
    setStatusMessage(null);
    setActiveAction("forceMorning");
    startTransition(async () => {
      try {
        const res = await triggerMorningReportAction(currentUser.id);
        if (res.success) {
          setStatusMessage({ type: "success", text: res.message });
        } else {
          setStatusMessage({ type: "error", text: res.message });
        }
      } finally {
        setActiveAction(null);
      }
    });
  };

  // Manual Force Evening Summary
  const handleForceEveningSummary = () => {
    setStatusMessage(null);
    setActiveAction("forceEvening");
    startTransition(async () => {
      try {
        const res = await triggerEveningSummaryAction(undefined, currentUser.id);
        if (res.success) {
          setStatusMessage({ type: "success", text: res.message });
        } else {
          setStatusMessage({ type: "error", text: res.message });
        }
      } finally {
        setActiveAction(null);
      }
    });
  };

  // Delete User with Confirm Dialog
  const handleConfirmDeleteUser = () => {
    if (!userToDelete) return;
    startTransition(async () => {
      try {
        await deleteUser(userToDelete);
        setUserToDelete(null);
        setStatusMessage({ type: "success", text: "Team member removed." });
      } catch (err: any) {
        setUserToDelete(null);
        setStatusMessage({ type: "error", text: err.message });
      }
    });
  };

  // Trigger Password Change Request
  const handleRequestPasswordChange = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPasswordUserId) {
      setStatusMessage({ type: "error", text: "Please select a team member." });
      return;
    }
    if (!newTargetPassword || newTargetPassword.length < 4) {
      setStatusMessage({
        type: "error",
        text: "Password must be at least 4 characters.",
      });
      return;
    }
    if (newTargetPassword !== confirmTargetPassword) {
      setStatusMessage({
        type: "error",
        text: "Passwords do not match. Please re-type.",
      });
      return;
    }

    setIsPasswordConfirmOpen(true);
  };

  // Execute Password Change on Confirmation
  const handleExecutePasswordChange = () => {
    startTransition(async () => {
      try {
        const res = await updateUserPassword(
          selectedPasswordUserId,
          newTargetPassword,
        );
        setIsPasswordConfirmOpen(false);
        setNewTargetPassword("");
        setConfirmTargetPassword("");
        setStatusMessage({ type: "success", text: res.message });
      } catch (err: any) {
        setIsPasswordConfirmOpen(false);
        setStatusMessage({ type: "error", text: err.message });
      }
    });
  };

  const targetPasswordUser = users.find((u) => u.id === selectedPasswordUserId);

  return (
    <div className="space-y-6 pb-28 max-w-7xl mx-auto">
      {/* Status Toast Alert */}
      {statusMessage && (
        <div
          className={`p-3.5 rounded-2xl text-xs font-semibold flex items-center justify-between gap-2.5 animate-in fade-in duration-150 ${
            statusMessage.type === "success"
              ? "bg-emerald-50 text-emerald-800 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900/50"
              : "bg-rose-50 text-rose-800 border border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-900/50"
          }`}
        >
          <div className="flex items-center gap-2">
            {statusMessage.type === "success" ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
            )}
            <span>{statusMessage.text}</span>
          </div>
          <button
            onClick={() => setStatusMessage(null)}
            className="text-xs opacity-70 hover:opacity-100"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* 2-Column Desktop Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Forms & Configurations (8 Cols on Desktop) */}
        <div className="lg:col-span-8 space-y-6">
          {/* 1. Gmail / SMTP Configuration Form */}
          <form
            onSubmit={handleSaveConfig}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 sm:p-6 shadow-sm space-y-6"
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400">
                  <Mail className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                    Gmail & SMTP Email Settings
                  </h2>
                  <p className="text-xs text-slate-500">
                    Configure email credentials, To, CC, and BCC lists
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowHelp(!showHelp)}
                className="text-xs text-blue-600 dark:text-blue-400 flex items-center gap-1 hover:underline"
              >
                <HelpCircle className="w-4 h-4" />
                <span>Gmail Guide</span>
              </button>
            </div>

            {showHelp && (
              <div className="p-4 rounded-2xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/50 text-xs text-blue-900 dark:text-blue-200 space-y-2">
                <h4 className="font-bold flex items-center gap-1.5">
                  <Shield className="w-4 h-4 text-blue-600" /> How to get a
                  Gmail App Password:
                </h4>
                <ol className="list-decimal list-inside space-y-1 text-slate-700 dark:text-slate-300">
                  <li>
                    Open Google Account:{" "}
                    <a
                      href="https://myaccount.google.com/security"
                      target="_blank"
                      rel="noreferrer"
                      className="text-blue-600 font-bold underline"
                    >
                      Security Settings
                    </a>
                    .
                  </li>
                  <li>
                    Ensure <strong>2-Step Verification</strong> is enabled.
                  </li>
                  <li>
                    Go to <strong>App Passwords</strong> (
                    <a
                      href="https://myaccount.google.com/apppasswords"
                      target="_blank"
                      rel="noreferrer"
                      className="text-blue-600 font-bold underline"
                    >
                      myaccount.google.com/apppasswords
                    </a>
                    ).
                  </li>
                  <li>Generate a 16-character password and paste below.</li>
                </ol>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 text-slate-900 dark:text-slate-100 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

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
                    className="w-24 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 text-slate-900 dark:text-slate-100 text-xs focus:outline-none"
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

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Sender Email Address *
                </label>
                <input
                  type="email"
                  required
                  value={smtpUser}
                  onChange={(e) => setSmtpUser(e.target.value)}
                  placeholder="your.email@gmail.com"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 text-slate-900 dark:text-slate-100 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                {hasSavedPassword && !isEditingPassword ? (
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center justify-between">
                      <span>Gmail App Password (16 characters)</span>
                      <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> Configured & Saved
                      </span>
                    </label>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 flex items-center justify-between px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-100/80 dark:bg-slate-800/80 text-slate-500 text-xs font-mono select-none cursor-not-allowed">
                        <div className="flex items-center gap-2">
                          <Lock className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                          <span>•••• •••• •••• ••••</span>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setIsEditingPassword(true);
                          setSmtpPassword("");
                        }}
                        className="px-3 py-2.5 rounded-xl bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold transition-all shrink-0 hover:scale-102 active:scale-95 flex items-center gap-1.5"
                        title="Change App Password"
                      >
                        <KeyRound className="w-3.5 h-3.5" />
                        <span>Change</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                        Gmail App Password (16 characters) *
                      </label>
                      {hasSavedPassword && (
                        <button
                          type="button"
                          onClick={() => {
                            setIsEditingPassword(false);
                            setSmtpPassword("");
                          }}
                          className="text-[11px] font-semibold text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 underline"
                        >
                          Keep Current Password
                        </button>
                      )}
                    </div>
                    <div className="relative">
                      <input
                        type={showPassword ? "text" : "password"}
                        required={!hasSavedPassword}
                        value={smtpPassword}
                        onChange={(e) => setSmtpPassword(e.target.value)}
                        placeholder="xxxx xxxx xxxx xxxx"
                        className="w-full pl-3.5 pr-10 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 text-slate-900 dark:text-slate-100 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                      >
                        {showPassword ? (
                          <EyeOff className="w-4 h-4" />
                        ) : (
                          <Eye className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Sender Display Name
                </label>
                <input
                  type="text"
                  value={senderName}
                  onChange={(e) => setSenderName(e.target.value)}
                  placeholder="Daily Focus & Team Tracker"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 text-slate-900 dark:text-slate-100 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Email Recipients Section: TO, CC, BCC */}
            <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-3">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400">
                  <Mail className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                    Recipient Lists (To, CC, BCC)
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Comma-separated email addresses for automated and manual
                    dispatches
                  </p>
                </div>
              </div>

              <div className="space-y-3 pt-1">
                {/* To */}
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    To Recipients *{" "}
                    <span className="text-slate-400 font-normal">
                      (Primary direct recipients)
                    </span>
                  </label>
                  <input
                    type="text"
                    required
                    value={toRecipients}
                    onChange={(e) => setToRecipients(e.target.value)}
                    placeholder="manager@company.com, client@example.com"
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 text-slate-900 dark:text-slate-100 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* CC */}
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    CC Recipients{" "}
                    <span className="text-slate-400 font-normal">
                      (Carbon copy - visible to all)
                    </span>
                  </label>
                  <input
                    type="text"
                    value={ccRecipients}
                    onChange={(e) => setCcRecipients(e.target.value)}
                    placeholder="team@company.com, supervisor@company.com"
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 text-slate-900 dark:text-slate-100 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* BCC */}
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    BCC Recipients{" "}
                    <span className="text-slate-400 font-normal">
                      (Blind carbon copy - hidden archive/backup)
                    </span>
                  </label>
                  <input
                    type="text"
                    value={bccRecipients}
                    onChange={(e) => setBccRecipients(e.target.value)}
                    placeholder="archive@company.com, personal.backup@gmail.com"
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 text-slate-900 dark:text-slate-100 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>

            {/* Automated Dispatch Schedules */}
            <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-3">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400">
                  <Clock className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                    Automated Task Log Dispatch
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Morning Day Plan is <strong>Manual Only</strong>. Automated
                    dispatch runs for evening Task Logs on working days
                    (+05:30).
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <label className="flex items-center gap-2.5 p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={autoSendDailyLog}
                    onChange={(e) => setAutoSendDailyLog(e.target.checked)}
                    className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                  />
                  <div>
                    <div className="text-xs font-bold text-slate-800 dark:text-slate-200">
                      Auto-Send Evening Task Log
                    </div>
                    <div className="text-[10px] text-slate-500">
                      Mon-Fri at configured time, Sat at 1:30 PM (Sun off)
                    </div>
                  </div>
                </label>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                    Weekday Auto-Send Time (Mon - Fri)
                  </label>
                  <input
                    type="time"
                    value={eveningReportTime}
                    onChange={(e) => setEveningReportTime(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 text-xs text-slate-900 dark:text-slate-100"
                  />
                </div>
              </div>
            </div>

            {/* Shift Timing Fields */}
            <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-3">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400">
                  <Calendar className="w-4 h-4" />
                </div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  Report Shift Timings
                </h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                    Shift Start (e.g. 08.30)
                  </label>
                  <input
                    type="text"
                    value={shiftStartTime}
                    onChange={(e) => setShiftStartTime(e.target.value)}
                    placeholder="08.30"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 text-xs text-slate-900 dark:text-slate-100"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                    Plan Prep End (e.g. 08.45)
                  </label>
                  <input
                    type="text"
                    value={prepEndTime}
                    onChange={(e) => setPrepEndTime(e.target.value)}
                    placeholder="08.45"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 text-xs text-slate-900 dark:text-slate-100"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                    Weekday Shift End (e.g. 17.30)
                  </label>
                  <input
                    type="text"
                    value={shiftEndTime}
                    onChange={(e) => setShiftEndTime(e.target.value)}
                    placeholder="17.30"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 text-xs text-slate-900 dark:text-slate-100"
                  />
                </div>
              </div>
            </div>

            {/* Save Button */}
            <div className="pt-2 flex justify-end">
              <button
                type="submit"
                disabled={isPending}
                className="px-6 py-2.5 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all shadow-md shadow-blue-500/20 active:scale-95 flex items-center gap-2"
              >
                {isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Sparkles className="w-4 h-4" />
                )}
                Save Settings & Timings
              </button>
            </div>
          </form>

          {/* 2. Team & Employee List Management */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 sm:p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                    Team & Employee Management
                  </h2>
                  <p className="text-xs text-slate-500">
                    Manage user accounts, roles and status
                  </p>
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
                        <span className="font-bold text-slate-900 dark:text-slate-100">
                          {u.name}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                            u.role === "ADMIN" || u.role === "LEAD"
                              ? "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                              : "bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300"
                          }`}
                        >
                          {u.role}
                        </span>
                        {!u.isActive && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300">
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
                        onClick={() => setUserToDelete(u.id)}
                        disabled={isPending}
                        className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/30"
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

          {/* 3. Admin Security & User Password Reset Section (with Confirmation) */}
          {isAdmin && (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 sm:p-6 shadow-sm space-y-4">
              <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100 dark:border-slate-800">
                <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400">
                  <KeyRound className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                    Team Member Password Management
                  </h2>
                  <p className="text-xs text-slate-500">
                    Administrator tool to update and reset passwords for team
                    members
                  </p>
                </div>
              </div>

              <form
                onSubmit={handleRequestPasswordChange}
                className="space-y-4 pt-1"
              >
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Select Team Member
                    </label>
                    <select
                      value={selectedPasswordUserId}
                      onChange={(e) =>
                        setSelectedPasswordUserId(e.target.value)
                      }
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 text-slate-900 dark:text-slate-100 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 font-semibold"
                    >
                      {users.map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.name} ({u.role})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      New Password *
                    </label>
                    <div className="relative">
                      <input
                        type={showNewPassword ? "text" : "password"}
                        required
                        value={newTargetPassword}
                        onChange={(e) => setNewTargetPassword(e.target.value)}
                        placeholder="Min 4 characters"
                        className="w-full pl-3 pr-8 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 text-slate-900 dark:text-slate-100 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                      >
                        {showNewPassword ? (
                          <EyeOff className="w-3.5 h-3.5" />
                        ) : (
                          <Eye className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Confirm Password *
                    </label>
                    <input
                      type={showNewPassword ? "text" : "password"}
                      required
                      value={confirmTargetPassword}
                      onChange={(e) => setConfirmTargetPassword(e.target.value)}
                      placeholder="Repeat password"
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 text-slate-900 dark:text-slate-100 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-1">
                  <button
                    type="submit"
                    disabled={
                      isPending || !newTargetPassword || !confirmTargetPassword
                    }
                    className="px-5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-white text-white dark:text-slate-900 text-xs font-bold transition-all shadow-sm active:scale-95 disabled:opacity-50 flex items-center gap-1.5"
                  >
                    <Lock className="w-3.5 h-3.5" />
                    <span>Change User Password</span>
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>

        {/* Right Column: Fast Testing & Manual Force Triggers Sidebar (4 Cols on Desktop) */}
        <div className="lg:col-span-4 space-y-4">
          {/* Quick Trigger & Test Card */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-sm space-y-4">
            <div>
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Email Diagnostics
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 mt-0.5">
                Test & Force Triggers
              </h3>
            </div>

            {/* Test Connection Button */}
            <div className="space-y-2">
              <button
                type="button"
                onClick={handleTestConnection}
                disabled={Boolean(activeAction) || !smtpUser || !smtpPassword}
                className="w-full py-2.5 px-4 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {activeAction === "saveConfig" ? (
                  <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                ) : (
                  <Zap className="w-4 h-4 text-amber-500" />
                )}
                <span>Test SMTP Connection</span>
              </button>

              <div className="space-y-1.5 pt-1">
                <input
                  type="email"
                  value={testEmailAddress}
                  onChange={(e) => setTestEmailAddress(e.target.value)}
                  placeholder="Send sample test to email..."
                  className="w-full px-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 text-slate-900 dark:text-slate-100 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={handleSendTestEmail}
                  disabled={Boolean(activeAction) || !smtpUser || !smtpPassword}
                  className="w-full py-2 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {activeAction === "testEmail" && (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  )}
                  <span>Send Test Email</span>
                </button>
              </div>
            </div>

            {/* One-Time Force Triggers */}
            <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-2.5">
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Instant Report Dispatch
              </div>

              <button
                type="button"
                onClick={handleForceMorningReport}
                disabled={Boolean(activeAction) || !smtpUser || !smtpPassword}
                className="w-full p-3 rounded-2xl bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/30 dark:hover:bg-amber-950/50 border border-amber-200 dark:border-amber-900/50 text-left transition-all active:scale-98 disabled:opacity-50 flex items-center justify-between"
              >
                <div>
                  <div className="text-xs font-bold text-amber-900 dark:text-amber-300">
                    Force Send &quot;Day Plan&quot;
                  </div>
                  <p className="text-[10px] text-amber-700/80 dark:text-amber-400/80 mt-0.5">
                    Morning format (no times)
                  </p>
                </div>
                {activeAction === "forceMorning" && (
                  <Loader2 className="w-4 h-4 text-amber-600 animate-spin" />
                )}
              </button>

              <button
                type="button"
                onClick={handleForceEveningSummary}
                disabled={Boolean(activeAction) || !smtpUser || !smtpPassword}
                className="w-full p-3 rounded-2xl bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/30 dark:hover:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-900/50 text-left transition-all active:scale-98 disabled:opacity-50 flex items-center justify-between"
              >
                <div>
                  <div className="text-xs font-bold text-indigo-900 dark:text-indigo-300">
                    Force Send &quot;Task Log&quot;
                  </div>
                  <p className="text-[10px] text-indigo-700/80 dark:text-indigo-400/80 mt-0.5">
                    Evening format (with times & productivity)
                  </p>
                </div>
                {activeAction === "forceEvening" && (
                  <Loader2 className="w-4 h-4 text-indigo-600 animate-spin" />
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* User Modal */}
      <UserModal
        isOpen={isUserModalOpen}
        onClose={() => setIsUserModalOpen(false)}
        editingUser={editingUser}
      />

      {/* Confirm Delete User Dialog */}
      <ConfirmDialog
        isOpen={Boolean(userToDelete)}
        title="Remove Team Member"
        message="Are you sure you want to remove this team member? This action cannot be undone."
        confirmText="Remove Member"
        isLoading={isPending}
        onConfirm={handleConfirmDeleteUser}
        onCancel={() => setUserToDelete(null)}
      />

      {/* Confirm Password Change Dialog */}
      <ConfirmDialog
        isOpen={isPasswordConfirmOpen}
        title="Confirm Password Change"
        message={`Are you sure you want to update the login password for ${
          targetPasswordUser?.name || "this team member"
        }? They will immediately need to use this new password to sign in.`}
        confirmText="Update Password"
        isLoading={isPending}
        onConfirm={handleExecutePasswordChange}
        onCancel={() => setIsPasswordConfirmOpen(false)}
      />
    </div>
  );
}

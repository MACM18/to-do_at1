'use client';

import React, { useState, useEffect, useTransition } from 'react';
import {
  X,
  FileSpreadsheet,
  Printer,
  Calendar,
  Users,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Copy,
  Check,
  Sparkles,
  ArrowRight,
  Clock,
  Briefcase,
  Layers,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import {
  getMondayWorkplanReportData,
  getSaturdayProgressReportData,
} from '@/lib/actions/task-actions';

interface ExecutiveReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialType?: 'MONDAY' | 'SATURDAY' | 'MONTHLY';
}

export default function ExecutiveReportModal({
  isOpen,
  onClose,
  initialType = 'MONDAY',
}: ExecutiveReportModalProps) {
  const [activeTab, setActiveTab] = useState<'MONDAY' | 'SATURDAY'>(
    initialType === 'SATURDAY' || initialType === 'MONTHLY' ? 'SATURDAY' : 'MONDAY'
  );
  const [saturdayPeriod, setSaturdayPeriod] = useState<'AUTO' | 'WEEKLY' | 'MONTHLY'>(
    initialType === 'MONTHLY' ? 'MONTHLY' : 'AUTO'
  );

  const [mondayData, setMondayData] = useState<any>(null);
  const [saturdayData, setSaturdayData] = useState<any>(null);
  const [copied, setCopied] = useState(false);
  const [isPending, startTransition] = useTransition();

  // Load report data
  const loadReport = () => {
    startTransition(async () => {
      if (activeTab === 'MONDAY') {
        const data = await getMondayWorkplanReportData();
        setMondayData(data);
      } else {
        const data = await getSaturdayProgressReportData(saturdayPeriod);
        setSaturdayData(data);
      }
    });
  };

  useEffect(() => {
    if (isOpen) {
      loadReport();
    }
  }, [isOpen, activeTab, saturdayPeriod]);

  if (!isOpen) return null;

  const handleCopyClipboard = async () => {
    const textToCopy =
      activeTab === 'MONDAY' ? mondayData?.textSummary : saturdayData?.textSummary;
    if (!textToCopy) return;

    try {
      await navigator.clipboard.writeText(textToCopy);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch (err) {
      console.error('Failed to copy', err);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  // Export Saturday CSV
  const handleExportCSV = () => {
    if (!saturdayData || !saturdayData.developers) return;

    const headers = [
      'Team Member',
      'Role',
      'Email',
      'Completion Rate (%)',
      'Productivity Score (%)',
      'Total Tasks',
      'Completed Tasks',
      'In Progress Tasks',
      'Pending Tasks',
      'Meetings Held',
    ];

    const rows = saturdayData.developers.map((d: any) => [
      `"${d.name}"`,
      `"${d.role}"`,
      `"${d.email}"`,
      `"${d.completionRate}%"`,
      `"${d.productivityScore}%"`,
      d.totalTasks,
      d.completedTasks.length,
      d.inProgressTasks.length,
      d.pendingTasks.length,
      d.meetings.length,
    ]);

    const csvContent = [headers.join(','), ...rows.map((r: any[]) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute(
      'download',
      `${saturdayData.isMonthly ? 'monthly' : 'weekly'}_team_progress_${new Date().toISOString().split('T')[0]}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/70 backdrop-blur-md animate-in fade-in duration-150">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-5xl shadow-2xl overflow-hidden max-h-[92vh] flex flex-col animate-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Briefcase className="w-5 h-5 text-blue-600" />
              Executive Team Reports & Exports
            </h2>
            <p className="text-xs text-slate-500">
              Monday developer kickoff plans & Saturday/Monthly progress reports
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab Selector & Controls */}
        <div className="px-6 py-3 border-b border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-slate-900">
          <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200/60 dark:border-slate-700/60">
            <button
              onClick={() => setActiveTab('MONDAY')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold rounded-xl transition-all ${
                activeTab === 'MONDAY'
                  ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>Monday Workplan</span>
            </button>

            <button
              onClick={() => setActiveTab('SATURDAY')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold rounded-xl transition-all ${
                activeTab === 'SATURDAY'
                  ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Saturday Progress</span>
            </button>
          </div>

          {/* Saturday sub-period selector */}
          {activeTab === 'SATURDAY' && (
            <div className="flex items-center gap-1 text-xs">
              <span className="text-slate-400 font-medium">Scope:</span>
              <select
                value={saturdayPeriod}
                onChange={(e) => setSaturdayPeriod(e.target.value as any)}
                className="px-2.5 py-1 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs font-semibold focus:outline-none"
              >
                <option value="AUTO">Auto (Last Sat = Monthly, else Weekly)</option>
                <option value="WEEKLY">This Week</option>
                <option value="MONTHLY">Full Month</option>
              </select>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center gap-2 ml-auto">
            <button
              onClick={handleCopyClipboard}
              disabled={isPending}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold rounded-xl transition-all shadow-xs ${
                copied
                  ? 'bg-emerald-600 text-white'
                  : 'bg-blue-600 hover:bg-blue-700 text-white active:scale-95'
              }`}
              title="Copy formatted text to share on Slack / WhatsApp / Email"
            >
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied to Clipboard' : 'Copy for Manager'}</span>
            </button>

            {activeTab === 'SATURDAY' && (
              <button
                onClick={handleExportCSV}
                disabled={isPending}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors"
                title="Download CSV Spreadsheet"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                <span className="hidden sm:inline">CSV</span>
              </button>
            )}

            <button
              onClick={handlePrint}
              disabled={isPending}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors"
              title="Export to PDF or Print"
            >
              <Printer className="w-3.5 h-3.5 text-slate-600 dark:text-slate-400" />
              <span className="hidden sm:inline">PDF / Print</span>
            </button>
          </div>
        </div>

        {/* Modal Scrollable Content Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {isPending ? (
            <div className="flex flex-col items-center justify-center py-20 text-slate-400 gap-3">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
              <span className="text-xs font-semibold">Generating executive report...</span>
            </div>
          ) : activeTab === 'MONDAY' ? (
            /* Monday Kickoff Workplan View */
            <div className="space-y-6">
              {/* Header Overview Card */}
              <div className="p-4 rounded-3xl bg-blue-50/60 dark:bg-blue-950/30 border border-blue-200/80 dark:border-blue-900/60 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="text-[11px] font-bold uppercase tracking-wider text-blue-700 dark:text-blue-300">
                    Weekly Kickoff Summary
                  </div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 mt-0.5">
                    Monday Developer Workplan & Ongoing Deliverables
                  </h3>
                  <p className="text-xs text-slate-500">
                    {mondayData?.dateStr} • {mondayData?.totalDevelopers} Developers •{' '}
                    {mondayData?.totalActiveTasks} Total Active Tasks
                  </p>
                </div>

                <button
                  onClick={handleCopyClipboard}
                  className="px-4 py-2 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm transition-all active:scale-95"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy Report for Manager</span>
                </button>
              </div>

              {/* Developer Workplans List */}
              <div className="space-y-4">
                {mondayData?.developers?.map((dev: any) => (
                  <div
                    key={dev.userId}
                    className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-3.5"
                  >
                    {/* Developer Info Header */}
                    <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white font-bold text-sm flex items-center justify-center">
                          {dev.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-sm text-slate-900 dark:text-slate-100">
                              {dev.name}
                            </span>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                              {dev.role}
                            </span>
                          </div>
                          <span className="text-[11px] text-slate-400">{dev.email}</span>
                        </div>
                      </div>

                      <span className="text-xs font-bold px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border border-blue-200/60 dark:border-blue-800">
                        {dev.totalActive} Active Deliverables
                      </span>
                    </div>

                    {/* Ongoing Tasks */}
                    {dev.ongoing.length > 0 && (
                      <div className="space-y-2">
                        <div className="text-[11px] font-bold text-blue-700 dark:text-blue-400 uppercase tracking-wider flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse" />
                          <span>Ongoing & In Progress ({dev.ongoing.length})</span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {dev.ongoing.map((t: any) => (
                            <div
                              key={t.id}
                              className="p-3 rounded-2xl bg-blue-50/40 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/40 text-xs space-y-1"
                            >
                              <div className="flex items-center justify-between gap-2">
                                <span className="font-bold text-slate-800 dark:text-slate-200 truncate">
                                  {t.title}
                                </span>
                                <span className="font-mono text-[10px] font-bold text-blue-600 shrink-0">
                                  {Number(t.progress || 0).toFixed(0)}%
                                </span>
                              </div>
                              <div className="flex items-center gap-2 text-[10px] text-slate-400">
                                <span>{t.priority}</span>
                                {t.startTime && <span>Started: {t.startTime}</span>}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Pending Carry-Over Backlog */}
                    {dev.carryOver.length > 0 && (
                      <div className="space-y-2">
                        <div className="text-[11px] font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                          <AlertCircle className="w-3 h-3" />
                          <span>Pending Backlog ({dev.carryOver.length})</span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {dev.carryOver.map((t: any) => (
                            <div
                              key={t.id}
                              className="p-3 rounded-2xl bg-amber-50/30 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/40 text-xs space-y-1"
                            >
                              <span className="font-bold text-slate-800 dark:text-slate-200 truncate block">
                                {t.title}
                              </span>
                              <div className="flex items-center justify-between text-[10px] text-slate-400">
                                <span>{t.priority}</span>
                                {t.dueDate && (
                                  <span>Due: {new Date(t.dueDate).toLocaleDateString('en-US')}</span>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Scheduled Today Tasks */}
                    {dev.activeToday.length > 0 && (
                      <div className="space-y-2">
                        <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                          <Layers className="w-3 h-3" />
                          <span>Scheduled Today ({dev.activeToday.length})</span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {dev.activeToday.map((t: any) => (
                            <div
                              key={t.id}
                              className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 text-xs flex items-center justify-between gap-2"
                            >
                              <span className="text-slate-700 dark:text-slate-300 truncate font-medium">
                                {t.title}
                              </span>
                              <span className="text-[10px] text-slate-400 shrink-0 font-semibold">
                                {t.priority}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {dev.totalActive === 0 && (
                      <p className="text-xs text-slate-400 italic">No active pending tasks.</p>
                    )}

                    {dev.blockers && (
                      <div className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900 text-xs text-rose-700 dark:text-rose-300">
                        <strong>Blocker:</strong> {dev.blockers}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ) : (
            /* Saturday / Monthly Progress View */
            <div className="space-y-6">
              {/* Overall Progress Metrics Card */}
              <div className="p-5 rounded-3xl bg-indigo-50/50 dark:bg-indigo-950/30 border border-indigo-200/80 dark:border-indigo-900/60 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="text-[11px] font-bold uppercase tracking-wider text-indigo-700 dark:text-indigo-300">
                      {saturdayData?.isMonthly ? 'Full Month Executive Progress' : 'Weekly Team Progress'}
                    </div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 mt-0.5">
                      {saturdayData?.periodTitle}
                    </h3>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleCopyClipboard}
                      className="px-4 py-2 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm transition-all active:scale-95"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy Summary</span>
                    </button>
                  </div>
                </div>

                {/* Metrics Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 border-t border-indigo-100 dark:border-indigo-900/50">
                  <div className="p-3 rounded-2xl bg-white dark:bg-slate-900 border border-indigo-100 dark:border-indigo-900/40 text-center">
                    <div className="text-lg font-black text-indigo-600 dark:text-indigo-400">
                      {saturdayData?.summary?.overallTeamCompletionRate}%
                    </div>
                    <div className="text-[11px] font-semibold text-slate-500">Completion Rate</div>
                  </div>

                  <div className="p-3 rounded-2xl bg-white dark:bg-slate-900 border border-indigo-100 dark:border-indigo-900/40 text-center">
                    <div className="text-lg font-black text-emerald-600 dark:text-emerald-400">
                      {saturdayData?.summary?.totalCompleted}/{saturdayData?.summary?.totalTasks}
                    </div>
                    <div className="text-[11px] font-semibold text-slate-500">Tasks Completed</div>
                  </div>

                  <div className="p-3 rounded-2xl bg-white dark:bg-slate-900 border border-indigo-100 dark:border-indigo-900/40 text-center">
                    <div className="text-lg font-black text-blue-600 dark:text-blue-400">
                      {saturdayData?.summary?.totalInProgress}
                    </div>
                    <div className="text-[11px] font-semibold text-slate-500">In Progress</div>
                  </div>

                  <div className="p-3 rounded-2xl bg-white dark:bg-slate-900 border border-indigo-100 dark:border-indigo-900/40 text-center">
                    <div className="text-lg font-black text-slate-700 dark:text-slate-300">
                      {saturdayData?.summary?.totalMeetings}
                    </div>
                    <div className="text-[11px] font-semibold text-slate-500">Meetings Logged</div>
                  </div>
                </div>
              </div>

              {/* Developer Deliverables Breakdown */}
              <div className="space-y-4">
                {saturdayData?.developers?.map((dev: any) => (
                  <div
                    key={dev.userId}
                    className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white font-bold text-sm flex items-center justify-center">
                          {dev.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-sm text-slate-900 dark:text-slate-100">
                              {dev.name}
                            </span>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                              {dev.role}
                            </span>
                          </div>
                          <span className="text-[11px] text-slate-400">{dev.email}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-4 text-right">
                        <div>
                          <div className="text-xs font-bold text-slate-800 dark:text-slate-200">
                            {dev.completedTasks.length}/{dev.totalTasks} Completed ({dev.completionRate}%)
                          </div>
                          <div className="text-[10px] text-slate-400">Score: {dev.productivityScore}%</div>
                        </div>
                      </div>
                    </div>

                    {/* Completed Deliverables */}
                    {dev.completedTasks.length > 0 && (
                      <div className="space-y-2">
                        <div className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                          <span>Completed Deliverables ({dev.completedTasks.length})</span>
                        </div>
                        <div className="space-y-1.5">
                          {dev.completedTasks.map((t: any) => (
                            <div
                              key={t.id}
                              className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 text-xs flex items-center justify-between gap-2"
                            >
                              <span className="text-slate-700 dark:text-slate-300 font-medium truncate">
                                {t.title}
                              </span>
                              <span className="text-[10px] font-mono text-slate-400 shrink-0">
                                {t.startTime || '8.30'} - {t.endTime || 'Done'}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* In Progress Tasks */}
                    {dev.inProgressTasks.length > 0 && (
                      <div className="space-y-2">
                        <div className="text-[11px] font-bold text-blue-700 dark:text-blue-400 uppercase tracking-wider flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-blue-600" />
                          <span>In-Progress Items ({dev.inProgressTasks.length})</span>
                        </div>
                        <div className="space-y-1.5">
                          {dev.inProgressTasks.map((t: any) => (
                            <div
                              key={t.id}
                              className="p-2.5 rounded-xl bg-blue-50/40 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/40 text-xs flex items-center justify-between gap-2"
                            >
                              <span className="text-slate-800 dark:text-slate-200 font-medium truncate">
                                {t.title}
                              </span>
                              <span className="text-[10px] font-mono font-bold text-blue-600 shrink-0">
                                {Number(t.progress || 0).toFixed(0)}%
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Meetings Logged */}
                    {dev.meetings.length > 0 && (
                      <div className="space-y-2">
                        <div className="text-[11px] font-bold text-sky-700 dark:text-sky-400 uppercase tracking-wider flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-sky-500" />
                          <span>Meetings Attended ({dev.meetings.length})</span>
                        </div>
                        <div className="space-y-1.5">
                          {dev.meetings.map((m: any) => (
                            <div
                              key={m.id}
                              className="p-2.5 rounded-xl bg-sky-50/40 dark:bg-sky-950/20 border border-sky-100 dark:border-sky-900/40 text-xs flex items-center justify-between gap-2"
                            >
                              <span className="text-slate-800 dark:text-slate-200 font-medium truncate">
                                {m.title}
                              </span>
                              <span className="text-[10px] font-mono text-sky-700 dark:text-sky-300 shrink-0">
                                {m.startTime} - {m.endTime}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

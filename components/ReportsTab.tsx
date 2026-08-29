'use client';

import React, { useState, useTransition } from 'react';
import {
  FileText,
  Calendar,
  CheckCircle2,
  Trash2,
  RotateCcw,
  Eye,
  Plus,
  Copy,
  Check,
  AlertTriangle,
  Loader2,
  ArrowUpRight,
  Printer,
  FileSpreadsheet,
  Clock,
  Layers,
  Sparkles,
  Search,
  Filter,
} from 'lucide-react';
import { deleteSavedReport, recreateSavedReport } from '@/lib/actions/report-actions';
import ExecutiveReportModal from './ExecutiveReportModal';
import { getReportTimeSlots } from '@/lib/time-utils';

interface ReportsTabProps {
  currentUser: any;
  savedReports: any[];
}

export default function ReportsTab({ currentUser, savedReports = [] }: ReportsTabProps) {
  const [reports, setReports] = useState<any[]>(savedReports);
  const [selectedReport, setSelectedReport] = useState<any | null>(null);
  const [isExecutiveModalOpen, setIsExecutiveModalOpen] = useState(false);
  const [modalType, setModalType] = useState<'MONDAY' | 'SATURDAY' | 'MONTHLY'>('MONDAY');
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<'ALL' | 'MONDAY_KICKOFF' | 'SATURDAY_PROGRESS' | 'MONTHLY_SUMMARY'>('ALL');

  // Double confirmation modals state
  const [deleteConfirmReport, setDeleteConfirmReport] = useState<any | null>(null);
  const [recreateConfirmReport, setRecreateConfirmReport] = useState<any | null>(null);
  const [isPending, startTransition] = useTransition();
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Synchronize state when server props update
  React.useEffect(() => {
    setReports(savedReports);
  }, [savedReports]);

  // Colombo time checking for scheduled badges
  const { isMondaySlot, isSaturdaySlot, isMonthlySlot, isLastSaturday } = getReportTimeSlots(new Date());

  const handleDelete = () => {
    if (!deleteConfirmReport) return;
    startTransition(async () => {
      await deleteSavedReport(deleteConfirmReport.id);
      setReports((prev) => prev.filter((r) => r.id !== deleteConfirmReport.id));
      setDeleteConfirmReport(null);
    });
  };

  const handleRecreate = () => {
    if (!recreateConfirmReport) return;
    startTransition(async () => {
      const updated = await recreateSavedReport(recreateConfirmReport.id);
      setReports((prev) =>
        prev.map((r) => (r.id === recreateConfirmReport.id ? { ...r, ...updated } : r))
      );
      setRecreateConfirmReport(null);
    });
  };

  const handleCopyClipboard = async (report: any) => {
    if (!report.summaryText) return;
    try {
      await navigator.clipboard.writeText(report.summaryText);
      setCopiedId(report.id);
      setTimeout(() => setCopiedId(null), 2500);
    } catch (err) {
      console.error(err);
    }
  };

  const filteredReports = reports.filter((r) => {
    const matchesSearch =
      r.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.period.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = typeFilter === 'ALL' || r.type === typeFilter;
    return matchesSearch && matchesType;
  });

  return (
    <div className="space-y-6 pb-24 max-w-6xl mx-auto">
      {/* Top Header & Quick Generator Controls */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
              Executive Hub
            </div>
            <h2 className="text-xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
              Reports & Progress Archive
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Manual report generation active during weekly and monthly timeframes
            </p>
          </div>

          {/* Quick Trigger Buttons: Display strictly when active */}
          <div className="flex flex-wrap items-center gap-2">
            {isMondaySlot && (
              <button
                onClick={() => {
                  setModalType('MONDAY');
                  setIsExecutiveModalOpen(true);
                }}
                className="flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all active:scale-95 shadow-xs bg-blue-600 hover:bg-blue-700 text-white ring-4 ring-blue-500/20"
              >
                <Calendar className="w-4 h-4" />
                <span>Generate Monday Workplan</span>
                <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-white text-blue-700 font-black uppercase">
                  Active Now
                </span>
              </button>
            )}

            {isSaturdaySlot && !isMonthlySlot && (
              <button
                onClick={() => {
                  setModalType('SATURDAY');
                  setIsExecutiveModalOpen(true);
                }}
                className="flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all active:scale-95 shadow-xs bg-indigo-600 hover:bg-indigo-700 text-white ring-4 ring-indigo-500/20"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Generate Saturday Progress</span>
                <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-white text-indigo-700 font-black uppercase">
                  Active Now
                </span>
              </button>
            )}

            {isMonthlySlot && (
              <button
                onClick={() => {
                  setModalType('MONTHLY');
                  setIsExecutiveModalOpen(true);
                }}
                className="flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all active:scale-95 shadow-xs bg-purple-600 hover:bg-purple-700 text-white ring-4 ring-purple-500/20"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Generate Monthly Report</span>
                <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-white text-purple-700 font-black uppercase">
                  Active Now
                </span>
              </button>
            )}
          </div>
        </div>

        {/* Scheduled Timing Alerts */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
          <div className="p-3 rounded-2xl bg-blue-50/60 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/40 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-blue-600" />
              <div>
                <span className="font-bold text-slate-800 dark:text-slate-200">
                  Monday Workplan
                </span>
                <div className="text-[10px] text-slate-500">Mon 10:00 AM – EOD</div>
              </div>
            </div>
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                isMondaySlot
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
              }`}
            >
              {isMondaySlot ? 'Active' : 'Inactive'}
            </span>
          </div>

          <div className="p-3 rounded-2xl bg-indigo-50/60 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/40 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-indigo-600" />
              <div>
                <span className="font-bold text-slate-800 dark:text-slate-200">
                  Saturday Progress
                </span>
                <div className="text-[10px] text-slate-500">Sat 1:30 PM – EOD</div>
              </div>
            </div>
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                isSaturdaySlot && !isMonthlySlot
                  ? 'bg-indigo-600 text-white'
                  : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
              }`}
            >
              {isSaturdaySlot && !isMonthlySlot ? 'Active' : 'Inactive'}
            </span>
          </div>

          <div className="p-3 rounded-2xl bg-purple-50/60 dark:bg-purple-950/20 border border-purple-100 dark:border-purple-900/40 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-purple-600" />
              <div>
                <span className="font-bold text-slate-800 dark:text-slate-200">
                  Monthly Review
                </span>
                <div className="text-[10px] text-slate-500">Last Sat 1:30 PM – Month End</div>
              </div>
            </div>
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                isMonthlySlot
                  ? 'bg-purple-600 text-white'
                  : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
              }`}
            >
              {isMonthlySlot ? 'Active' : 'Inactive'}
            </span>
          </div>
        </div>
      </div>

      {/* Filters and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
          {(['ALL', 'MONDAY_KICKOFF', 'SATURDAY_PROGRESS', 'MONTHLY_SUMMARY'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTypeFilter(t)}
              className={`px-3 py-1.5 text-xs font-bold rounded-xl whitespace-nowrap transition-all ${
                typeFilter === t
                  ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-sm'
                  : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800 hover:bg-slate-100'
              }`}
            >
              {t === 'ALL'
                ? `All Reports (${reports.length})`
                : t === 'MONDAY_KICKOFF'
                ? 'Monday Workplans'
                : t === 'SATURDAY_PROGRESS'
                ? 'Weekly Progress'
                : 'Monthly Summaries'}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search saved reports..."
            className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Saved Reports List */}
      {filteredReports.length === 0 ? (
        <div className="p-12 text-center rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 mx-auto flex items-center justify-center">
            <FileText className="w-6 h-6" />
          </div>
          <h3 className="font-bold text-sm text-slate-800 dark:text-slate-200">
            No saved reports found
          </h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            Generate a Monday developer kickoff report or Saturday progress summary to save it here for future reference.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredReports.map((report) => {
            const isMonday = report.type === 'MONDAY_KICKOFF';
            const isMonthly = report.type === 'MONTHLY_SUMMARY';
            const isCopied = copiedId === report.id;

            return (
              <div
                key={report.id}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-sm space-y-4 hover:border-slate-300 dark:hover:border-slate-700 transition-all flex flex-col justify-between"
              >
                <div className="space-y-3">
                  {/* Top Badges */}
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full ${
                        isMonday
                          ? 'bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300 border border-blue-200 dark:border-blue-800'
                          : isMonthly
                          ? 'bg-purple-50 text-purple-700 dark:bg-purple-950 dark:text-purple-300 border border-purple-200 dark:border-purple-800'
                          : 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800'
                      }`}
                    >
                      {isMonday
                        ? 'Monday Workplan'
                        : isMonthly
                        ? 'Monthly Review'
                        : 'Saturday Progress'}
                    </span>

                    <span className="text-[11px] text-slate-400 font-medium">
                      {new Date(report.createdAt).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </span>
                  </div>

                  {/* Title & Period */}
                  <div>
                    <h4 className="font-bold text-sm text-slate-900 dark:text-slate-100 line-clamp-1">
                      {report.title}
                    </h4>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Period: {report.period}
                    </p>
                  </div>

                  {/* Metrics Snapshot */}
                  <div className="grid grid-cols-3 gap-2 p-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 text-center">
                    <div>
                      <div className="text-xs font-bold text-slate-800 dark:text-slate-200">
                        {report.totalTasks}
                      </div>
                      <div className="text-[10px] text-slate-400">Total Items</div>
                    </div>
                    <div>
                      <div className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                        {report.completedCount}
                      </div>
                      <div className="text-[10px] text-slate-400">Completed</div>
                    </div>
                    <div>
                      <div className="text-xs font-bold text-indigo-600 dark:text-indigo-400">
                        {report.completionRate}%
                      </div>
                      <div className="text-[10px] text-slate-400">Completion</div>
                    </div>
                  </div>
                </div>

                {/* Card Action Buttons */}
                <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                  <button
                    onClick={() => handleCopyClipboard(report)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
                      isCopied
                        ? 'bg-emerald-600 text-white'
                        : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300'
                    }`}
                    title="Copy formatted text to share on Slack / WhatsApp / Email"
                  >
                    {isCopied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{isCopied ? 'Copied' : 'Copy'}</span>
                  </button>

                  <div className="flex items-center gap-1">
                    {/* Recreate Button */}
                    <button
                      onClick={() => setRecreateConfirmReport(report)}
                      className="p-1.5 rounded-xl text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/50 transition-colors"
                      title="Recreate report with fresh data (Double confirmation required)"
                    >
                      <RotateCcw className="w-4 h-4" />
                    </button>

                    {/* Delete Button */}
                    <button
                      onClick={() => setDeleteConfirmReport(report)}
                      className="p-1.5 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition-colors"
                      title="Delete report permanently (Double confirmation required)"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Double Confirmation Modal: Recreate Report */}
      {recreateConfirmReport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 w-full max-w-md shadow-2xl space-y-4 animate-in zoom-in-95 duration-150">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-950 text-blue-600 flex items-center justify-center">
              <RotateCcw className="w-6 h-6" />
            </div>

            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                Recreate Report Confirmation
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Are you sure you want to regenerate <strong>&quot;{recreateConfirmReport.title}&quot;</strong>? This will pull the latest live task deliverable metrics and update this saved report.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setRecreateConfirmReport(null)}
                disabled={isPending}
                className="px-4 py-2 text-xs font-semibold rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleRecreate}
                disabled={isPending}
                className="px-4 py-2 text-xs font-bold rounded-xl bg-blue-600 hover:bg-blue-700 text-white shadow-sm flex items-center gap-1.5"
              >
                {isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>Yes, Recreate Report</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Double Confirmation Modal: Delete Report */}
      {deleteConfirmReport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 w-full max-w-md shadow-2xl space-y-4 animate-in zoom-in-95 duration-150">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 dark:bg-rose-950 text-rose-600 flex items-center justify-center">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                Delete Report Confirmation
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Are you sure you want to permanently delete <strong>&quot;{deleteConfirmReport.title}&quot;</strong>? This action cannot be undone.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeleteConfirmReport(null)}
                disabled={isPending}
                className="px-4 py-2 text-xs font-semibold rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={isPending}
                className="px-4 py-2 text-xs font-bold rounded-xl bg-rose-600 hover:bg-rose-700 text-white shadow-sm flex items-center gap-1.5"
              >
                {isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>Yes, Delete Report</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Manual Report Generator Modal */}
      <ExecutiveReportModal
        isOpen={isExecutiveModalOpen}
        onClose={() => setIsExecutiveModalOpen(false)}
        initialType={modalType}
      />
    </div>
  );
}

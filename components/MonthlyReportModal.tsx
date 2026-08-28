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
  Download,
  Filter,
} from 'lucide-react';
import { getMonthlyReportData } from '@/lib/actions/task-actions';

interface MonthlyReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  users: any[];
  initialUserId?: string;
}

export default function MonthlyReportModal({
  isOpen,
  onClose,
  users,
  initialUserId = 'ALL',
}: MonthlyReportModalProps) {
  const currentDate = new Date();
  const [selectedYear, setSelectedYear] = useState<number>(currentDate.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number>(currentDate.getMonth() + 1);
  const [selectedUserId, setSelectedUserId] = useState<string>(initialUserId);
  const [reportData, setReportData] = useState<any>(null);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  const months = [
    { value: 1, label: 'January' },
    { value: 2, label: 'February' },
    { value: 3, label: 'March' },
    { value: 4, label: 'April' },
    { value: 5, label: 'May' },
    { value: 6, label: 'June' },
    { value: 7, label: 'July' },
    { value: 8, label: 'August' },
    { value: 9, label: 'September' },
    { value: 10, label: 'October' },
    { value: 11, label: 'November' },
    { value: 12, label: 'December' },
  ];

  const years = [currentDate.getFullYear() - 1, currentDate.getFullYear(), currentDate.getFullYear() + 1];

  const loadData = () => {
    startTransition(async () => {
      try {
        const data = await getMonthlyReportData({
          year: Number(selectedYear),
          month: Number(selectedMonth),
          userId: selectedUserId,
        });
        setReportData(data);
      } catch (err: any) {
        console.error(err);
      }
    });
  };

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen, selectedYear, selectedMonth, selectedUserId]);

  if (!isOpen) return null;

  // Export to CSV
  const handleExportCSV = () => {
    if (!reportData || !reportData.tasks || reportData.tasks.length === 0) {
      setStatusMessage({ type: 'error', text: 'No task records to export for this month.' });
      return;
    }

    const headers = [
      'Date',
      'Team Member',
      'Email',
      'Task Title',
      'Priority',
      'Assigned By',
      'Status',
      'Start Time',
      'End Time',
      'Productivity (%)',
    ];

    const rows = reportData.tasks.map((t: any) => [
      `"${new Date(t.date).toLocaleDateString('en-US')}"`,
      `"${t.userName}"`,
      `"${t.userEmail}"`,
      `"${t.title.replace(/"/g, '""')}"`,
      `"${t.priority || 'High'}"`,
      `"${t.assignedBy || 'Myself'}"`,
      `"${t.status === 'DONE' ? 'Completed' : 'In progress'}"`,
      `"${t.startTime || ''}"`,
      `"${t.endTime || ''}"`,
      `"${Number(t.progress || 0).toFixed(2)}%"`,
    ]);

    const csvContent = [headers.join(','), ...rows.map((r: string[]) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute(
      'download',
      `monthly_task_report_${selectedYear}_${String(selectedMonth).padStart(2, '0')}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Print / PDF View
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-5xl shadow-2xl overflow-hidden max-h-[92vh] flex flex-col animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-6 py-4 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-blue-600" />
              Monthly Team & Task Report
            </h2>
            <p className="text-xs text-slate-500">
              Aggregated monthly deliverables, productivity breakdown, and exports
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Filter Controls Bar */}
        <div className="p-4 bg-slate-50 dark:bg-slate-800/40 border-b border-slate-200/80 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            {/* Month Picker */}
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(Number(e.target.value))}
              className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold text-slate-800 dark:text-slate-200 focus:outline-none"
            >
              {months.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>

            {/* Year Picker */}
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold text-slate-800 dark:text-slate-200 focus:outline-none"
            >
              {years.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>

            {/* Team Member Filter */}
            <select
              value={selectedUserId}
              onChange={(e) => setSelectedUserId(e.target.value)}
              className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold text-slate-800 dark:text-slate-200 focus:outline-none"
            >
              <option value="ALL">All Team Members</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </select>
          </div>

          {/* Export Action Buttons (CSV & Print/PDF) */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleExportCSV}
              className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm active:scale-95"
              title="Download CSV Spreadsheet"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Export CSV</span>
            </button>

            <button
              onClick={handlePrint}
              className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-900 dark:bg-slate-700 dark:hover:bg-slate-600 text-white text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm active:scale-95"
              title="Print or Save as PDF"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print / PDF</span>
            </button>
          </div>
        </div>

        {/* Status Toast Alert */}
        {statusMessage && (
          <div
            className={`mx-6 mt-4 p-3 rounded-2xl text-xs font-semibold flex items-center justify-between gap-2.5 ${
              statusMessage.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300'
                : 'bg-rose-50 text-rose-800 border border-rose-200 dark:bg-rose-950/40 dark:text-rose-300'
            }`}
          >
            <div className="flex items-center gap-2">
              {statusMessage.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-600" />
              )}
              <span>{statusMessage.text}</span>
            </div>
            <button onClick={() => setStatusMessage(null)} className="text-xs opacity-70">
              Dismiss
            </button>
          </div>
        )}

        {/* Report Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Summary Stats Row */}
          {reportData?.summary && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/60">
                <div className="text-xs text-slate-500">Total Monthly Tasks</div>
                <div className="text-xl font-bold text-slate-900 dark:text-slate-100 mt-0.5">
                  {reportData.summary.totalTasks}
                </div>
              </div>
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/60">
                <div className="text-xs text-slate-500">Completed</div>
                <div className="text-xl font-bold text-emerald-600 mt-0.5">
                  {reportData.summary.completedTasks}
                </div>
              </div>
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/60">
                <div className="text-xs text-slate-500">In Progress</div>
                <div className="text-xl font-bold text-blue-600 mt-0.5">
                  {reportData.summary.inProgressTasks}
                </div>
              </div>
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/60">
                <div className="text-xs text-slate-500">Monthly Completion Rate</div>
                <div className="text-xl font-bold text-indigo-600 mt-0.5">
                  {reportData.summary.averageProductivity}%
                </div>
              </div>
            </div>
          )}

          {/* Monthly Tabular Breakdown */}
          <div className="border border-slate-200 dark:border-slate-700 rounded-2xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-900 text-white font-bold">
                    <th className="py-2.5 px-3 border-r border-slate-800">Date</th>
                    <th className="py-2.5 px-3 border-r border-slate-800">Team Member</th>
                    <th className="py-2.5 px-3 border-r border-slate-800">Task Title</th>
                    <th className="py-2.5 px-3 border-r border-slate-800 text-center">Priority</th>
                    <th className="py-2.5 px-3 border-r border-slate-800 text-center">Assigned By</th>
                    <th className="py-2.5 px-3 border-r border-slate-800 text-center">Status</th>
                    <th className="py-2.5 px-3 text-right">Productivity (%)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {reportData?.tasks && reportData.tasks.length > 0 ? (
                    reportData.tasks.map((t: any) => (
                      <tr
                        key={t.id}
                        className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
                      >
                        <td className="py-2 px-3 text-slate-500 font-mono text-[11px] whitespace-nowrap">
                          {new Date(t.date).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                          })}
                        </td>
                        <td className="py-2 px-3 font-semibold text-slate-800 dark:text-slate-200 whitespace-nowrap">
                          {t.userName}
                        </td>
                        <td className="py-2 px-3 font-medium text-slate-900 dark:text-slate-100">
                          {t.title}
                          {t.subtasksCount > 0 && (
                            <span className="text-[10px] text-slate-400 ml-1.5">
                              ({t.completedSubtasks}/{t.subtasksCount} subtasks)
                            </span>
                          )}
                        </td>
                        <td className="py-2 px-3 text-center whitespace-nowrap">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                              t.priority?.toLowerCase() === 'high'
                                ? 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300'
                                : t.priority?.toLowerCase() === 'medium'
                                ? 'bg-sky-50 text-sky-700 dark:bg-sky-950/60 dark:text-sky-300'
                                : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                            }`}
                          >
                            {t.priority || 'High'}
                          </span>
                        </td>
                        <td className="py-2 px-3 text-center font-bold text-[11px] text-slate-700 dark:text-slate-300 whitespace-nowrap">
                          {t.assignedBy || 'Myself'}
                        </td>
                        <td className="py-2 px-3 text-center whitespace-nowrap">
                          <span
                            className={`text-xs font-semibold ${
                              t.status === 'DONE'
                                ? 'text-emerald-600 dark:text-emerald-400'
                                : 'text-slate-600 dark:text-slate-400'
                            }`}
                          >
                            {t.status === 'DONE' ? 'Completed' : 'In progress'}
                          </span>
                        </td>
                        <td className="py-2 px-3 text-right font-mono font-bold text-slate-900 dark:text-slate-100 whitespace-nowrap">
                          {Number(t.progress || 0).toFixed(2)}%
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-xs text-slate-400 italic">
                        {isPending ? 'Loading monthly records...' : 'No tasks recorded for the selected month.'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

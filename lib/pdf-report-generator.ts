import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { formatLocalDate, getLocalDateParts } from './time-utils';

// Extend jsPDF interface for autoTable plugin
interface jsPDFWithAutoTable extends jsPDF {
  lastAutoTable?: {
    finalY: number;
  };
}

/**
 * Adds standard executive header and metadata banner to PDF
 */
function addPdfHeader(
  doc: jsPDF,
  title: string,
  subtitle: string,
  periodText: string
) {
  const pageWidth = doc.internal.pageSize.getWidth();

  // Top header banner
  doc.setFillColor(30, 41, 59); // Slate-800
  doc.rect(0, 0, pageWidth, 28, 'F');

  // Title
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text(title, 14, 12);

  // Subtitle
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(203, 213, 225); // Slate-300
  doc.text(subtitle, 14, 19);

  // Generation timestamp & period on right
  doc.setFontSize(8);
  doc.setTextColor(226, 232, 240);
  const nowStr = formatLocalDate(new Date(), {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
  doc.text(`Generated: ${nowStr}`, pageWidth - 14, 12, { align: 'right' });
  doc.text(`Period: ${periodText}`, pageWidth - 14, 19, { align: 'right' });

  // Reset text color
  doc.setTextColor(30, 41, 59);
}

/**
 * Adds standard footer with page numbers
 */
function addPdfFooter(doc: jsPDF) {
  const totalPages = (doc.internal as any).getNumberOfPages();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setDrawColor(226, 232, 240);
    doc.line(14, pageHeight - 12, pageWidth - 14, pageHeight - 12);

    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184); // Slate-400
    doc.setFont('helvetica', 'normal');
    doc.text('Executive Report • Confidential', 14, pageHeight - 7);
    doc.text(`Page ${i} of ${totalPages}`, pageWidth - 14, pageHeight - 7, { align: 'right' });
  }
}

/**
 * 1. Monday Developer Workplan PDF Report
 */
export function generateMondayWorkplanPdf(mondayData: any) {
  if (!mondayData || !mondayData.developers) {
    throw new Error('No Monday workplan data available to generate PDF.');
  }

  const doc = new jsPDF('p', 'mm', 'a4') as jsPDFWithAutoTable;
  const dateStr =
    mondayData.dateStr ||
    formatLocalDate(new Date(), {
      weekday: 'long',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });

  addPdfHeader(
    doc,
    'MONDAY DEVELOPER WORKPLAN REPORT',
    'Executive Work Distribution & Task Planning',
    dateStr
  );

  let currentY = 35;

  // Executive Summary Card
  const totalActiveAll = mondayData.developers.reduce(
    (acc: number, d: any) => acc + (d.totalActive || 0),
    0
  );
  const totalDevs = mondayData.developers.length;

  autoTable(doc, {
    startY: currentY,
    head: [['Total Active Tasks', 'Team Members', 'Report Date', 'Execution Status']],
    body: [
      [
        `${totalActiveAll} Tasks`,
        `${totalDevs} Active Members`,
        dateStr,
        'Planning & In Progress',
      ],
    ],
    theme: 'grid',
    headStyles: {
      fillColor: [59, 130, 246], // Blue-500
      textColor: 255,
      fontStyle: 'bold',
      fontSize: 9,
    },
    bodyStyles: {
      fontSize: 9,
      fontStyle: 'bold',
      textColor: [30, 41, 59],
      cellPadding: 3.5,
    },
    margin: { left: 14, right: 14 },
  });

  currentY = (doc.lastAutoTable?.finalY || currentY) + 8;

  // Iterate over each developer
  mondayData.developers.forEach((dev: any) => {
    // Check if we need a page break
    if (currentY > 240) {
      doc.addPage();
      currentY = 20;
    }

    // Developer Section Header
    doc.setFillColor(241, 245, 249); // Slate-100
    doc.roundedRect(14, currentY, doc.internal.pageSize.getWidth() - 28, 8, 2, 2, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(30, 41, 59);
    doc.text(
      `${dev.name.toUpperCase()}  •  ${dev.totalActive} Active Items`,
      18,
      currentY + 5.5
    );

    currentY += 11;

    const taskRows: any[] = [];

    if (dev.ongoing && dev.ongoing.length > 0) {
      dev.ongoing.forEach((t: any) => {
        taskRows.push([
          'IN PROGRESS',
          t.title,
          `${Number(t.progress || 0).toFixed(0)}%`,
        ]);
      });
    }

    if (dev.carryOver && dev.carryOver.length > 0) {
      dev.carryOver.forEach((t: any) => {
        taskRows.push([
          'BACKLOG',
          t.title,
          `${Number(t.progress || 0).toFixed(0)}%`,
        ]);
      });
    }

    if (dev.activeToday && dev.activeToday.length > 0) {
      dev.activeToday.forEach((t: any) => {
        taskRows.push([
          'SCHEDULED',
          t.title,
          `${Number(t.progress || 0).toFixed(0)}%`,
        ]);
      });
    }

    if (taskRows.length === 0) {
      taskRows.push(['STATUS', 'No active tasks pending', '-']);
    }

    autoTable(doc, {
      startY: currentY,
      head: [['Category', 'Task Deliverable', 'Progress']],
      body: taskRows,
      theme: 'striped',
      headStyles: {
        fillColor: [71, 85, 105], // Slate-600
        textColor: 255,
        fontStyle: 'bold',
        fontSize: 8,
      },
      bodyStyles: {
        fontSize: 8,
        textColor: [51, 65, 85],
        cellPadding: 2.5,
      },
      columnStyles: {
        0: { cellWidth: 28, fontStyle: 'bold' },
        1: { cellWidth: 'auto' },
        2: { cellWidth: 24, halign: 'center' },
      },
      didParseCell: (data) => {
        if (data.section === 'body' && data.column.index === 0) {
          const val = data.cell.raw;
          if (val === 'IN PROGRESS') {
            data.cell.styles.textColor = [217, 119, 6]; // Amber-600
          } else if (val === 'BACKLOG') {
            data.cell.styles.textColor = [147, 51, 234]; // Purple-600
          } else if (val === 'SCHEDULED') {
            data.cell.styles.textColor = [37, 99, 235]; // Blue-600
          }
        }
      },
      margin: { left: 14, right: 14 },
    });

    currentY = (doc.lastAutoTable?.finalY || currentY) + 6;

    if (dev.blockers) {
      doc.setFont('helvetica', 'bolditalic');
      doc.setFontSize(8);
      doc.setTextColor(225, 29, 72); // Rose-600
      doc.text(`Blocker Note: ${dev.blockers}`, 16, currentY);
      currentY += 5;
    }

    currentY += 3;
  });

  addPdfFooter(doc);
  const fileName = `monday_workplan_${getLocalDateParts(new Date()).dateStr}.pdf`;
  doc.save(fileName);
}

/**
 * 2. Saturday / Weekly / Monthly Progress PDF Report
 */
export function generateSaturdayProgressPdf(saturdayData: any) {
  if (!saturdayData || !saturdayData.developers) {
    throw new Error('No progress report data available to generate PDF.');
  }

  const doc = new jsPDF('p', 'mm', 'a4') as jsPDFWithAutoTable;
  const isMonthly = saturdayData.isMonthly;
  const reportTitle = isMonthly
    ? 'MONTHLY EXECUTIVE PERFORMANCE REPORT'
    : 'WEEKLY PROGRESS & COMPLETION REPORT';

  addPdfHeader(
    doc,
    reportTitle,
    'Team Deliverables, Productivity Scores & Metrics Breakdown',
    saturdayData.periodTitle || 'Weekly'
  );

  let currentY = 35;

  // Key KPI Overview Table
  autoTable(doc, {
    startY: currentY,
    head: [
      [
        'Total Deliverables',
        'Completed Tasks',
        'In Progress',
        'Pending',
        'Team Completion',
        'Productivity Score',
      ],
    ],
    body: [
      [
        `${saturdayData.totalTasks} Items`,
        `${saturdayData.completedTasks} Done`,
        `${saturdayData.inProgressTasks} In Prog`,
        `${saturdayData.pendingTasks} Pend`,
        `${saturdayData.overallTeamCompletionRate}%`,
        `${saturdayData.overallTeamProductivity}%`,
      ],
    ],
    theme: 'grid',
    headStyles: {
      fillColor: [16, 185, 129], // Emerald-500
      textColor: 255,
      fontStyle: 'bold',
      fontSize: 8.5,
      halign: 'center',
    },
    bodyStyles: {
      fontSize: 8.5,
      fontStyle: 'bold',
      textColor: [30, 41, 59],
      cellPadding: 3,
      halign: 'center',
    },
    margin: { left: 14, right: 14 },
  });

  currentY = (doc.lastAutoTable?.finalY || currentY) + 8;

  // Team Summary Table
  const teamSummaryRows = saturdayData.developers.map((d: any) => [
    d.name,
    d.totalTasks,
    d.completedTasks.length,
    d.inProgressTasks.length,
    d.pendingTasks.length,
    d.meetings.length,
    `${d.completionRate}%`,
    `${d.productivityScore}%`,
  ]);

  autoTable(doc, {
    startY: currentY,
    head: [
      [
        'Team Member',
        'Total',
        'Completed',
        'In Progress',
        'Pending',
        'Meetings',
        'Completion Rate',
        'Score',
      ],
    ],
    body: teamSummaryRows,
    theme: 'striped',
    headStyles: {
      fillColor: [30, 41, 59], // Slate-800
      textColor: 255,
      fontStyle: 'bold',
      fontSize: 8,
    },
    bodyStyles: {
      fontSize: 8,
      textColor: [51, 65, 85],
      cellPadding: 2.5,
    },
    columnStyles: {
      0: { fontStyle: 'bold' },
      1: { halign: 'center' },
      2: { halign: 'center', textColor: [16, 185, 129] },
      3: { halign: 'center', textColor: [217, 119, 6] },
      4: { halign: 'center', textColor: [100, 116, 139] },
      5: { halign: 'center' },
      6: { halign: 'center', fontStyle: 'bold', textColor: [37, 99, 235] },
      7: { halign: 'center', fontStyle: 'bold' },
    },
    margin: { left: 14, right: 14 },
  });

  currentY = (doc.lastAutoTable?.finalY || currentY) + 8;

  // Detailed Tasks Per Developer
  saturdayData.developers.forEach((dev: any) => {
    if (currentY > 235) {
      doc.addPage();
      currentY = 20;
    }

    doc.setFillColor(241, 245, 249);
    doc.roundedRect(14, currentY, doc.internal.pageSize.getWidth() - 28, 8, 2, 2, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(30, 41, 59);
    doc.text(
      `${dev.name.toUpperCase()}  —  ${dev.completionRate}% Done (Score: ${dev.productivityScore}%)`,
      18,
      currentY + 5.5
    );

    currentY += 10;

    const taskRows: any[] = [];

    dev.completedTasks.forEach((t: any) => {
      taskRows.push(['DONE', t.title, '100%']);
    });

    dev.inProgressTasks.forEach((t: any) => {
      taskRows.push([
        'IN PROGRESS',
        t.title,
        `${Number(t.progress || 0).toFixed(0)}%`,
      ]);
    });

    dev.pendingTasks.forEach((t: any) => {
      taskRows.push([
        'PENDING',
        t.title,
        '0%',
      ]);
    });

    if (taskRows.length === 0) {
      taskRows.push(['-', 'No individual tasks recorded', '-']);
    }

    autoTable(doc, {
      startY: currentY,
      head: [['Status', 'Deliverable Title', 'Progress %']],
      body: taskRows,
      theme: 'striped',
      headStyles: {
        fillColor: [100, 116, 139],
        textColor: 255,
        fontStyle: 'bold',
        fontSize: 7.5,
      },
      bodyStyles: {
        fontSize: 7.5,
        textColor: [51, 65, 85],
        cellPadding: 2,
      },
      columnStyles: {
        0: { cellWidth: 26, fontStyle: 'bold' },
        1: { cellWidth: 'auto' },
        2: { cellWidth: 24, halign: 'center' },
      },
      didParseCell: (data) => {
        if (data.section === 'body' && data.column.index === 0) {
          const val = data.cell.raw;
          if (val === 'DONE') data.cell.styles.textColor = [16, 185, 129];
          else if (val === 'IN PROGRESS') data.cell.styles.textColor = [217, 119, 6];
          else if (val === 'PENDING') data.cell.styles.textColor = [100, 116, 139];
        }
      },
      margin: { left: 14, right: 14 },
    });

    currentY = (doc.lastAutoTable?.finalY || currentY) + 6;
  });

  addPdfFooter(doc);
  const fileName = `${isMonthly ? 'monthly' : 'weekly'}_progress_report_${new Date().toISOString().split('T')[0]}.pdf`;
  doc.save(fileName);
}

/**
 * 3. Monthly Consolidated Task & Performance PDF Report
 */
export function generateMonthlyReportPdf(
  reportData: any,
  selectedMonthName: string,
  selectedYear: number,
  memberFilterName: string = 'All Members'
) {
  if (!reportData || !reportData.tasks) {
    throw new Error('No monthly report data available to generate PDF.');
  }

  const doc = new jsPDF('p', 'mm', 'a4') as jsPDFWithAutoTable;
  const periodText = `${selectedMonthName} ${selectedYear} (${memberFilterName})`;

  addPdfHeader(
    doc,
    'MONTHLY CONSOLIDATED TASK REPORT',
    'Comprehensive Deliverable Breakdown & Monthly Productivity Log',
    periodText
  );

  let currentY = 35;

  // Key Summary Card Table
  if (reportData.summary) {
    const s = reportData.summary;
    autoTable(doc, {
      startY: currentY,
      head: [
        [
          'Total Deliverables',
          'Completed Tasks',
          'In Progress Tasks',
          'Pending Backlog',
          'Completion Rate',
          'Avg Productivity',
        ],
      ],
      body: [
        [
          `${s.totalTasks} Tasks`,
          `${s.completedTasks} Done`,
          `${s.inProgressTasks} In Prog`,
          `${s.pendingTasks} Backlog`,
          `${reportData.summary.completionRate || ((s.totalTasks > 0 ? (s.completedTasks / s.totalTasks) * 100 : 0).toFixed(1))}%`,
          `${s.averageProductivity || '0.00'}%`,
        ],
      ],
      theme: 'grid',
      headStyles: {
        fillColor: [59, 130, 246], // Blue-500
        textColor: 255,
        fontStyle: 'bold',
        fontSize: 8,
        halign: 'center',
      },
      bodyStyles: {
        fontSize: 8,
        fontStyle: 'bold',
        textColor: [30, 41, 59],
        cellPadding: 3,
        halign: 'center',
      },
      margin: { left: 14, right: 14 },
    });

    currentY = (doc.lastAutoTable?.finalY || currentY) + 8;
  }

  // Developer Summary Breakdown (if multiple users)
  if (reportData.userSummaries && reportData.userSummaries.length > 0) {
    const userSummaryRows = reportData.userSummaries.map((u: any) => [
      u.name,
      u.totalTasks,
      u.completedTasks,
      u.inProgressTasks,
      `${u.completionRate || 0}%`,
      `${u.avgProductivity || '0.00'}%`,
    ]);

    autoTable(doc, {
      startY: currentY,
      head: [['Member Name', 'Total Tasks', 'Completed', 'In Progress', 'Completion Rate', 'Avg Productivity']],
      body: userSummaryRows,
      theme: 'striped',
      headStyles: {
        fillColor: [71, 85, 105], // Slate-600
        textColor: 255,
        fontStyle: 'bold',
        fontSize: 8,
      },
      bodyStyles: {
        fontSize: 8,
        textColor: [51, 65, 85],
        cellPadding: 2.5,
      },
      columnStyles: {
        0: { fontStyle: 'bold' },
        1: { halign: 'center' },
        2: { halign: 'center', textColor: [16, 185, 129] },
        3: { halign: 'center', textColor: [217, 119, 6] },
        4: { halign: 'center', fontStyle: 'bold', textColor: [37, 99, 235] },
        5: { halign: 'center', fontStyle: 'bold' },
      },
      margin: { left: 14, right: 14 },
    });

    currentY = (doc.lastAutoTable?.finalY || currentY) + 8;
  }

  // Full Task Listing Table
  const taskRows = reportData.tasks.map((t: any) => [
    formatLocalDate(t.date, { month: 'short', day: 'numeric' }),
    t.userName,
    t.title,
    t.status === 'DONE' ? 'DONE' : 'IN PROGRESS',
    `${Number(t.progress || 0).toFixed(0)}%`,
  ]);

  autoTable(doc, {
    startY: currentY,
    head: [['Date', 'Member', 'Deliverable Title', 'Status', 'Progress']],
    body: taskRows,
    theme: 'striped',
    headStyles: {
      fillColor: [30, 41, 59],
      textColor: 255,
      fontStyle: 'bold',
      fontSize: 8,
    },
    bodyStyles: {
      fontSize: 7.5,
      textColor: [51, 65, 85],
      cellPadding: 2,
    },
    columnStyles: {
      0: { cellWidth: 20 },
      1: { cellWidth: 32, fontStyle: 'bold' },
      2: { cellWidth: 'auto' },
      3: { cellWidth: 24, halign: 'center' },
      4: { cellWidth: 20, halign: 'center', fontStyle: 'bold' },
    },
    didParseCell: (data) => {
      if (data.section === 'body' && data.column.index === 3) {
        const val = data.cell.raw;
        if (val === 'DONE') data.cell.styles.textColor = [16, 185, 129];
        else data.cell.styles.textColor = [217, 119, 6];
      }
    },
    margin: { left: 14, right: 14 },
  });

  addPdfFooter(doc);
  const fileName = `monthly_report_${selectedYear}_${selectedMonthName.toLowerCase()}.pdf`;
  doc.save(fileName);
}

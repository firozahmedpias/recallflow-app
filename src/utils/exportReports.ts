import { ExamResult, RevisionSchedule, Session, Subject, Topic } from '../types/study';
import { getTodayISO } from './dates';
import { getTopicStudyStatus } from './studyStatus';

export interface TopicExportRow {
  subject: string;
  topic: string;
  studyDate: string;
  studyStatus: string;
  studiedDate: string;
  revisionsDone: string;
  nextRevision: string;
  examMark: string;
}

export interface SubjectExportSummary {
  subjectName: string;
  totalTopics: number;
  topicsCompleted: number;
  revisionsDone: number;
  revisionsPending: number;
  avgExamPercent: number | null;
}

/**
 * Formats a clean per-topic export row matching the required schema:
 * Subject, Topic, Study Date, Study Status, Studied Date, Revisions Done, Next Revision, Exam Mark
 */
export function buildTopicExportRows(
  subjects: Subject[],
  topics: Topic[],
  revisions: RevisionSchedule[],
  exams: ExamResult[],
  sessions: Session[],
  onlySubjectId?: string
): { rows: TopicExportRow[]; summaries: SubjectExportSummary[] } {
  const todayISO = getTodayISO();
  const targetSubjects = onlySubjectId
    ? subjects.filter((s) => s.id === onlySubjectId)
    : subjects;

  const revisionsByTopic = new Map<string, RevisionSchedule[]>();
  for (const rev of revisions) {
    const arr = revisionsByTopic.get(rev.topicId) || [];
    arr.push(rev);
    revisionsByTopic.set(rev.topicId, arr);
  }

  const examsByTopic = new Map<string, ExamResult[]>();
  const examsBySubject = new Map<string, ExamResult[]>();
  for (const exam of exams) {
    if (exam.topicId) {
      const tArr = examsByTopic.get(exam.topicId) || [];
      tArr.push(exam);
      examsByTopic.set(exam.topicId, tArr);
    }
    const sArr = examsBySubject.get(exam.subjectId) || [];
    sArr.push(exam);
    examsBySubject.set(exam.subjectId, sArr);
  }

  const rows: TopicExportRow[] = [];
  const summaries: SubjectExportSummary[] = [];

  for (const subject of targetSubjects) {
    const subjTopics = topics
      .filter((t) => t.subjectId === subject.id)
      .sort((a, b) => b.studyDate.localeCompare(a.studyDate));

    let subjRevsDone = 0;
    let subjRevsPending = 0;
    let subjTopicsCompleted = 0;

    const subjExams = examsBySubject.get(subject.id) || [];
    const avgExamPercent =
      subjExams.length > 0
        ? Math.round(
            subjExams.reduce(
              (sum, ex) =>
                sum + (ex.totalMarks > 0 ? (ex.marksObtained / ex.totalMarks) * 100 : 0),
              0
            ) / subjExams.length
          )
        : null;

    for (const topic of subjTopics) {
      const studyStatus = getTopicStudyStatus(topic, sessions, todayISO);
      const revs = (revisionsByTopic.get(topic.id) || []).sort(
        (a, b) => a.stepDay - b.stepDay
      );
      const doneCount = revs.filter((r) => r.status === 'done').length;
      const pendingRevs = revs
        .filter((r) => r.status !== 'done')
        .sort((a, b) => a.dueDate.localeCompare(b.dueDate));

      subjRevsDone += doneCount;
      subjRevsPending += pendingRevs.length;
      if (revs.length > 0 && pendingRevs.length === 0) {
        subjTopicsCompleted += 1;
      }

      const nextRev = pendingRevs[0];
      const nextRevisionText = nextRev
        ? `${nextRev.dueDate} (Day ${nextRev.stepDay})`
        : revs.length > 0
          ? 'Completed'
          : 'None';

      const topicExams = (examsByTopic.get(topic.id) || []).sort((a, b) =>
        b.date.localeCompare(a.date)
      );
      let examMarkText = '—';
      if (topicExams.length > 0) {
        const latest = topicExams[0];
        const pct =
          latest.totalMarks > 0
            ? Math.round((latest.marksObtained / latest.totalMarks) * 100)
            : 0;
        examMarkText = `${latest.marksObtained}/${latest.totalMarks} (${pct}%)`;
      } else if (avgExamPercent !== null) {
        examMarkText = `Subj avg ${avgExamPercent}%`;
      }

      rows.push({
        subject: subject.name,
        topic: topic.name,
        studyDate: topic.studyDate,
        studyStatus: studyStatus.label,
        studiedDate: studyStatus.studiedDate || '—',
        revisionsDone: `${doneCount}/${revs.length}`,
        nextRevision: nextRevisionText,
        examMark: examMarkText,
      });
    }

    if (subjTopics.length === 0) {
      rows.push({
        subject: subject.name,
        topic: '(No topics logged)',
        studyDate: '—',
        studyStatus: '—',
        studiedDate: '—',
        revisionsDone: '0/0',
        nextRevision: '—',
        examMark: avgExamPercent !== null ? `Subj avg ${avgExamPercent}%` : '—',
      });
    }

    summaries.push({
      subjectName: subject.name,
      totalTopics: subjTopics.length,
      topicsCompleted: subjTopicsCompleted,
      revisionsDone: subjRevsDone,
      revisionsPending: subjRevsPending,
      avgExamPercent,
    });
  }

  return { rows, summaries };
}

function escapeCSVField(value: string): string {
  const str = String(value ?? '');
  if (/[",\r\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function triggerBlobDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.rel = 'noopener';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.setTimeout(() => {
    URL.revokeObjectURL(url);
  }, 4000);
}

export function slugifyFilename(name: string): string {
  return (
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'subjects'
  );
}

export function downloadTopicsCSV(filename: string, rows: TopicExportRow[]): void {
  const headers = [
    'Subject',
    'Topic',
    'Study Date',
    'Study Status',
    'Studied Date',
    'Revisions Done',
    'Next Revision',
    'Exam Mark',
  ];

  const lines = [
    headers.map(escapeCSVField).join(','),
    ...rows.map((r) =>
      [
        r.subject,
        r.topic,
        r.studyDate,
        r.studyStatus,
        r.studiedDate,
        r.revisionsDone,
        r.nextRevision,
        r.examMark,
      ]
        .map(escapeCSVField)
        .join(',')
    ),
  ];

  // UTF-8 BOM ensures Excel & mobile spreadsheet apps parse characters properly
  const csvContent = '\uFEFF' + lines.join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  triggerBlobDownload(blob, filename);
}

/**
 * Sanitizes text to printable WinAnsi ASCII for PDF Type1 Helvetica font
 */
function sanitizePdfText(input: string, maxLen?: number): string {
  const ascii = String(input ?? '')
    .replace(/[\u2014\u2013]/g, '-')
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/\u00B7/g, '|')
    .replace(/[^\x20-\x7E]/g, ' ');
  if (maxLen && ascii.length > maxLen) {
    return ascii.slice(0, Math.max(1, maxLen - 3)) + '...';
  }
  return ascii;
}

function escapePdfLiteral(text: string): string {
  return text.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
}

/**
 * Generates a valid multi-page PDF 1.4 document offline in pure TypeScript.
 * Works cleanly on desktop and mobile Android browsers/WebViews without popups.
 */
export function downloadTopicsPDF(
  filename: string,
  reportTitle: string,
  summaries: SubjectExportSummary[],
  rows: TopicExportRow[]
): void {
  // A4 Landscape: 842 x 595 pt for 8-column table fit
  const pageWidth = 842;
  const pageHeight = 595;
  const marginX = 28;
  const topY = pageHeight - 36;
  const bottomY = 36;

  const pages: string[][] = [];
  let currentOps: string[] = [];
  let y = topY;

  const startNewPage = (isFirstPage: boolean) => {
    if (currentOps.length > 0) {
      pages.push(currentOps);
    }
    currentOps = [];
    y = topY;

    if (isFirstPage) {
      currentOps.push(
        `BT /F2 15 Tf ${marginX} ${y} Td (${escapePdfLiteral(sanitizePdfText(reportTitle, 80))}) Tj ET`
      );
      y -= 17;
      const dateStr = `Generated ${new Date().toLocaleDateString()} | ${rows.length} ${rows.length === 1 ? 'entry' : 'entries'}`;
      currentOps.push(
        `0.4 0.45 0.52 rg BT /F1 9 Tf ${marginX} ${y} Td (${escapePdfLiteral(sanitizePdfText(dateStr))}) Tj ET 0 0 0 rg`
      );
      y -= 17;
    } else {
      currentOps.push(
        `0.4 0.45 0.52 rg BT /F1 9 Tf ${marginX} ${y} Td (${escapePdfLiteral(sanitizePdfText(reportTitle + ' (continued)', 82))}) Tj ET 0 0 0 rg`
      );
      y -= 17;
    }
  };

  const ensureSpace = (neededHeight: number) => {
    if (y - neededHeight < bottomY) {
      startNewPage(false);
    }
  };

  const drawTableHeader = () => {
    ensureSpace(26);
    currentOps.push(
      `0.93 0.95 0.98 rg ${marginX} ${y - 14} ${pageWidth - marginX * 2} 18 re f 0.1 0.12 0.18 rg`
    );
    const cols = [
      { x: marginX + 6, label: 'Subject' },
      { x: marginX + 100, label: 'Topic' },
      { x: marginX + 270, label: 'Study Date' },
      { x: marginX + 342, label: 'Study Status' },
      { x: marginX + 422, label: 'Studied Date' },
      { x: marginX + 498, label: 'Revisions' },
      { x: marginX + 564, label: 'Next Revision' },
      { x: marginX + 682, label: 'Exam Mark' },
    ];
    for (const c of cols) {
      currentOps.push(
        `BT /F2 8.5 Tf ${c.x} ${y - 9} Td (${escapePdfLiteral(c.label)}) Tj ET`
      );
    }
    currentOps.push('0 0 0 rg');
    y -= 22;
  };

  startNewPage(true);

  if (summaries.length > 0) {
    currentOps.push(
      `BT /F2 11 Tf ${marginX} ${y} Td (Subject Progress Summary) Tj ET`
    );
    y -= 15;

    for (const s of summaries) {
      ensureSpace(16);
      const examPart =
        s.avgExamPercent !== null ? ` | Avg Exam: ${s.avgExamPercent}%` : '';
      const line = `${s.subjectName}: ${s.totalTopics} topics (${s.topicsCompleted} completed) | Revisions: ${s.revisionsDone} done, ${s.revisionsPending} pending${examPart}`;
      currentOps.push(
        `0.2 0.24 0.32 rg BT /F1 9 Tf ${marginX + 4} ${y} Td (${escapePdfLiteral(sanitizePdfText(line, 122))}) Tj ET 0 0 0 rg`
      );
      y -= 13;
    }
    y -= 10;
  }

  drawTableHeader();

  rows.forEach((row, idx) => {
    if (y - 18 < bottomY) {
      startNewPage(false);
      drawTableHeader();
    }

    if (idx % 2 === 1) {
      currentOps.push(
        `0.97 0.98 0.99 rg ${marginX} ${y - 12} ${pageWidth - marginX * 2} 16 re f`
      );
    }

    currentOps.push('0.12 0.15 0.22 rg');
    const cells = [
      { x: marginX + 6, val: sanitizePdfText(row.subject, 16) },
      { x: marginX + 100, val: sanitizePdfText(row.topic, 30) },
      { x: marginX + 270, val: sanitizePdfText(row.studyDate, 12) },
      { x: marginX + 342, val: sanitizePdfText(row.studyStatus, 13) },
      { x: marginX + 422, val: sanitizePdfText(row.studiedDate, 12) },
      { x: marginX + 498, val: sanitizePdfText(row.revisionsDone, 10) },
      { x: marginX + 564, val: sanitizePdfText(row.nextRevision, 21) },
      { x: marginX + 682, val: sanitizePdfText(row.examMark, 18) },
    ];
    for (const cell of cells) {
      currentOps.push(
        `BT /F1 8.5 Tf ${cell.x} ${y - 7} Td (${escapePdfLiteral(cell.val)}) Tj ET`
      );
    }
    currentOps.push(
      `0.88 0.9 0.94 RG 0.5 w ${marginX} ${y - 12} m ${pageWidth - marginX} ${y - 12} l S 0 0 0 rg`
    );
    y -= 17;
  });

  if (currentOps.length > 0) {
    pages.push(currentOps);
  }

  const objects: string[] = [];
  objects.push('1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n');

  const pageObjNums: number[] = [];
  for (let i = 0; i < pages.length; i++) {
    pageObjNums.push(5 + i * 2);
  }

  objects.push(
    `2 0 obj\n<< /Type /Pages /Kids [${pageObjNums.map((n) => `${n} 0 R`).join(' ')}] /Count ${pages.length} >>\nendobj\n`
  );
  objects.push(
    '3 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n'
  );
  objects.push(
    '4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>\nendobj\n'
  );

  for (let i = 0; i < pages.length; i++) {
    const pageNum = 5 + i * 2;
    const contentNum = pageNum + 1;
    const stream = pages[i].join('\n');
    objects.push(
      `${pageNum} 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${contentNum} 0 R >>\nendobj\n`
    );
    objects.push(
      `${contentNum} 0 obj\n<< /Length ${stream.length} >>\nstream\n${stream}\nendstream\nendobj\n`
    );
  }

  const header = '%PDF-1.4\n';
  let body = '';
  const offsets: number[] = [];
  let cursor = header.length;

  for (const obj of objects) {
    offsets.push(cursor);
    body += obj;
    cursor += obj.length;
  }

  const xrefStart = cursor;
  let xref = `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (const offset of offsets) {
    xref += `${String(offset).padStart(10, '0')} 00000 n \n`;
  }
  const trailer = `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF`;

  const pdfBytes = new TextEncoder().encode(header + body + xref + trailer);
  const blob = new Blob([pdfBytes], { type: 'application/pdf' });
  triggerBlobDownload(blob, filename);
}

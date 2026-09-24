/** Problem reports on lesson steps: the reasons and limits the server accepts. Pure. */

export type ReportReason = 'answer' | 'typo' | 'chart' | 'unclear' | 'other';

export const REPORT_REASONS: { id: ReportReason; label: string }[] = [
  { id: 'answer', label: 'جواب درست اشتباهه' }, // i18n-ignore: translated where shown
  { id: 'typo', label: 'غلط تایپی یا نگارشی داره' }, // i18n-ignore: translated where shown
  { id: 'chart', label: 'نمودار درست نیست' }, // i18n-ignore: translated where shown
  { id: 'unclear', label: 'متن گنگه یا ناقصه' }, // i18n-ignore: translated where shown
  { id: 'other', label: 'یه مشکل دیگه' }, // i18n-ignore: translated where shown
];

export const MAX_REPORT_MESSAGE = 500;
/** Reports kept on the device while offline. */
export const MAX_QUEUED = 20;

export type Report = { lesson: string; step: number; stepType: string; reason: ReportReason; message: string };

/** A session step's ref ("cd-2:3") as the lesson and the step's index in it. */
export function parseStepRef(ref: string): { lesson: string; step: number } | null {
  const m = /^([a-z0-9-]{1,80}):(\d{1,3})$/.exec(ref);
  return m ? { lesson: m[1], step: Number(m[2]) } : null;
}

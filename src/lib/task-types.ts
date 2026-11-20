/** Task vocabulary, safe to import from client components. */

export const TASK_TYPES = [
  { value: 'FOLLOW_UP', label: 'Follow up' },
  { value: 'CALL', label: 'Call' },
  { value: 'WHATSAPP', label: 'WhatsApp' },
  { value: 'SMS', label: 'SMS' },
  { value: 'SITE_VISIT', label: 'Site visit' },
  { value: 'DOCUMENT', label: 'Document' },
  { value: 'PAYMENT', label: 'Payment' },
] as const;

export type TaskType = (typeof TASK_TYPES)[number]['value'];

export const TASK_PRIORITIES = ['LOW', 'NORMAL', 'HIGH'] as const;
export type TaskPriority = (typeof TASK_PRIORITIES)[number];

export function isTaskType(value: string): value is TaskType {
  return TASK_TYPES.some((type) => type.value === value);
}

export function taskTypeLabel(value: string): string {
  return TASK_TYPES.find((type) => type.value === value)?.label ?? value;
}

export const TASK_TYPE_STYLES: Record<TaskType, string> = {
  FOLLOW_UP: 'bg-sky-50 text-sky-700 border-sky-200',
  CALL: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  WHATSAPP: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  SMS: 'bg-teal-50 text-teal-700 border-teal-200',
  SITE_VISIT: 'bg-violet-50 text-violet-700 border-violet-200',
  DOCUMENT: 'bg-amber-50 text-amber-700 border-amber-200',
  PAYMENT: 'bg-orange-50 text-orange-700 border-orange-200',
};

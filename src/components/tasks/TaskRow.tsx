'use client';

import { Check, Clock, MapPin, User } from 'lucide-react';
import { dueLabel, isOverdue } from '@/lib/format';
import { TASK_TYPE_STYLES, taskTypeLabel, type TaskType } from '@/lib/task-types';

export interface TaskItem {
  id: string;
  title: string;
  type: string;
  dueAt: string;
  doneAt: string | null;
  priority: string;
  lead?: {
    id: string;
    stage: string;
    contact: { id: string; name: string; phone: string };
    plot?: { id: string; title: string } | null;
  } | null;
  plot?: { id: string; title: string } | null;
}

interface TaskRowProps {
  task: TaskItem;
  onToggle: (task: TaskItem) => void;
  onSnooze: (task: TaskItem) => void;
  onOpenLead?: (leadId: string) => void;
}

export default function TaskRow({ task, onToggle, onSnooze, onOpenLead }: TaskRowProps) {
  const overdue = !task.doneAt && isOverdue(task.dueAt);
  const style = TASK_TYPE_STYLES[task.type as TaskType] || TASK_TYPE_STYLES.FOLLOW_UP;

  return (
    <div
      className={`flex items-start gap-3 bg-white border rounded-2xl px-3.5 py-3 shadow-sm ${
        overdue ? 'border-rose-200' : 'border-slate-200'
      }`}
    >
      <button
        type="button"
        onClick={() => onToggle(task)}
        aria-label={task.doneAt ? 'Reopen task' : 'Complete task'}
        className={`w-11 h-11 -m-1 flex items-center justify-center rounded-xl flex-shrink-0 touch-manipulation ${
          task.doneAt ? 'text-emerald-600' : 'text-slate-300 hover:text-emerald-600'
        }`}
      >
        <span
          className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center ${
            task.doneAt ? 'bg-emerald-600 border-emerald-600' : 'border-slate-300'
          }`}
        >
          {task.doneAt ? <Check className="w-4 h-4 text-white" /> : null}
        </span>
      </button>

      <div className="min-w-0 flex-1">
        <p
          className={`text-sm font-semibold leading-snug ${
            task.doneAt ? 'text-slate-400 line-through' : 'text-slate-900'
          }`}
        >
          {task.title}
        </p>

        <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
          <span className={`text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-md border ${style}`}>
            {taskTypeLabel(task.type)}
          </span>
          <span
            className={`text-[11px] font-medium ${
              overdue ? 'text-rose-600' : 'text-slate-500'
            }`}
          >
            {dueLabel(task.dueAt)}
          </span>
        </div>

        {task.lead && (
          <div className="flex items-center gap-2 mt-1.5 text-[11px] text-slate-500 min-w-0">
            <button
              type="button"
              onClick={() => onOpenLead?.(task.lead!.id)}
              className="flex items-center gap-1 font-semibold text-sky-700 hover:text-sky-900 min-w-0 touch-manipulation"
            >
              <User className="w-3 h-3 flex-shrink-0" />
              <span className="truncate">{task.lead.contact.name}</span>
            </button>
            {task.lead.plot && (
              <span className="flex items-center gap-1 min-w-0">
                <MapPin className="w-3 h-3 flex-shrink-0" />
                <span className="truncate">{task.lead.plot.title}</span>
              </span>
            )}
          </div>
        )}

        {!task.lead && task.plot && (
          <span className="flex items-center gap-1 mt-1.5 text-[11px] text-slate-500">
            <MapPin className="w-3 h-3" />
            {task.plot.title}
          </span>
        )}
      </div>

      {!task.doneAt && (
        <button
          type="button"
          onClick={() => onSnooze(task)}
          title="Snooze to tomorrow"
          aria-label="Snooze to tomorrow"
          className="w-11 h-11 -m-1 flex items-center justify-center rounded-xl text-slate-400 hover:text-sky-600 flex-shrink-0 touch-manipulation"
        >
          <Clock className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}

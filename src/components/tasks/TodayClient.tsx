'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CalendarDays, CheckCircle2, Loader2, Plus } from 'lucide-react';
import TaskRow, { type TaskItem } from './TaskRow';
import LeadDetailSheet from '@/components/leads/LeadDetailSheet';
import { triggerHaptic } from '@/lib/haptics';
import { toDateTimeInput } from '@/lib/format';
import { TASK_TYPES } from '@/lib/task-types';

interface Summary {
  open: number;
  overdue: number;
  today: number;
  upcoming: number;
}

function startOfToday(): number {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
}

function defaultDue(): string {
  const now = new Date();
  const slot = new Date(now);
  if (now.getHours() >= 17) {
    slot.setDate(slot.getDate() + 1);
    slot.setHours(9, 0, 0, 0);
  } else {
    slot.setHours(17, 0, 0, 0);
  }
  return toDateTimeInput(slot);
}

export default function TodayClient() {
  const router = useRouter();
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState('');
  const [type, setType] = useState('FOLLOW_UP');
  const [dueAt, setDueAt] = useState(defaultDue);
  const [saving, setSaving] = useState(false);
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const fetchTasks = useCallback(async () => {
    try {
      const res = await fetch('/api/tasks');
      if (res.status === 401) {
        router.replace('/login');
        return;
      }
      if (res.ok) {
        const data = await res.json();
        setTasks(data.tasks || []);
        setSummary(data.summary || null);
      }
    } catch (err) {
      console.error('Fetch tasks error:', err);
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  const groups = useMemo(() => {
    const dayStart = startOfToday();
    const dayEnd = dayStart + 86_400_000;
    const weekEnd = dayStart + 8 * 86_400_000;

    const bucket = { overdue: [] as TaskItem[], today: [] as TaskItem[], week: [] as TaskItem[], later: [] as TaskItem[] };

    for (const task of tasks) {
      const due = new Date(task.dueAt).getTime();
      if (due < dayStart) bucket.overdue.push(task);
      else if (due < dayEnd) bucket.today.push(task);
      else if (due < weekEnd) bucket.week.push(task);
      else bucket.later.push(task);
    }

    return bucket;
  }, [tasks]);

  const showToast = (message: string) => {
    setToast(message);
    setTimeout(() => setToast(null), 3000);
  };

  const addTask = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!title.trim()) return;

    setSaving(true);
    try {
      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: title.trim(), type, dueAt }),
      });
      const data = await res.json();
      if (res.ok) {
        setTasks((current) => [data.task, ...current]);
        setTitle('');
        triggerHaptic('success');
        fetchTasks();
      } else {
        showToast(data.error || 'Could not add the task');
      }
    } finally {
      setSaving(false);
    }
  };

  const toggleTask = async (task: TaskItem) => {
    const completed = !task.doneAt;
    setTasks((current) => current.filter((item) => item.id !== task.id));

    try {
      const res = await fetch(`/api/tasks/${task.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ done: completed }),
      });
      if (res.ok) {
        triggerHaptic('light');
        fetchTasks();
      } else {
        showToast('Could not update the task');
        fetchTasks();
      }
    } catch {
      showToast('Network error');
      fetchTasks();
    }
  };

  const snooze = async (task: TaskItem) => {
    const next = new Date(task.dueAt);
    next.setDate(next.getDate() + 1);
    setTasks((current) =>
      current.map((item) =>
        item.id === task.id ? { ...item, dueAt: next.toISOString() } : item
      )
    );

    try {
      const res = await fetch(`/api/tasks/${task.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dueAt: next.toISOString() }),
      });
      if (res.ok) {
        triggerHaptic('light');
        fetchTasks();
      } else {
        showToast('Could not snooze the task');
        fetchTasks();
      }
    } catch {
      showToast('Network error');
      fetchTasks();
    }
  };

  const sections: Array<{ key: keyof typeof groups; label: string; accent: string }> = [
    { key: 'overdue', label: 'Overdue', accent: 'text-rose-600' },
    { key: 'today', label: 'Today', accent: 'text-slate-900' },
    { key: 'week', label: 'Next 7 days', accent: 'text-slate-700' },
    { key: 'later', label: 'Later', accent: 'text-slate-500' },
  ];

  return (
    <>
      <div className="mb-5">
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">Today</h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
          {summary
            ? `${summary.overdue} overdue · ${summary.today} due today · ${summary.open} open in total`
            : 'Your follow-ups for the day'}
        </p>
      </div>

      {/* Quick add */}
      <form
        onSubmit={addTask}
        className="bg-white border border-slate-200 rounded-2xl p-3 mb-6 shadow-sm space-y-2.5"
      >
        <div className="flex gap-2">
          <input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Follow up with Peter about the Ngong plot"
            aria-label="Task title"
            className="flex-1 px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-base text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500/40 focus:border-sky-400 min-w-0"
          />
          <button
            type="submit"
            disabled={saving || !title.trim()}
            className="w-11 h-11 rounded-xl bg-sky-600 hover:bg-sky-700 text-white flex items-center justify-center flex-shrink-0 disabled:opacity-40 touch-manipulation"
            aria-label="Add task"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-5 h-5" />}
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={type}
            onChange={(event) => setType(event.target.value)}
            aria-label="Task type"
            className="px-2.5 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs font-semibold text-slate-700 focus:outline-none min-h-[38px]"
          >
            {TASK_TYPES.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>

          <input
            type="datetime-local"
            value={dueAt}
            onChange={(event) => setDueAt(event.target.value)}
            aria-label="Due date"
            className="px-2.5 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs font-semibold text-slate-700 focus:outline-none min-h-[38px]"
          />
        </div>
      </form>

      {loading ? (
        <div className="py-24 flex flex-col items-center gap-3 text-slate-400">
          <Loader2 className="w-6 h-6 animate-spin" />
          <span className="text-xs">Loading your day…</span>
        </div>
      ) : tasks.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-3xl p-10 text-center shadow-sm">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-3">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-slate-900">Nothing scheduled</h3>
          <p className="text-xs text-slate-500 mt-1.5 max-w-xs mx-auto leading-relaxed">
            Add follow-ups from a lead, or use the box above. A lead cannot move forward
            without one.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {sections.map((section) => {
            const items = groups[section.key];
            if (items.length === 0) return null;

            return (
              <section key={section.key}>
                <div className="flex items-center justify-between mb-2 px-0.5">
                  <h2 className={`text-[11px] font-bold uppercase tracking-wider ${section.accent}`}>
                    {section.label}
                  </h2>
                  <span className="text-[11px] font-semibold text-slate-400">{items.length}</span>
                </div>
                <div className="space-y-2">
                  {items.map((task) => (
                    <TaskRow
                      key={task.id}
                      task={task}
                      onToggle={toggleTask}
                      onSnooze={snooze}
                      onOpenLead={setSelectedLeadId}
                    />
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      )}

      <p className="mt-8 text-center text-[11px] text-slate-400 flex items-center justify-center gap-1.5">
        <CalendarDays className="w-3.5 h-3.5" />
        Overdue items stay here until they are done or rescheduled.
      </p>

      {selectedLeadId && (
        <LeadDetailSheet
          leadId={selectedLeadId}
          onClose={() => setSelectedLeadId(null)}
          onChanged={fetchTasks}
        />
      )}

      {toast && (
        <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-[1200] max-w-sm w-[calc(100%-2rem)]">
          <div className="bg-slate-900 text-white text-xs font-medium rounded-2xl px-4 py-3 shadow-xl">
            {toast}
          </div>
        </div>
      )}
    </>
  );
}

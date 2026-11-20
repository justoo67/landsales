import { describe, expect, it } from 'vitest';
import { dueLabel, initials, toDateTimeInput } from './format';
import { isTaskType, taskTypeLabel } from './task-types';

describe('initials', () => {
  it('handles one and two names', () => {
    expect(initials('Peter Kamau')).toBe('PK');
    expect(initials('Mary')).toBe('MA');
    expect(initials('  ')).toBe('?');
  });
});

describe('dueLabel', () => {
  it('flags overdue dates', () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 2);
    expect(dueLabel(yesterday)).toMatch(/^Overdue/);
  });

  it('labels today and tomorrow', () => {
    const later = new Date();
    later.setHours(23, 0, 0, 0);
    expect(dueLabel(later)).toMatch(/^Today/);

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    expect(dueLabel(tomorrow)).toMatch(/^Tomorrow/);
  });

  it('falls back to a readable date', () => {
    const later = new Date();
    later.setDate(later.getDate() + 10);
    expect(dueLabel(later)).not.toMatch(/Overdue|Today|Tomorrow/);
  });
});

describe('toDateTimeInput', () => {
  it('round-trips through Date', () => {
    const value = toDateTimeInput(new Date(2026, 10, 20, 9, 5));
    expect(value).toBe('2026-11-20T09:05');
    expect(new Date(value).getMinutes()).toBe(5);
  });
});

describe('task types', () => {
  it('validates and labels', () => {
    expect(isTaskType('CALL')).toBe(true);
    expect(isTaskType('call')).toBe(false);
    expect(taskTypeLabel('SITE_VISIT')).toBe('Site visit');
  });
});

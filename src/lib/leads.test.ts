import { describe, expect, it } from 'vitest';
import { isLeadStage, stageOrder, stageLabel } from './lead-stages';
import { validateStageTransition } from './leads';

describe('stage vocabulary', () => {
  it('recognises valid stages only', () => {
    expect(isLeadStage('OFFER')).toBe(true);
    expect(isLeadStage('offer')).toBe(false);
    expect(isLeadStage('WHATEVER')).toBe(false);
  });

  it('orders the pipeline', () => {
    expect(stageOrder('INQUIRY')).toBeLessThan(stageOrder('DEPOSIT'));
    expect(stageOrder('DEPOSIT')).toBeLessThan(stageOrder('CLOSED'));
    expect(stageOrder('nonsense')).toBeGreaterThan(stageOrder('LOST'));
  });

  it('labels stages', () => {
    expect(stageLabel('SITE_VISIT')).toBe('Site Visit');
    expect(stageLabel('NOPE')).toBe('NOPE');
  });
});

describe('validateStageTransition', () => {
  it('allows ordinary moves', () => {
    expect(validateStageTransition({ to: 'CONTACTED' })).toEqual({ ok: true });
    expect(validateStageTransition({ to: 'OFFER' })).toEqual({ ok: true });
    expect(validateStageTransition({ to: 'DEPOSIT' })).toEqual({ ok: true });
  });

  it('rejects unknown stages', () => {
    const result = validateStageTransition({ to: 'PURCHASED' });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe('INVALID_STAGE');
  });

  it('requires a lost reason', () => {
    const missing = validateStageTransition({ to: 'LOST' });
    expect(missing.ok).toBe(false);
    if (!missing.ok) expect(missing.code).toBe('LOST_REASON_REQUIRED');

    expect(validateStageTransition({ to: 'LOST', lostReason: 'Bought elsewhere' })).toEqual({
      ok: true,
    });
  });

  it('requires a sale record to close', () => {
    const missing = validateStageTransition({ to: 'CLOSED' });
    expect(missing.ok).toBe(false);
    if (!missing.ok) expect(missing.code).toBe('SALE_RECORD_REQUIRED');

    expect(validateStageTransition({ to: 'CLOSED', hasSaleRecord: true })).toEqual({
      ok: true,
    });
  });
});

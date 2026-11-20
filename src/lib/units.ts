/**
 * Land size normalisation.
 *
 * Plot sizes arrive as Kenyan presets (`50 × 100 ft`), imperial dimensions,
 * acres, hectares, or square metres. Comparables are always stored in acres so
 * price-per-acre is comparable across listings.
 */

const SQFT_PER_ACRE = 43_560;
const SQM_PER_ACRE = 4_046.856_422_4;
const ACRE_PER_HECTARE = 2.471_053_814_7;

const PRESET_ACRES: Record<string, number> = {
  '50x100': 5_000 / SQFT_PER_ACRE,
  '40x80': 3_200 / SQFT_PER_ACRE,
  '100x100': 10_000 / SQFT_PER_ACRE,
};

function toNumber(value: string | null | undefined): number | null {
  if (!value) return null;
  const cleaned = value.replace(/[,\s]/g, '');
  const match = cleaned.match(/-?\d+(\.\d+)?/);
  if (!match) return null;
  const parsed = Number(match[0]);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function round(value: number, places = 4): number {
  const factor = 10 ** places;
  return Math.round(value * factor) / factor;
}

/**
 * Best-effort acres for a plot's stored size fields.
 * Returns `null` when nothing parseable is available.
 */
export function acresFromPreset(
  preset: string | null | undefined,
  customValue?: string | null
): number | null {
  if (!preset) return null;

  const normalized = preset.trim();

  if (PRESET_ACRES[normalized]) return round(PRESET_ACRES[normalized]);

  if (normalized === 'ACRES') {
    const value = toNumber(customValue);
    return value ? round(value) : null;
  }

  if (normalized === 'HECTARES') {
    const value = toNumber(customValue);
    return value ? round(value * ACRE_PER_HECTARE) : null;
  }

  if (normalized === 'SQM') {
    const value = toNumber(customValue);
    return value ? round(value / SQM_PER_ACRE) : null;
  }

  // Custom or legacy freeform values, e.g. "5 Acres", "100x150 ft", "0.4 ha".
  const source = `${normalized} ${customValue ?? ''}`.toLowerCase();

  const dimension = source.match(/(\d+(?:\.\d+)?)\s*(?:ft|feet|'|”|”)?\s*[x×]\s*(\d+(?:\.\d+)?)/);
  if (dimension) {
    const sqft = Number(dimension[1]) * Number(dimension[2]);
    return sqft > 0 ? round(sqft / SQFT_PER_ACRE) : null;
  }

  if (/\b(ha|hectare|hectares)\b/.test(source)) {
    const value = toNumber(source);
    return value ? round(value * ACRE_PER_HECTARE) : null;
  }

  if (/\b(sqm|sqm|m2|m²|square met|square metre|square meter)\b/.test(source)) {
    const value = toNumber(source);
    return value ? round(value / SQM_PER_ACRE) : null;
  }

  if (/\b(acre|acres|ac)\b/.test(source)) {
    const value = toNumber(source);
    return value ? round(value) : null;
  }

  const plain = toNumber(normalized);
  return plain ? round(plain) : null;
}

export function formatAcres(acres: number | null | undefined): string {
  if (!acres || acres <= 0) return '—';
  if (acres < 1) return `${acres.toFixed(2)} acres`;
  const rounded = Math.round(acres * 100) / 100;
  return `${rounded} ${rounded === 1 ? 'acre' : 'acres'}`;
}

export function pricePerAcre(priceKes: number, acres: number | null): number | null {
  if (!acres || acres <= 0 || !Number.isFinite(priceKes)) return null;
  return Math.round(priceKes / acres);
}

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { serializeMoney } from '@/lib/money.server';
import { compJson } from '@/lib/comps';
import { computeGuidance, deviationPercent, MIN_COMPS } from '@/lib/pricing';
import { acresFromPreset, pricePerAcre } from '@/lib/units';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    const plot = await prisma.plot.findFirst({
      where: { id, deletedAt: null },
      select: {
        id: true,
        title: true,
        county: true,
        ward: true,
        sizePreset: true,
        sizeCustomValue: true,
        priceKes: true,
        priceType: true,
      },
    });

    if (!plot) {
      return NextResponse.json({ error: 'Plot not found' }, { status: 404 });
    }

    const targetAcres = acresFromPreset(plot.sizePreset, plot.sizeCustomValue);
    const asking = serializeMoney(plot.priceKes);

    if (!plot.county) {
      return NextResponse.json({
        targetAcres,
        asking,
        askingPerAcre: null,
        deviation: null,
        scope: null,
        guidance: null,
        reason: 'NO_LOCATION',
      });
    }

    if (!targetAcres) {
      return NextResponse.json({
        targetAcres: null,
        asking,
        askingPerAcre: null,
        deviation: null,
        scope: null,
        guidance: null,
        reason: 'NO_SIZE',
      });
    }

    const countyWhere = {
      county: { equals: plot.county, mode: 'insensitive' as const },
    };

    const fetchFor = async (ward: string | null) => {
      const rows = await prisma.comparable.findMany({
        where: ward ? { ...countyWhere, ward: { equals: ward, mode: 'insensitive' } } : countyWhere,
        orderBy: { observedAt: 'desc' },
        take: 200,
      });
      return rows.map(compJson);
    };

    let scope: 'WARD' | 'COUNTY' = 'WARD';
    let comps = plot.ward ? await fetchFor(plot.ward) : [];

    // Not enough local evidence: widen to the whole county.
    if (comps.length < MIN_COMPS) {
      comps = await fetchFor(null);
      scope = 'COUNTY';
    }

    const typed = comps.map((comp) => ({
      id: String(comp.id),
      locationName: String(comp.locationName ?? ''),
      sizeAcres: Number(comp.sizeAcres ?? 0),
      priceKes: Number(comp.priceKes ?? 0),
      pricePerAcre: Number(comp.pricePerAcre ?? 0),
      kind: String(comp.kind ?? 'SALE'),
      observedAt: String(comp.observedAt ?? ''),
    }));

    const guidance = computeGuidance(typed, targetAcres);
    const askingPerAcre = asking ? pricePerAcre(asking, targetAcres) : null;

    return NextResponse.json({
      targetAcres,
      asking,
      askingPerAcre,
      deviation: guidance ? deviationPercent(askingPerAcre, guidance.mid) : null,
      scope,
      guidance,
      reason: guidance ? null : 'NOT_ENOUGH_COMPS',
    });
  } catch (err) {
    console.error('Plot guidance error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

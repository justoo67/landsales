import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAgent } from '@/lib/auth';
import { requestMoney } from '@/lib/money.server';
import { compJson } from '@/lib/comps';

const COMP_KINDS = ['SALE', 'LISTING'];
const COMP_SOURCES = ['AGENT', 'PORTAL', 'PUBLIC_RECORD', 'HEARD'];

export async function GET(req: Request) {
  try {
    const auth = await requireAgent();
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const county = searchParams.get('county');
    const ward = searchParams.get('ward');
    const query = searchParams.get('q')?.trim();

    const where: Record<string, unknown> = { agentId: auth.agentId };
    if (county) where.county = { equals: county, mode: 'insensitive' };
    if (ward) where.ward = { equals: ward, mode: 'insensitive' };
    if (query) {
      where.OR = [
        { locationName: { contains: query, mode: 'insensitive' } },
        { county: { contains: query, mode: 'insensitive' } },
        { ward: { contains: query, mode: 'insensitive' } },
        { notes: { contains: query, mode: 'insensitive' } },
      ];
    }

    const comps = await prisma.comparable.findMany({
      where,
      orderBy: { observedAt: 'desc' },
      take: 300,
    });

    return NextResponse.json({ comps: comps.map(compJson) });
  } catch (err) {
    console.error('Fetch comps error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const auth = await requireAgent();
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const county = typeof body.county === 'string' ? body.county.trim() : '';
    const ward = typeof body.ward === 'string' ? body.ward.trim() : '';
    const locationName =
      typeof body.locationName === 'string' ? body.locationName.trim() : '';
    const kind = COMP_KINDS.includes(body.kind) ? body.kind : 'SALE';
    const source = COMP_SOURCES.includes(body.source) ? body.source : 'AGENT';

    if (!county || !locationName) {
      return NextResponse.json(
        { error: 'County and location are required' },
        { status: 400 }
      );
    }

    const sizeAcres = Number(body.sizeAcres);
    if (!Number.isFinite(sizeAcres) || sizeAcres <= 0) {
      return NextResponse.json({ error: 'A valid size in acres is required' }, { status: 400 });
    }

    let priceKes;
    try {
      priceKes = requestMoney(body.priceKes);
    } catch {
      return NextResponse.json({ error: 'Invalid price amount' }, { status: 400 });
    }

    if (!priceKes || priceKes.lte(0)) {
      return NextResponse.json({ error: 'Price must be greater than zero' }, { status: 400 });
    }

    const observedAt = body.observedAt ? new Date(body.observedAt) : new Date();
    if (Number.isNaN(observedAt.getTime())) {
      return NextResponse.json({ error: 'Invalid observation date' }, { status: 400 });
    }

    const perAcre = priceKes.div(sizeAcres.toString());

    const comp = await prisma.comparable.create({
      data: {
        agentId: auth.agentId,
        county: county.slice(0, 120),
        ward: ward ? ward.slice(0, 120) : null,
        locationName: locationName.slice(0, 160),
        latitude: Number.isFinite(Number(body.latitude)) ? Number(body.latitude) : null,
        longitude: Number.isFinite(Number(body.longitude)) ? Number(body.longitude) : null,
        sizeAcres: sizeAcres.toFixed(4),
        priceKes,
        pricePerAcre: perAcre.toFixed(2),
        kind,
        source,
        sourceUrl: body.sourceUrl ? String(body.sourceUrl).slice(0, 500) : null,
        observedAt,
        verified: Boolean(body.verified),
        notes: body.notes ? String(body.notes).slice(0, 2000) : null,
      },
    });

    return NextResponse.json({ comp: compJson(comp) }, { status: 201 });
  } catch (err) {
    console.error('Create comp error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAgent } from '@/lib/auth';
import { plotJson } from '@/lib/serialize';
import { requestMoney } from '@/lib/money.server';
import { nanoid } from 'nanoid';

export async function GET(req: Request) {
  try {
    const auth = await requireAgent();
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const query = searchParams.get('query');

    const where: Record<string, unknown> = {
      agentId: auth.agentId,
      deletedAt: null,
    };

    if (status && status !== 'ALL') {
      where.status = status.toUpperCase();
    }

    if (query) {
      where.OR = [
        { title: { contains: query, mode: 'insensitive' } },
        { description: { contains: query, mode: 'insensitive' } },
        { sizeCustomValue: { contains: query, mode: 'insensitive' } },
        { zoning: { contains: query, mode: 'insensitive' } },
      ];
    }

    const plots = await prisma.plot.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ plots: plots.map(plotJson) });
  } catch (err) {
    console.error('Fetch plots error:', err);
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
    const {
      title,
      status = 'AVAILABLE',
      priceType = 'FIXED',
      priceKes,
      sizePreset = '50x100',
      sizeCustomValue,
      county,
      ward,
      locationName,
      zoning,
      roadAccess,
      waterSource,
      electricity,
      description,
      latitude,
      longitude,
      photos = [],
      videoUrl,
      customAttributes,
    } = body;

    if (!title || latitude === undefined || longitude === undefined) {
      return NextResponse.json(
        { error: 'Title, latitude, and longitude are required' },
        { status: 400 }
      );
    }

    let parsedPrice;
    try {
      parsedPrice = requestMoney(priceKes);
    } catch {
      return NextResponse.json({ error: 'Invalid price amount' }, { status: 400 });
    }

    // Generate unguessable 10-character ID
    const id = nanoid(10);

    const plot = await prisma.plot.create({
      data: {
        id,
        agentId: auth.agentId,
        title,
        status,
        priceType,
        priceKes: parsedPrice,
        sizePreset,
        sizeCustomValue,
        county: county || null,
        ward: ward || null,
        locationName: locationName || null,
        zoning,
        roadAccess,
        waterSource,
        electricity,
        description,
        latitude: Number(latitude),
        longitude: Number(longitude),
        photos: JSON.stringify(photos),
        videoUrl,
        customAttributes: customAttributes ? JSON.stringify(customAttributes) : null,
      },
    });

    return NextResponse.json({ plot: plotJson(plot) });
  } catch (err) {
    console.error('Create plot error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

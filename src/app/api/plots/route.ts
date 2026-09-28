import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { nanoid } from 'nanoid';

export async function GET(req: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const query = searchParams.get('query');

    const where: Record<string, unknown> = {};

    if (status && status !== 'ALL') {
      where.status = status.toUpperCase();
    }

    if (query) {
      where.OR = [
        { title: { contains: query } },
        { description: { contains: query } },
        { sizeCustomValue: { contains: query } },
        { zoning: { contains: query } },
      ];
    }

    const plots = await prisma.plot.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ plots });
  } catch (err) {
    console.error('Fetch plots error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getSession();
    if (!session) {
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

    // Generate unguessable 10-character ID
    const id = nanoid(10);

    const plot = await prisma.plot.create({
      data: {
        id,
        title,
        status,
        priceType,
        priceKes: priceKes ? parseFloat(priceKes) : null,
        sizePreset,
        sizeCustomValue,
        zoning,
        roadAccess,
        waterSource,
        electricity,
        description,
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude),
        photos: JSON.stringify(photos),
        videoUrl,
        customAttributes: customAttributes ? JSON.stringify(customAttributes) : null,
      },
    });

    return NextResponse.json({ plot });
  } catch (err) {
    console.error('Create plot error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

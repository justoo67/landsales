import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const plot = await prisma.plot.findUnique({
      where: { id },
    });

    if (!plot) {
      return NextResponse.json({ error: 'Plot not found' }, { status: 404 });
    }

    return NextResponse.json({ plot });
  } catch (err) {
    console.error('Get plot error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json();

    const data: Record<string, unknown> = {};

    if (body.title !== undefined) data.title = body.title;
    if (body.status !== undefined) data.status = body.status;
    if (body.priceType !== undefined) data.priceType = body.priceType;
    if (body.priceKes !== undefined)
      data.priceKes = body.priceKes ? parseFloat(body.priceKes) : null;
    if (body.sizePreset !== undefined) data.sizePreset = body.sizePreset;
    if (body.sizeCustomValue !== undefined)
      data.sizeCustomValue = body.sizeCustomValue;
    if (body.zoning !== undefined) data.zoning = body.zoning;
    if (body.roadAccess !== undefined) data.roadAccess = body.roadAccess;
    if (body.waterSource !== undefined) data.waterSource = body.waterSource;
    if (body.electricity !== undefined) data.electricity = body.electricity;
    if (body.description !== undefined) data.description = body.description;
    if (body.latitude !== undefined) data.latitude = parseFloat(body.latitude);
    if (body.longitude !== undefined) data.longitude = parseFloat(body.longitude);
    if (body.photos !== undefined) data.photos = JSON.stringify(body.photos);
    if (body.videoUrl !== undefined) data.videoUrl = body.videoUrl;
    if (body.customAttributes !== undefined)
      data.customAttributes = body.customAttributes
        ? JSON.stringify(body.customAttributes)
        : null;

    const plot = await prisma.plot.update({
      where: { id },
      data,
    });

    return NextResponse.json({ plot });
  } catch (err) {
    console.error('Update plot error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    await prisma.plot.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Delete plot error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

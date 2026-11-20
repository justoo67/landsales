import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { plotJson } from '@/lib/serialize';
import { requestMoney } from '@/lib/money.server';

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
    });

    if (!plot) {
      return NextResponse.json({ error: 'Plot not found' }, { status: 404 });
    }

    return NextResponse.json({ plot: plotJson(plot) });
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

    const existing = await prisma.plot.findFirst({
      where: { id, deletedAt: null },
      select: { id: true },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Plot not found' }, { status: 404 });
    }

    const data: Record<string, unknown> = {};

    if (body.title !== undefined) data.title = body.title;
    if (body.status !== undefined) data.status = body.status;
    if (body.priceType !== undefined) data.priceType = body.priceType;
    if (body.priceKes !== undefined) {
      try {
        data.priceKes = requestMoney(body.priceKes);
      } catch {
        return NextResponse.json({ error: 'Invalid price amount' }, { status: 400 });
      }
    }
    if (body.sizePreset !== undefined) data.sizePreset = body.sizePreset;
    if (body.sizeCustomValue !== undefined)
      data.sizeCustomValue = body.sizeCustomValue;
    if (body.county !== undefined) data.county = body.county || null;
    if (body.ward !== undefined) data.ward = body.ward || null;
    if (body.locationName !== undefined) data.locationName = body.locationName || null;
    if (body.zoning !== undefined) data.zoning = body.zoning;
    if (body.roadAccess !== undefined) data.roadAccess = body.roadAccess;
    if (body.waterSource !== undefined) data.waterSource = body.waterSource;
    if (body.electricity !== undefined) data.electricity = body.electricity;
    if (body.description !== undefined) data.description = body.description;
    if (body.latitude !== undefined) data.latitude = Number(body.latitude);
    if (body.longitude !== undefined) data.longitude = Number(body.longitude);
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

    return NextResponse.json({ plot: plotJson(plot) });
  } catch (err) {
    console.error('Update plot error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * Soft delete. A plot with a sale record is never physically removed: the
 * payment ledger and buyer review must survive. Those require `?confirm=true`.
 */
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
    const confirm = new URL(req.url).searchParams.get('confirm') === 'true';

    const plot = await prisma.plot.findFirst({
      where: { id, deletedAt: null },
      include: { saleRecord: { select: { id: true } } },
    });

    if (!plot) {
      return NextResponse.json({ error: 'Plot not found' }, { status: 404 });
    }

    if (plot.saleRecord && !confirm) {
      return NextResponse.json(
        {
          error:
            'This plot has a sale record. Deleting hides the plot but keeps the payment history.',
          code: 'HAS_SALE_RECORD',
        },
        { status: 409 }
      );
    }

    await prisma.plot.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Delete plot error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

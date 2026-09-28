import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: plotId } = await params;
    const body = await req.json();
    const { buyerName, rating = 5, comment, isPublished = true } = body;

    if (!comment) {
      return NextResponse.json(
        { error: 'Review comment is required' },
        { status: 400 }
      );
    }

    const deal = await prisma.saleRecord.findUnique({
      where: { plotId },
    });

    if (!deal) {
      return NextResponse.json(
        { error: 'No active sale record found for this plot' },
        { status: 404 }
      );
    }

    const review = await prisma.buyerReview.upsert({
      where: { saleRecordId: deal.id },
      create: {
        saleRecordId: deal.id,
        buyerName: buyerName || deal.buyerName,
        rating: parseInt(String(rating)),
        comment,
        isPublished,
      },
      update: {
        buyerName: buyerName || deal.buyerName,
        rating: parseInt(String(rating)),
        comment,
        isPublished,
      },
    });

    return NextResponse.json({ success: true, review });
  } catch (err) {
    console.error('Save review error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

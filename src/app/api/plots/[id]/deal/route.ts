import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';

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
    const deal = await prisma.saleRecord.findUnique({
      where: { plotId: id },
      include: {
        installments: {
          orderBy: { paymentDate: 'desc' },
        },
        review: true,
        plot: {
          select: {
            id: true,
            title: true,
            status: true,
            priceKes: true,
            sizePreset: true,
          },
        },
      },
    });

    return NextResponse.json({ deal });
  } catch (err) {
    console.error('Fetch deal error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

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
    const {
      buyerName,
      buyerPhone,
      buyerNationalId,
      buyerCustomFields,
      agreedPriceKes,
      paymentType = 'LUMP_SUM',
      depositKes = 0,
      nextDueDate,
      notes,
      plotStatus = 'SOLD',
    } = body;

    if (!buyerName || !buyerPhone || agreedPriceKes === undefined) {
      return NextResponse.json(
        { error: 'Buyer name, phone, and agreed price are required' },
        { status: 400 }
      );
    }

    const numericPrice = parseFloat(String(agreedPriceKes));
    const numericDeposit = parseFloat(String(depositKes || 0));
    const calculatedBalance = Math.max(0, numericPrice - numericDeposit);

    // 1. Update plot status
    await prisma.plot.update({
      where: { id: plotId },
      data: { status: plotStatus },
    });

    // 2. Check if deal already exists for this plot
    const existingDeal = await prisma.saleRecord.findUnique({
      where: { plotId },
    });

    const customFieldsString = Array.isArray(buyerCustomFields)
      ? JSON.stringify(buyerCustomFields)
      : typeof buyerCustomFields === 'string'
      ? buyerCustomFields
      : null;

    let deal;
    if (existingDeal) {
      deal = await prisma.saleRecord.update({
        where: { id: existingDeal.id },
        data: {
          buyerName,
          buyerPhone,
          buyerNationalId: buyerNationalId || null,
          buyerCustomFields: customFieldsString,
          agreedPriceKes: numericPrice,
          paymentType,
          depositKes: numericDeposit,
          balanceKes: calculatedBalance,
          nextDueDate: nextDueDate ? new Date(nextDueDate) : null,
          notes: notes || null,
        },
        include: {
          installments: { orderBy: { paymentDate: 'desc' } },
          review: true,
        },
      });
    } else {
      deal = await prisma.saleRecord.create({
        data: {
          plotId,
          buyerName,
          buyerPhone,
          buyerNationalId: buyerNationalId || null,
          buyerCustomFields: customFieldsString,
          agreedPriceKes: numericPrice,
          paymentType,
          depositKes: numericDeposit,
          balanceKes: calculatedBalance,
          nextDueDate: nextDueDate ? new Date(nextDueDate) : null,
          notes: notes || null,
          titleStatus: 'DEPOSIT_PAID',
          installments:
            numericDeposit > 0
              ? {
                  create: [
                    {
                      amountKes: numericDeposit,
                      reference: 'Initial Deposit',
                      notes: 'Initial booking / down payment',
                    },
                  ],
                }
              : undefined,
        },
        include: {
          installments: { orderBy: { paymentDate: 'desc' } },
          review: true,
        },
      });
    }

    return NextResponse.json({ success: true, deal });
  } catch (err) {
    console.error('Save deal error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

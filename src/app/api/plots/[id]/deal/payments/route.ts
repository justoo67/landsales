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
    const { amountKes, paymentDate, reference, notes, nextDueDate } = body;

    if (!amountKes || parseFloat(String(amountKes)) <= 0) {
      return NextResponse.json(
        { error: 'Valid payment amount is required' },
        { status: 400 }
      );
    }

    const deal = await prisma.saleRecord.findUnique({
      where: { plotId },
      include: { installments: true },
    });

    if (!deal) {
      return NextResponse.json(
        { error: 'No active sale record found for this plot' },
        { status: 404 }
      );
    }

    const numericAmount = parseFloat(String(amountKes));

    // Create installment record
    const installment = await prisma.paymentInstallment.create({
      data: {
        saleRecordId: deal.id,
        amountKes: numericAmount,
        paymentDate: paymentDate ? new Date(paymentDate) : new Date(),
        reference: reference || null,
        notes: notes || null,
      },
    });

    // Sum all installments to get true total paid
    const allInstallments = await prisma.paymentInstallment.findMany({
      where: { saleRecordId: deal.id },
    });
    const totalPaid = allInstallments.reduce((sum, item) => sum + item.amountKes, 0);
    const newBalance = Math.max(0, deal.agreedPriceKes - totalPaid);

    // If fully paid, advance title status if still on deposit
    let newTitleStatus = deal.titleStatus;
    if (newBalance === 0 && (deal.titleStatus === 'DEPOSIT_PAID' || deal.titleStatus === 'AGREEMENT_SIGNED')) {
      newTitleStatus = 'BALANCE_CLEARED';
    }

    const updatedDeal = await prisma.saleRecord.update({
      where: { id: deal.id },
      data: {
        balanceKes: newBalance,
        titleStatus: newTitleStatus,
        ...(nextDueDate !== undefined
          ? { nextDueDate: nextDueDate ? new Date(nextDueDate) : null }
          : {}),
      },
      include: {
        installments: { orderBy: { paymentDate: 'desc' } },
        review: true,
      },
    });

    return NextResponse.json({
      success: true,
      installment,
      deal: updatedDeal,
      totalPaid,
    });
  } catch (err) {
    console.error('Log payment error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

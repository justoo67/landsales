import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { saleRecordJson } from '@/lib/serialize';
import {
  requestMoney,
  serializeMoney,
  subtractFloorZero,
  sumDecimals,
} from '@/lib/money.server';

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

    let amount;
    try {
      amount = requestMoney(amountKes);
    } catch {
      return NextResponse.json({ error: 'Invalid payment amount' }, { status: 400 });
    }

    if (!amount || amount.lte(0)) {
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

    // Create installment record
    const installment = await prisma.paymentInstallment.create({
      data: {
        saleRecordId: deal.id,
        amountKes: amount,
        paymentDate: paymentDate ? new Date(paymentDate) : new Date(),
        reference: reference || null,
        notes: notes || null,
      },
    });

    // Sum all installments to get true total paid
    const allInstallments = await prisma.paymentInstallment.findMany({
      where: { saleRecordId: deal.id },
    });
    const totalPaid = sumDecimals(allInstallments.map((item) => item.amountKes));
    const newBalance = subtractFloorZero(deal.agreedPriceKes, totalPaid);

    // If fully paid, advance title status if still on deposit
    let newTitleStatus = deal.titleStatus;
    if (
      newBalance.isZero() &&
      (deal.titleStatus === 'DEPOSIT_PAID' || deal.titleStatus === 'AGREEMENT_SIGNED')
    ) {
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
      installment: { ...installment, amountKes: serializeMoney(installment.amountKes) },
      deal: saleRecordJson(updatedDeal),
      totalPaid: serializeMoney(totalPaid),
    });
  } catch (err) {
    console.error('Log payment error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

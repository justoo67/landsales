import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { logActivity } from '@/lib/activity';
import { isDocumentKind, MAX_DOCUMENT_BYTES } from '@/lib/document-types';

/**
 * Documents are agent-only. They are attached to a plot, a sale, or a buyer and
 * are never rendered on the public listing page.
 */
export async function GET(req: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const plotId = searchParams.get('plotId');
    const saleId = searchParams.get('saleId');
    const contactId = searchParams.get('contactId');

    if (!plotId && !saleId && !contactId) {
      return NextResponse.json(
        { error: 'Provide plotId, saleId, or contactId' },
        { status: 400 }
      );
    }

    const documents = await prisma.document.findMany({
      where: {
        ...(plotId ? { plotId } : {}),
        ...(saleId ? { saleId } : {}),
        ...(contactId ? { contactId } : {}),
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ documents });
  } catch (err) {
    console.error('Fetch documents error:', err);
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
    const kind = isDocumentKind(body.kind) ? body.kind : null;
    const name = typeof body.name === 'string' ? body.name.trim() : '';
    const url = typeof body.url === 'string' ? body.url.trim() : '';
    const plotId = typeof body.plotId === 'string' && body.plotId ? body.plotId : null;
    const saleId = typeof body.saleId === 'string' && body.saleId ? body.saleId : null;
    const contactId =
      typeof body.contactId === 'string' && body.contactId ? body.contactId : null;

    if (!kind) {
      return NextResponse.json({ error: 'Choose a document type' }, { status: 400 });
    }

    if (!name || !url) {
      return NextResponse.json({ error: 'File name and URL are required' }, { status: 400 });
    }

    if (!plotId && !saleId && !contactId) {
      return NextResponse.json(
        { error: 'Attach the document to a plot, sale, or buyer' },
        { status: 400 }
      );
    }

    const sizeBytes = Number(body.sizeBytes);
    if (Number.isFinite(sizeBytes) && sizeBytes > MAX_DOCUMENT_BYTES) {
      return NextResponse.json({ error: 'File is too large (25 MB limit)' }, { status: 413 });
    }

    if (plotId) {
      const plot = await prisma.plot.findFirst({
        where: { id: plotId, deletedAt: null },
        select: { id: true },
      });
      if (!plot) return NextResponse.json({ error: 'Plot not found' }, { status: 404 });
    }

    if (saleId) {
      const sale = await prisma.saleRecord.findUnique({
        where: { id: saleId },
        select: { id: true },
      });
      if (!sale) return NextResponse.json({ error: 'Sale not found' }, { status: 404 });
    }

    const document = await prisma.document.create({
      data: {
        kind,
        name: name.slice(0, 200),
        url: url.slice(0, 1000),
        key: typeof body.key === 'string' ? body.key.slice(0, 500) : null,
        mimeType: typeof body.mimeType === 'string' ? body.mimeType.slice(0, 120) : null,
        sizeBytes: Number.isFinite(sizeBytes) ? Math.round(sizeBytes) : null,
        plotId,
        saleId,
        contactId,
      },
    });

    await logActivity({
      type: 'DOCUMENT',
      body: `Document added: ${document.name}`,
      plotId,
      saleId,
      contactId,
      metadata: { kind: document.kind, documentId: document.id },
    });

    return NextResponse.json({ document }, { status: 201 });
  } catch (err) {
    console.error('Create document error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

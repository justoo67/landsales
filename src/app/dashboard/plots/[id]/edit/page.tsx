import AgentNavbar from '@/components/layout/AgentNavbar';
import PlotForm from '@/components/plots/PlotForm';
import DocumentsSection from '@/components/documents/DocumentsSection';
import PriceGuidance from '@/components/pricing/PriceGuidance';
import Link from 'next/link';
import { getSession, findAgentForSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { notFound, redirect } from 'next/navigation';

export default async function EditPlotPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getSession();
  if (!session) {
    redirect('/login');
  }

  const { id } = await params;
  const agent = await findAgentForSession(session);
  if (!agent) {
    redirect('/login');
  }
  const plot = await prisma.plot.findFirst({
    where: { id, deletedAt: null, agentId: agent.id },
  });

  if (!plot) {
    notFound();
  }

  let parsedPhotos: string[] = [];
  try {
    parsedPhotos = JSON.parse(plot.photos);
  } catch {
    parsedPhotos = [];
  }

  let parsedCustomAttributes: { id: string; label: string; value: string }[] = [];
  try {
    if (plot.customAttributes) {
      const parsed = JSON.parse(plot.customAttributes);
      if (Array.isArray(parsed)) {
        parsedCustomAttributes = parsed.map(
          (item: { id?: string; label?: string; value?: string }, idx: number) => ({
            id: item.id || `attr-${idx}-${plot.id}`,
            label: item.label || '',
            value: item.value || '',
          })
        );
      }
    }
  } catch {
    parsedCustomAttributes = [];
  }

  const initialData = {
    id: plot.id,
    title: plot.title,
    status: plot.status,
    priceType: plot.priceType,
    priceKes: plot.priceKes ? plot.priceKes.toString() : '',
    sizePreset: plot.sizePreset,
    sizeCustomValue: plot.sizeCustomValue || '',
    county: plot.county || '',
    ward: plot.ward || '',
    locationName: plot.locationName || '',
    zoning: plot.zoning,
    roadAccess: plot.roadAccess,
    waterSource: plot.waterSource,
    electricity: plot.electricity,
    description: plot.description || '',
    latitude: plot.latitude,
    longitude: plot.longitude,
    photos: parsedPhotos,
    videoUrl: plot.videoUrl || '',
    customAttributes: parsedCustomAttributes,
  };

  return (
    <div className="min-h-dvh flex flex-col bg-slate-50">
      <AgentNavbar agentName={session.name} />

      <main className="flex-1 max-w-3xl w-full mx-auto px-4 sm:px-6 py-6 pb-24">
        <div className="mb-6 flex items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Edit Plot Listing
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Updating details for: <span className="font-semibold text-slate-800">{plot.title}</span>
            </p>
          </div>
          <Link
            href={`/dashboard/plots/${plot.id}/offer`}
            className="flex-shrink-0 px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs font-semibold text-slate-700 hover:border-slate-300 min-h-[44px] flex items-center touch-manipulation"
          >
            Offer sheet
          </Link>
        </div>

        <PlotForm initialData={initialData} isEditing={true} />

        <div className="mt-6 space-y-4">
          <PriceGuidance
            plotId={plot.id}
            asking={plot.priceKes ? Number(plot.priceKes) : null}
          />
          <DocumentsSection plotId={plot.id} title="Plot documents" />
        </div>
      </main>
    </div>
  );
}

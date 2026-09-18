import AgentNavbar from '@/components/layout/AgentNavbar';
import PlotForm from '@/components/plots/PlotForm';
import { getSession } from '@/lib/auth';
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
  const plot = await prisma.plot.findUnique({
    where: { id },
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

  const initialData = {
    id: plot.id,
    title: plot.title,
    status: plot.status,
    priceType: plot.priceType,
    priceKes: plot.priceKes ? plot.priceKes.toString() : '',
    sizePreset: plot.sizePreset,
    sizeCustomValue: plot.sizeCustomValue || '',
    zoning: plot.zoning || '',
    roadAccess: plot.roadAccess || '',
    waterSource: plot.waterSource || '',
    electricity: plot.electricity || '',
    description: plot.description || '',
    latitude: plot.latitude,
    longitude: plot.longitude,
    photos: parsedPhotos,
    videoUrl: plot.videoUrl || '',
  };

  return (
    <div className="min-h-dvh flex flex-col bg-slate-50">
      <AgentNavbar agentName={session.name} />

      <main className="flex-1 max-w-3xl w-full mx-auto px-4 sm:px-6 py-6 pb-24">
        <div className="mb-6">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Edit Plot Listing
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Updating details for: <span className="font-semibold text-slate-800">{plot.title}</span>
          </p>
        </div>

        <PlotForm initialData={initialData} isEditing={true} />
      </main>
    </div>
  );
}

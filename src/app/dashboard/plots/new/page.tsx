import AgentNavbar from '@/components/layout/AgentNavbar';
import PlotForm from '@/components/plots/PlotForm';
import { getSession } from '@/lib/auth';
import { redirect } from 'next/navigation';

export default async function NewPlotPage() {
  const session = await getSession();
  if (!session) {
    redirect('/login');
  }

  return (
    <div className="min-h-dvh flex flex-col bg-slate-50">
      <AgentNavbar agentName={session.name} />

      <main className="flex-1 max-w-3xl w-full mx-auto px-4 sm:px-6 py-6 pb-24">
        <div className="mb-6">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Create Land Listing
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Capture plot details, pin on the map, and generate an instant 1-to-1 client share link.
          </p>
        </div>

        <PlotForm />
      </main>
    </div>
  );
}

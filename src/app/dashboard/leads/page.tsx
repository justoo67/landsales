import { redirect } from 'next/navigation';
import AgentNavbar from '@/components/layout/AgentNavbar';
import LeadsClient from '@/components/leads/LeadsClient';
import { getSession } from '@/lib/auth';

export default async function LeadsPage({
  searchParams,
}: {
  searchParams: Promise<{ plot?: string }>;
}) {
  const session = await getSession();
  if (!session) {
    redirect('/login');
  }

  const { plot } = await searchParams;

  return (
    <div className="min-h-dvh flex flex-col bg-slate-50">
      <AgentNavbar agentName={session.name} />
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-6 pb-24">
        <LeadsClient initialPlotId={plot ?? null} />
      </main>
    </div>
  );
}

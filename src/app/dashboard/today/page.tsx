import { redirect } from 'next/navigation';
import AgentNavbar from '@/components/layout/AgentNavbar';
import TodayClient from '@/components/tasks/TodayClient';
import { getSession } from '@/lib/auth';

export default async function TodayPage() {
  const session = await getSession();
  if (!session) {
    redirect('/login');
  }

  return (
    <div className="min-h-dvh flex flex-col bg-slate-50">
      <AgentNavbar agentName={session.name} />
      <main className="flex-1 max-w-3xl w-full mx-auto px-4 sm:px-6 py-6 pb-24">
        <TodayClient />
      </main>
    </div>
  );
}

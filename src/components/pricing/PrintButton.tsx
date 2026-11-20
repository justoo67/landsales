'use client';

import { Printer } from 'lucide-react';

export default function PrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="flex items-center gap-1.5 px-3.5 py-2.5 bg-slate-900 hover:bg-black text-white text-sm font-semibold rounded-xl min-h-[44px] touch-manipulation print:hidden"
    >
      <Printer className="w-4 h-4" />
      Print / Save PDF
    </button>
  );
}

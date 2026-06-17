import { Eye } from 'lucide-react';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Header */}
      <header className="px-8 py-5">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 bg-sky-500 rounded-xl flex items-center justify-center shadow-sm">
            <Eye size={18} className="text-white" />
          </div>
          <span className="text-xl font-bold tracking-tight text-slate-900">Tele-Eye</span>
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 flex items-center justify-center p-4">
        {children}
      </div>

      {/* Footer */}
      <footer className="text-center py-4 text-xs text-slate-400">
        © 2026 Tele-Eye. All rights reserved.
      </footer>
    </div>
  );
}

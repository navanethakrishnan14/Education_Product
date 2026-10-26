import type { ReactNode } from "react";
import { ChevronRight, GraduationCap, ShieldCheck } from "lucide-react";

type WorkspaceShellProps = {
  organization: "School" | "College" | "Institution";
  institution: string;
  userName: string;
  role: string;
  onLogout: () => void;
  sidebar: ReactNode;
  title: string;
  children: ReactNode;
};

export default function WorkspaceShell({
  organization,
  institution,
  userName,
  role,
  onLogout,
  sidebar,
  title,
  children,
}: WorkspaceShellProps) {
  void onLogout;

  return (
    <div
      className="min-h-screen bg-[#f1effb] text-slate-900"
      style={{ fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif" }}
    >
      {sidebar}
      <div className="min-w-0 lg:pl-[275px]">
        <header className="sticky top-0 z-20 flex min-h-[74px] items-center justify-between gap-3 border-b border-violet-100 bg-white/95 px-4 shadow-sm backdrop-blur sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-violet-100 text-violet-800">
              <GraduationCap size={20} />
            </span>
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-[.14em] text-violet-700">
                {organization} workspace
              </p>
              <h1 className="truncate text-base font-extrabold">{title}</h1>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden text-right sm:block">
              <p className="max-w-44 truncate text-xs font-bold">
                {userName || "Management user"}
              </p>
              <p className="text-[10px] text-slate-500">{role || "Management"}</p>
            </div>
          </div>
        </header>
        <main className="mx-auto min-h-[calc(100vh-74px)] max-w-[1800px] p-4 sm:p-7 xl:p-9">
          <div className="mb-6 flex items-center gap-2 text-xs text-slate-500">
            <span>{organization}</span>
            <ChevronRight size={13} />
            <span className="font-semibold text-slate-800">{title}</span>
          </div>
          {children}
          <footer className="mt-10 flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 pt-4 text-[10px] text-slate-400">
            <span>© 2026 EduManage Cloud · {institution}</span>
            <span className="inline-flex items-center gap-1.5">
              <ShieldCheck size={12} />
              Secure management portal
            </span>
          </footer>
        </main>
      </div>
    </div>
  );
}

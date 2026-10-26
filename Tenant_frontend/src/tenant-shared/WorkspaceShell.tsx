import { useEffect, useRef, useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronDown, ChevronRight, GraduationCap, LogOut, Settings, ShieldCheck, UserRound } from "lucide-react";

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
  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    function closeOnOutsideClick(event: MouseEvent) {
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setProfileOpen(false);
      }
    }
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setProfileOpen(false);
    }
    document.addEventListener("mousedown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("mousedown", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, []);

  const displayName = userName || "Management user";
  const displayRole = role || "Management";
  const initials = displayName
    .trim()
    .split(/\\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || "")
    .join("");

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
          <div className="relative" ref={profileRef}>
            <button
              type="button"
              aria-haspopup="menu"
              aria-expanded={profileOpen}
              onClick={() => setProfileOpen((open) => !open)}
              className={`group flex max-w-[min(72vw,280px)] items-center gap-3 rounded-2xl border px-2.5 py-2 text-left transition-all focus:outline-none focus-visible:ring-4 focus-visible:ring-violet-100 sm:px-3 ${profileOpen ? "border-violet-200 bg-violet-50 shadow-sm" : "border-slate-200 bg-white hover:border-violet-200 hover:bg-slate-50"}`}
            >
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-violet-600 to-indigo-600 text-sm font-extrabold text-white shadow-sm">
                {initials || <UserRound size={18} />}
              </span>
              <span className="hidden min-w-0 sm:block">
                <span className="block max-w-40 truncate text-sm font-bold text-slate-800">{displayName}</span>
                <span className="mt-0.5 block truncate text-xs font-medium text-slate-500">{displayRole}</span>
              </span>
              <ChevronDown size={16} className={`shrink-0 text-slate-400 transition-transform ${profileOpen ? "rotate-180 text-violet-700" : "group-hover:text-slate-700"}`} />
            </button>

            {profileOpen && (
              <div
                role="menu"
                className="absolute right-0 top-[calc(100%+12px)] z-50 w-[min(290px,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-slate-200 bg-white p-2 shadow-[0_20px_60px_-20px_rgba(15,23,42,0.3)]"
              >
                <div className="flex items-center gap-3 rounded-xl bg-slate-50 p-3">
                  <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-violet-600 to-indigo-600 text-sm font-extrabold text-white">
                    {initials || <UserRound size={18} />}
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-bold text-slate-900">{displayName}</span>
                    <span className="mt-0.5 block truncate text-xs text-slate-500">{displayRole}</span>
                    <span className="mt-1 block text-[10px] font-semibold uppercase tracking-wider text-emerald-700">Authenticated account</span>
                  </span>
                </div>
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setProfileOpen(false);
                    navigate(`/workspace/${organization.toLowerCase()}/settings`);
                  }}
                  className="mt-2 flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold text-slate-700 transition-colors hover:bg-violet-50 hover:text-violet-800"
                >
                  <span className="grid h-9 w-9 place-items-center rounded-lg bg-violet-100 text-violet-700"><Settings size={17} /></span>
                  <span className="flex-1 text-left">Settings</span>
                  <ChevronRight size={15} className="text-slate-400" />
                </button>
                <div className="my-1 border-t border-slate-100" />
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setProfileOpen(false);
                    onLogout();
                  }}
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold text-rose-600 transition-colors hover:bg-rose-50"
                >
                  <span className="grid h-9 w-9 place-items-center rounded-lg bg-rose-100 text-rose-600"><LogOut size={17} /></span>
                  <span className="flex-1 text-left">Sign out</span>
                </button>
              </div>
            )}
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

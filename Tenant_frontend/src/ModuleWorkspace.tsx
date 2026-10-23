import { useEffect, useMemo, useState } from 'react';
import {
  Plus, Search, Pencil, Trash2, X, Save, Download, Users, FileText,
  CheckCircle2, Clock3, Archive, Filter, Database, AlertCircle
} from 'lucide-react';

type RecordRow = { id: string; name: string; email: string; category: string; status: 'Active' | 'Inactive'; notes: string; updatedAt: string };
type FieldKey = 'name' | 'email' | 'category' | 'status' | 'notes';
const fields: { key: FieldKey; label: string; placeholder: string }[] = [
  { key: 'name', label: 'Name / Title', placeholder: 'Enter a name or title' },
  { key: 'email', label: 'Email / Reference', placeholder: 'Enter email or reference (optional)' },
  { key: 'category', label: 'Department / Category', placeholder: 'Enter department or category' },
  { key: 'status', label: 'Status', placeholder: 'Select status' },
  { key: 'notes', label: 'Notes', placeholder: 'Add notes or details (optional)' }
];
const blank = (): Omit<RecordRow, 'id' | 'updatedAt'> => ({ name: '', email: '', category: '', status: 'Active', notes: '' });
const humanize = (value: string) => value.replace(/&/g, 'and').replace(/([a-z])([A-Z])/g, '$1 $2');
const getFieldsForPage = (page: string) => {
  const p = page.toLowerCase();
  if (p.includes('attendance')) return ['Student / Staff name', 'Date / Reference', 'Class / Department', 'Status', 'Notes'];
  if (p.includes('fee') || p.includes('finance') || p.includes('funding') || p.includes('scholarship')) return ['Fee / Transaction title', 'Receipt / Reference', 'Fee type / Category', 'Status', 'Notes'];
  if (p.includes('report') || p.includes('analytics')) return ['Report title', 'Report reference', 'Report category', 'Status', 'Notes'];
  if (p.includes('exam') || p.includes('result')) return ['Exam / Assessment name', 'Exam code', 'Class / Subject', 'Status', 'Notes'];
  if (p.includes('timetable') || p.includes('semester') || p.includes('schedule')) return ['Schedule title', 'Schedule code', 'Class / Department', 'Status', 'Notes'];
  if (p.includes('communication')) return ['Announcement title', 'Reference / Audience', 'Channel / Category', 'Status', 'Message'];
  if (p.includes('setting')) return ['Setting name', 'Key / Reference', 'Setting group', 'Status', 'Value / Notes'];
  if (p.includes('student') || p.includes('learner') || p.includes('admission')) return ['Student name', 'Email / Admission no.', 'Class / Program', 'Status', 'Notes'];
  if (p.includes('faculty') || p.includes('staff') || p.includes('management user') || p.includes('member')) return ['Person name', 'Email / Employee ID', 'Role / Department', 'Status', 'Notes'];
  if (p.includes('class') || p.includes('section') || p.includes('department') || p.includes('unit') || p.includes('structure') || p.includes('program') || p.includes('course') || p.includes('academic')) return ['Name / Title', 'Code / Reference', 'Department / Category', 'Status', 'Notes'];
  return ['Name / Title', 'Email / Reference', 'Department / Category', 'Status', 'Notes'];
};

export default function ModuleWorkspace({ page, tenantId, tenantName }: { page: string; tenantId?: string; tenantName: string }) {
  const storageKey = 'edusphere_module_records:' + (tenantId || 'tenant') + ':' + page;
  const [rows, setRows] = useState<RecordRow[]>([]);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState(blank());
  const [notice, setNotice] = useState('');
  const labels = getFieldsForPage(page);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      const parsed = raw ? JSON.parse(raw) as RecordRow[] : [];
      setRows(Array.isArray(parsed) ? parsed : []);
    } catch {
      setRows([]);
    }
  }, [storageKey]);

  function persist(next: RecordRow[]) {
    setRows(next);
    try {
      localStorage.setItem(storageKey, JSON.stringify(next));
      setNotice('Saved in this browser for this tenant and module.');
    } catch {
      setNotice('Unable to save in this browser. Check browser storage settings.');
    }
  }

  const filtered = useMemo(() => rows.filter(row => {
    const matchesQuery = [row.name, row.email, row.category, row.status, row.notes].some(value => value.toLowerCase().includes(query.toLowerCase()));
    return matchesQuery && (statusFilter === 'All' || row.status === statusFilter);
  }), [rows, query, statusFilter]);

  function openNew() {
    setEditingId(null);
    setDraft(blank());
    setEditorOpen(true);
    setNotice('');
  }
  function openEdit(row: RecordRow) {
    setEditingId(row.id);
    setDraft({ name: row.name, email: row.email, category: row.category, status: row.status, notes: row.notes });
    setEditorOpen(true);
    setNotice('');
  }
  function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!draft.name.trim()) return;
    const now = new Date().toISOString();
    if (editingId) {
      persist(rows.map(row => row.id === editingId ? { ...row, ...draft, name: draft.name.trim(), updatedAt: now } : row));
    } else {
      persist([{ ...draft, name: draft.name.trim(), id: globalThis.crypto?.randomUUID?.() || String(Date.now()), updatedAt: now }, ...rows]);
    }
    setEditorOpen(false);
  }
  function remove(id: string) {
    if (!window.confirm('Delete this record? This only removes the record saved in this browser.')) return;
    persist(rows.filter(row => row.id !== id));
  }
  function exportCsv() {
    const escape = (value: string) => '"' + value.replace(/"/g, '""') + '"';
    const csv = [['Name / Title', 'Email / Reference', 'Department / Category', 'Status', 'Notes', 'Updated at'], ...filtered.map(row => [row.name, row.email, row.category, row.status, row.notes, row.updatedAt])].map(line => line.map(escape).join(',')).join('\r\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = page.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '.csv';
    link.click();
    URL.revokeObjectURL(url);
  }

  const activeCount = rows.filter(row => row.status === 'Active').length;
  const inactiveCount = rows.length - activeCount;
  const RecordIcon = page.toLowerCase().includes('report') || page.toLowerCase().includes('document') ? FileText : Users;
  return <div className="space-y-5">
    <section className="grid gap-3 sm:grid-cols-3">
      <div className="rounded-2xl border border-white bg-white p-4 shadow-sm"><div className="flex items-center justify-between text-xs font-semibold text-slate-500"><span>Total records</span><RecordIcon size={17} className="text-violet-600"/></div><p className="mt-3 text-2xl font-extrabold text-slate-900">{rows.length}</p><p className="mt-1 text-[11px] text-slate-500">Saved for {tenantName}</p></div>
      <div className="rounded-2xl border border-white bg-white p-4 shadow-sm"><div className="flex items-center justify-between text-xs font-semibold text-slate-500"><span>Active</span><CheckCircle2 size={17} className="text-emerald-600"/></div><p className="mt-3 text-2xl font-extrabold text-emerald-700">{activeCount}</p><p className="mt-1 text-[11px] text-slate-500">Currently marked active</p></div>
      <div className="rounded-2xl border border-white bg-white p-4 shadow-sm"><div className="flex items-center justify-between text-xs font-semibold text-slate-500"><span>Inactive</span><Archive size={17} className="text-slate-500"/></div><p className="mt-3 text-2xl font-extrabold text-slate-700">{inactiveCount}</p><p className="mt-1 text-[11px] text-slate-500">Not currently active</p></div>
    </section>
    <section className="overflow-hidden rounded-2xl border border-white bg-white shadow-sm">
      <div className="flex flex-col gap-4 border-b border-slate-100 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
        <div><h2 className="text-base font-extrabold text-slate-900">{page} records</h2><p className="mt-1 text-xs text-slate-500">Create, update, search, filter and export records.</p></div>
        <div className="flex flex-wrap gap-2"><button onClick={exportCsv} className="inline-flex items-center gap-2 rounded-xl border border-violet-100 px-3.5 py-2.5 text-xs font-bold text-violet-800 hover:bg-violet-50"><Download size={15}/> Export CSV</button><button onClick={openNew} className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#4b1682] to-[#7026a6] px-3.5 py-2.5 text-xs font-bold text-white shadow-sm hover:shadow-md"><Plus size={15}/> Add record</button></div>
      </div>
      <div className="flex flex-col gap-3 border-b border-slate-100 bg-slate-50/60 p-4 sm:flex-row">
        <label className="flex flex-1 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-slate-400"><Search size={16}/><input value={query} onChange={event => setQuery(event.target.value)} placeholder={'Search ' + page.toLowerCase() + '...'} className="w-full bg-transparent text-xs text-slate-700 outline-none placeholder:text-slate-400"/></label>
        <label className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs text-slate-500"><Filter size={15}/><select value={statusFilter} onChange={event => setStatusFilter(event.target.value)} className="bg-transparent font-semibold text-slate-700 outline-none"><option>All</option><option>Active</option><option>Inactive</option></select></label>
      </div>
      {notice && <div className="mx-4 mt-4 flex items-start gap-2 rounded-xl border border-emerald-100 bg-emerald-50 px-3 py-2.5 text-[11px] text-emerald-800 sm:mx-5"><CheckCircle2 size={15} className="mt-0.5 shrink-0"/>{notice}</div>}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-left">
          <thead className="bg-white text-[10px] uppercase tracking-[.12em] text-slate-400"><tr><th className="px-5 py-3 font-bold">Name / Title</th><th className="px-5 py-3 font-bold">Email / Reference</th><th className="px-5 py-3 font-bold">Category</th><th className="px-5 py-3 font-bold">Status</th><th className="px-5 py-3 text-right font-bold">Actions</th></tr></thead>
          <tbody className="divide-y divide-slate-100">{filtered.map(row => <tr key={row.id} className="transition hover:bg-violet-50/40"><td className="px-5 py-4"><div className="font-bold text-slate-800 text-xs">{row.name}</div>{row.notes && <div className="mt-1 max-w-xs truncate text-[10px] text-slate-400">{row.notes}</div>}</td><td className="px-5 py-4 text-xs text-slate-600">{row.email || '—'}</td><td className="px-5 py-4 text-xs text-slate-600">{row.category || '—'}</td><td className="px-5 py-4"><span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold ${row.status === 'Active' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}><span className={`h-1.5 w-1.5 rounded-full ${row.status === 'Active' ? 'bg-emerald-500' : 'bg-slate-400'}`}/>{row.status}</span></td><td className="px-5 py-4"><div className="flex justify-end gap-1"><button onClick={() => openEdit(row)} aria-label={'Edit ' + row.name} className="rounded-lg p-2 text-violet-700 hover:bg-violet-100"><Pencil size={15}/></button><button onClick={() => remove(row.id)} aria-label={'Delete ' + row.name} className="rounded-lg p-2 text-rose-600 hover:bg-rose-50"><Trash2 size={15}/></button></div></td></tr>)}</tbody>
        </table>
      </div>
      {filtered.length === 0 && <div className="flex flex-col items-center px-5 py-12 text-center"><span className="rounded-2xl bg-violet-50 p-4 text-violet-600"><Database size={25}/></span><h3 className="mt-3 text-sm font-extrabold text-slate-800">{rows.length ? 'No matching records' : 'No records yet'}</h3><p className="mt-1 max-w-md text-xs leading-5 text-slate-500">{rows.length ? 'Try a different search or status filter.' : 'Add your first record to start managing this module.'}</p>{!rows.length && <button onClick={openNew} className="mt-4 inline-flex items-center gap-2 rounded-xl bg-violet-700 px-4 py-2.5 text-xs font-bold text-white hover:bg-violet-800"><Plus size={15}/> Add first record</button>}</div>}
      <div className="flex items-center justify-between border-t border-slate-100 px-5 py-3 text-[10px] text-slate-400"><span>Showing {filtered.length} of {rows.length} records</span><span className="inline-flex items-center gap-1"><Clock3 size={12}/> Browser-saved workspace</span></div>
    </section>
    {editorOpen && <div className="fixed inset-0 z-[60] flex items-center justify-center bg-[#1a0c32]/50 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="module-editor-title"><form onSubmit={save} className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-3xl bg-white p-5 shadow-2xl sm:p-7"><div className="flex items-start justify-between gap-4"><div><p className="text-[10px] font-bold uppercase tracking-[.15em] text-violet-700">{page}</p><h2 id="module-editor-title" className="mt-1 text-xl font-extrabold text-slate-900">{editingId ? 'Edit record' : 'Add record'}</h2><p className="mt-1 text-xs text-slate-500">Enter the details below. Name / Title is required.</p></div><button type="button" onClick={() => setEditorOpen(false)} aria-label="Close form" className="rounded-xl p-2 text-slate-500 hover:bg-slate-100"><X size={18}/></button></div>
      <div className="mt-6 grid gap-4 sm:grid-cols-2">{fields.map((field, index) => <label key={field.key} className={field.key === 'notes' ? 'sm:col-span-2' : ''}><span className="mb-1.5 block text-xs font-bold text-slate-700">{labels[index]}{field.key === 'name' ? ' *' : ''}</span>{field.key === 'status' ? <select value={draft.status} onChange={event => setDraft(current => ({ ...current, status: event.target.value as RecordRow['status'] }))} className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm outline-none focus:border-violet-400 focus:ring-4 focus:ring-violet-100"><option>Active</option><option>Inactive</option></select> : field.key === 'notes' ? <textarea value={draft.notes} onChange={event => setDraft(current => ({ ...current, notes: event.target.value }))} placeholder={field.placeholder} rows={3} className="w-full resize-y rounded-xl border border-slate-200 px-3.5 py-3 text-sm outline-none focus:border-violet-400 focus:ring-4 focus:ring-violet-100"/> : <input required={field.key === 'name'} type={field.key === 'email' && draft.email.includes('@') ? 'email' : 'text'} value={draft[field.key]} onChange={event => setDraft(current => ({ ...current, [field.key]: event.target.value }))} placeholder={field.placeholder} className="w-full rounded-xl border border-slate-200 px-3.5 py-3 text-sm outline-none focus:border-violet-400 focus:ring-4 focus:ring-violet-100"/>}</label>)}</div>
      <div className="mt-6 flex justify-end gap-2 border-t border-slate-100 pt-4"><button type="button" onClick={() => setEditorOpen(false)} className="rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-50">Cancel</button><button type="submit" className="inline-flex items-center gap-2 rounded-xl bg-violet-700 px-4 py-2.5 text-xs font-bold text-white hover:bg-violet-800"><Save size={15}/>{editingId ? 'Save changes' : 'Create record'}</button></div>
    </form></div>}
  </div>;
}

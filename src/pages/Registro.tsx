import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { ClipboardList, User, AlertCircle } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { it } from 'date-fns/locale';

interface LogEntry {
  id_log: number;
  id_titolare: number;
  data_ora: string;
  azione: string;
  descrizione: string;
  utenti_titolari: {
    nome: string;
  } | null;
}

export const Registro: React.FC = () => {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('audit_log')
      .select('*, utenti_titolari(nome)')
      .order('data_ora', { ascending: false })
      .limit(100);

    if (!error && data) {
      setLogs(data as any);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-0.5">
        <h2 className="text-xl md:text-2xl font-bold tracking-tight text-slate-950">Registro Attività</h2>
        <p className="text-xs md:text-sm text-slate-500">Cronologia delle modifiche apportate dai titolari.</p>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white shadow-xs overflow-hidden">
        <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-700 flex items-center gap-2">
            <ClipboardList className="h-4 w-4 text-slate-400" />
            Ultimi 100 Eventi
          </h3>
        </div>

        {loading ? (
          <div className="p-12 text-center text-sm text-slate-400 animate-pulse">Caricamento registro...</div>
        ) : logs.length === 0 ? (
          <div className="p-12 text-center text-sm text-slate-400 flex flex-col items-center gap-2">
            <AlertCircle className="h-8 w-8 text-slate-300" />
            <p>Nessuna attività registrata nel sistema.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-slate-50 text-xs font-bold uppercase tracking-wider text-slate-400 border-b border-slate-200/60">
                  <th className="p-4 w-44">Data / Ora</th>
                  <th className="p-4 w-36">Titolare</th>
                  <th className="p-4 w-36">Operazione</th>
                  <th className="p-4">Dettagli Modifica</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {logs.map((log) => {
                  const dataLog = parseISO(log.data_ora);

                  let badgeColor = 'bg-slate-100 text-slate-700';
                  if (log.azione.includes('INSERT')) badgeColor = 'bg-emerald-50 text-emerald-700 border border-emerald-200/40';
                  if (log.azione.includes('DELETE')) badgeColor = 'bg-red-50 text-red-700 border border-red-200/40';
                  if (log.azione.includes('EDIT')) badgeColor = 'bg-amber-50 text-amber-700 border border-amber-200/40';

                  return (
                    <tr key={log.id_log} className="hover:bg-slate-50/40 transition-colors">
                      <td className="p-4 font-medium text-slate-500 tabular-nums whitespace-nowrap">
                        {format(dataLog, 'dd/MM/yyyy HH:mm', { locale: it })}
                      </td>
                      <td className="p-4 font-bold text-slate-900 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1">
                          <User className="h-3.5 w-3.5 text-slate-400" />
                          {log.utenti_titolari?.nome || 'Sistema'}
                        </span>
                      </td>
                      <td className="p-4 whitespace-nowrap">
                        <span className={`inline-flex items-center rounded px-2 py-0.5 text-[10px] font-black uppercase tracking-wider ${badgeColor}`}>
                          {log.azione.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="p-4 text-slate-700 font-semibold wrap-break-words max-w-xs md:max-w-none">
                        {log.descrizione}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
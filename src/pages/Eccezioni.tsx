import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useCamerieri } from '../hooks/useCamerieri';
import { formattaOrario } from '../lib/timeUtils';
import { CalendarX, Trash2, AlertCircle, User, Repeat, Filter } from 'lucide-react';
import { format, parseISO, isSameDay } from 'date-fns';
import { it } from 'date-fns/locale';

interface EccezioneGlobale {
  id_blocco: number;
  id_cameriere: number;
  data_ora_inizio: string;
  data_ora_fine: string;
  tipo_ricorrenza: string;
  id_gruppo_ricorrenza: number | null;
  camerieri: {
    nome: string;
    cognome: string;
  };
}

export const Eccezioni: React.FC = () => {
  const { camerieri } = useCamerieri();
  const [eccezioni, setEccezioni] = useState<EccezioneGlobale[]>([]);
  const [loading, setLoading] = useState(true);

  const [filtroCameriere, setFiltroCameriere] = useState<string>('');

  const fetchEccezioni = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('non_disponibilita')
      .select('*, camerieri(nome, cognome)')
      .gte('data_ora_fine', new Date().toISOString())
      .order('data_ora_inizio', { ascending: true });

    if (!error && data) {
      setEccezioni(data as any);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchEccezioni();
  }, [fetchEccezioni]);

  const handleRimuoviNd = async (id_blocco: number) => {
    await supabase.from('non_disponibilita').delete().eq('id_blocco', id_blocco);
    fetchEccezioni();
  };

  const handleRimuoviSerieNd = async (id_gruppo: number) => {
    if (confirm("Sei sicuro di voler eliminare TUTTE le settimane future di questa serie ricorrente?")) {
      await supabase.from('non_disponibilita').delete().eq('id_gruppo_ricorrenza', id_gruppo);
      fetchEccezioni();
    }
  };

  const eccezioniFiltrate = filtroCameriere 
    ? eccezioni.filter(nd => nd.id_cameriere.toString() === filtroCameriere)
    : eccezioni;

  return (
    <div className="space-y-6">

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex flex-col gap-0.5">
          <h2 className="text-xl md:text-2xl font-bold tracking-tight text-slate-950">Eccezioni Globali</h2>
          <p className="text-xs md:text-sm text-slate-500">Panoramica ferie e blocchi di tutto lo staff.</p>
        </div>

        <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-lg px-3 py-2 shadow-xs shrink-0">
          <Filter className="h-4 w-4 text-slate-400" />
          <select
            value={filtroCameriere}
            onChange={(e) => setFiltroCameriere(e.target.value)}
            className="bg-transparent border-none text-sm font-medium text-slate-700 focus:ring-0 cursor-pointer outline-none w-full sm:w-auto"
          >
            <option value="">Tutti</option>
            {camerieri.map(c => (
              <option key={c.id_cameriere} value={c.id_cameriere}>
                {c.nome} {c.cognome}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white shadow-xs overflow-hidden">
        <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-700 flex items-center gap-2">
            <CalendarX className="h-4 w-4 text-slate-400" />
            Prossimi Blocchi Attivi
          </h3>
          <span className="inline-flex items-center rounded-full bg-slate-200 px-2.5 py-0.5 text-xs font-semibold text-slate-700">
            {eccezioniFiltrate.length} {filtroCameriere ? 'Trovati' : 'Totali'}
          </span>
        </div>

        {loading ? (
          <div className="p-12 text-center text-sm text-slate-400 animate-pulse">Ricerca blocchi in corso...</div>
        ) : eccezioniFiltrate.length === 0 ? (
          <div className="p-12 text-center text-sm text-slate-400 flex flex-col items-center gap-2">
            <AlertCircle className="h-8 w-8 text-emerald-400" />
            <p>{filtroCameriere ? 'Questo ragazzo non ha blocchi o ferie programmate.' : 'Nessun ragazzo ha blocchi o ferie programmate.'}</p>
          </div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {eccezioniFiltrate.map((nd) => {
              const inizio = parseISO(nd.data_ora_inizio);
              const fine = parseISO(nd.data_ora_fine);
              const isStessoGiorno = isSameDay(inizio, fine);
              const nomeCompleto = `${nd.camerieri.nome} ${nd.camerieri.cognome}`;

              return (
                <li key={nd.id_blocco} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 hover:bg-slate-50 transition-colors gap-4">

                  <div className="flex items-start gap-3">
                    <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-500">
                      <User className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-slate-900">{nomeCompleto}</span>
                        {nd.tipo_ricorrenza === 'fisso' && (
                          <span className="flex items-center gap-1 rounded bg-red-100 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-red-700">
                            <Repeat className="h-3 w-3" /> Serie Fissa
                          </span>
                        )}
                      </div>
                      
                      <div className="mt-1 text-xs">
                        {isStessoGiorno ? (
                          <span className="text-slate-600 font-medium">
                            {format(inizio, "EEEE d MMMM yyyy", { locale: it })}
                            <span className="mx-1.5 text-slate-300">|</span>
                            <span className="text-red-600 font-bold bg-red-50 px-1.5 py-0.5 rounded">
                              {formattaOrario(nd.data_ora_inizio)} - {formattaOrario(nd.data_ora_fine)}
                            </span>
                          </span>
                        ) : (
                          <span className="text-slate-600 font-medium">
                            <span className="text-red-600 font-bold bg-red-50 px-1.5 py-0.5 rounded">
                              Dal {format(inizio, "dd/MM")} al {format(fine, "dd/MM")}
                            </span>
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Pulsanti Azione */}
                  <div className="flex items-center gap-2 sm:ml-auto pl-11 sm:pl-0">
                    {nd.id_gruppo_ricorrenza && (
                      <button 
                        onClick={() => handleRimuoviSerieNd(nd.id_gruppo_ricorrenza!)}
                        className="text-xs font-bold text-red-600 border border-red-200 px-3 py-1.5 rounded-lg hover:bg-red-50 hover:border-red-300 transition-colors cursor-pointer"
                      >
                        Cancella Intera Serie
                      </button>
                    )}
                    <button 
                      onClick={() => handleRimuoviNd(nd.id_blocco)} 
                      className="rounded-lg border border-slate-200 p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-500 hover:border-red-200 transition-colors cursor-pointer"
                      title="Elimina solo questo blocco"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>

                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
};
import React, { useState, useEffect, useLayoutEffect, useCallback, useRef, useMemo } from 'react';
import { useCamerieri } from '../hooks/useCamerieri';
import { useTurni, CandidatoConsigliato } from '../hooks/useTurni';
import { formattaEuro as toEuro } from '../lib/formatters';
import { calcolaOreDecimali, formattaOrario } from '../lib/timeUtils';
import { Plus, Users, Clock, Euro, Trash2, CalendarDays, AlertTriangle, ShieldCheck, Share2, Coffee, ChevronLeft, ChevronRight } from 'lucide-react';
import { startOfWeek, endOfWeek, addDays, format, isSameDay, startOfDay, subWeeks, addWeeks } from 'date-fns';
import { it } from 'date-fns/locale';
import { domToPng } from 'modern-screenshot';

const generaOpzioniOrari = () => {
  const orari = [];
  for (let h = 0; h < 24; h++) {
    const stringH = h.toString().padStart(2, '0');
    orari.push(`${stringH}:00`);
    orari.push(`${stringH}:30`);
  }
  return orari;
};

export const Dashboard: React.FC = () => {
  const { camerieri, loading: loadingStaff } = useCamerieri();
  const { turni, loading: loadingTurni, fetchTurniRange, aggiungiTurno, eliminaTurno, elaboraConsigliere } = useTurni();
  
  const [dataSelezionata, setDataSelezionata] = useState<Date>(startOfDay(new Date()));
  const [meseVisibile, setMeseVisibile] = useState<Date>(startOfDay(new Date()));
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const scrollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [erroreValidazione, setErroreValidazione] = useState<string | null>(null);
  const [candidati, setCandidati] = useState<CandidatoConsigliato[]>([]);
  const [loadingConsigliere, setLoadingConsigliere] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false); 

  const exportRef = useRef<HTMLDivElement>(null);
  const opzioniOrari = generaOpzioniOrari();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [nuovoTurno, setNuovoTurno] = useState({
    id_cameriere: '',
    ora_inizio: '18:00',
    ora_fine: '23:30'
  });

  const oraAttuale = new Date();
  const isOggi = isSameDay(dataSelezionata, oraAttuale);

  const giorniScroll = useMemo(() => {
    const base = startOfDay(new Date());
    return Array.from({ length: 180 }, (_, i) => addDays(base, i - 60));
  }, []);

  useLayoutEffect(() => {
    if (scrollContainerRef.current) {
      const container = scrollContainerRef.current;
      const btn = container.querySelector(`[data-date="${dataSelezionata.toISOString()}"]`) as HTMLElement;
      if (btn) {
        container.scrollLeft = btn.offsetLeft - (container.clientWidth / 2) + (btn.clientWidth / 2);
      }
    }
  }, []);

  const scrollADataMorbido = useCallback((data: Date) => {
    setTimeout(() => {
      if (scrollContainerRef.current) {
        const btn = scrollContainerRef.current.querySelector(`[data-date="${data.toISOString()}"]`);
        if (btn) {
          btn.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
        }
      }
    }, 10);
  }, []);

  const handleScroll = () => {
    if (scrollTimeoutRef.current) return;
    
    scrollTimeoutRef.current = setTimeout(() => {
      if (scrollContainerRef.current) {
        const container = scrollContainerRef.current;
        const containerLeft = container.getBoundingClientRect().left;
        
        for (let i = 0; i < container.children.length; i++) {
          const child = container.children[i] as HTMLElement;
          if (child.getBoundingClientRect().right > containerLeft + 20) {
            const dateStr = child.getAttribute('data-date');
            if (dateStr) {
              const dataElemento = new Date(dateStr);
              setMeseVisibile(prev => prev.getMonth() !== dataElemento.getMonth() ? dataElemento : prev);
            }
            break;
          }
        }
      }
      scrollTimeoutRef.current = null;
    }, 50);
  };

  const settimanaPrecedente = () => {
    setDataSelezionata(prev => {
      const next = subWeeks(prev, 1);
      scrollADataMorbido(next);
      return next;
    });
  };

  const settimanaSuccessiva = () => {
    setDataSelezionata(prev => {
      const next = addWeeks(prev, 1);
      scrollADataMorbido(next);
      return next;
    });
  };

  const tornaAdOggi = useCallback(() => {
    const oggi = startOfDay(new Date());
    setDataSelezionata(oggi);
    setMeseVisibile(oggi);
    scrollADataMorbido(oggi);
  }, [scrollADataMorbido]);

  const aggiornaTabellone = useCallback(() => {
    const inizio = startOfWeek(dataSelezionata, { weekStartsOn: 1 }).toISOString();
    const fine = endOfWeek(dataSelezionata, { weekStartsOn: 1 }).toISOString();
    fetchTurniRange(inizio, fine);
  }, [dataSelezionata, fetchTurniRange]);

  useEffect(() => {
    aggiornaTabellone();
  }, [aggiornaTabellone]);

  useEffect(() => {
    if (!isModalOpen || camerieri.length === 0) return;

    const calcolaCandidatiLive = async () => {
      setLoadingConsigliere(true);
      const dataStr = format(dataSelezionata, 'yyyy-MM-dd');
      const inizioDate = new Date(`${dataStr}T${nuovoTurno.ora_inizio}:00`);
      let fineDate = new Date(`${dataStr}T${nuovoTurno.ora_fine}:00`);

      if (fineDate <= inizioDate) {
        fineDate = addDays(fineDate, 1);
      }

      const classifica = await elaboraConsigliere(inizioDate.toISOString(), fineDate.toISOString(), camerieri);
      setCandidati(classifica);
      setLoadingConsigliere(false);
    };

    calcolaCandidatiLive();
  }, [isModalOpen, nuovoTurno.ora_inizio, nuovoTurno.ora_fine, dataSelezionata, camerieri, elaboraConsigliere]);

  const turniDelGiorno = turni.filter(t => isSameDay(new Date(t.data_ora_inizio), dataSelezionata));
  
  const turniCronologici = [...turniDelGiorno].sort((a, b) => new Date(a.data_ora_inizio).getTime() - new Date(b.data_ora_inizio).getTime());
  
  const turniRaggruppati = Object.values(
    turniCronologici.reduce((acc, turno) => {
      if (!acc[turno.id_cameriere]) {
        acc[turno.id_cameriere] = {
          cameriere: camerieri.find(c => c.id_cameriere === turno.id_cameriere),
          fasce: []
        };
      }
      acc[turno.id_cameriere].fasce.push(turno);
      return acc;
    }, {} as Record<number, { cameriere: any, fasce: any[] }>)
  ).sort((a, b) => new Date(a.fasce[0].data_ora_inizio).getTime() - new Date(b.fasce[0].data_ora_inizio).getTime());

  const oreTotaliGiorno = turniDelGiorno.reduce((acc, t) => acc + calcolaOreDecimali(t.data_ora_inizio, t.data_ora_fine), 0);
  const budgetGiorno = turniDelGiorno.reduce((acc, t) => {
    const cameriere = camerieri.find(c => c.id_cameriere === t.id_cameriere);
    const tariffa = cameriere ? Number(cameriere.tariffa_oraria) : 0;
    return acc + (calcolaOreDecimali(t.data_ora_inizio, t.data_ora_fine) * tariffa);
  }, 0);

  const turniInCorso: any[] = [];
  const turniFuturi: any[] = [];
  const turniPassati: any[] = [];

  turniDelGiorno.forEach(t => {
    const inizio = new Date(t.data_ora_inizio);
    const fine = new Date(t.data_ora_fine);

    if (fine < oraAttuale) {
      turniPassati.push(t);
    } else if (inizio <= oraAttuale && fine >= oraAttuale) {
      turniInCorso.push(t);
    } else {
      turniFuturi.push(t);
    }
  });

  const ragazziAttiviOra = new Set(turniInCorso.map(t => t.id_cameriere)).size;

  const handleSalvaTurno = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nuovoTurno.id_cameriere || isSubmitting) return;

    setIsSubmitting(true);
    setErroreValidazione(null);

    const idCameriereNum = parseInt(nuovoTurno.id_cameriere);
    const candidatoScelto = candidati.find(c => c.cameriere.id_cameriere === idCameriereNum);

    if (!candidatoScelto || candidatoScelto.stato === 'bloccato') {
      setErroreValidazione("Impossibile salvare. Dipendente non disponibile.");
      setIsSubmitting(false);
      return;
    }

    const dataStr = format(dataSelezionata, 'yyyy-MM-dd');
    const inizioDate = new Date(`${dataStr}T${nuovoTurno.ora_inizio}:00`);
    let fineDate = new Date(`${dataStr}T${nuovoTurno.ora_fine}:00`);

    if (fineDate <= inizioDate) {
      fineDate = addDays(fineDate, 1);
    }

    try {
      const nomeCompleto = `${candidatoScelto.cameriere.nome} ${candidatoScelto.cameriere.cognome}`;
      await aggiungiTurno(idCameriereNum, inizioDate.toISOString(), fineDate.toISOString(), nomeCompleto);
      setIsModalOpen(false);
      setNuovoTurno({ id_cameriere: '', ora_inizio: '18:00', ora_fine: '23:30' });
      aggiornaTabellone();
    } catch {
      setErroreValidazione("Errore di rete.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancellazioneRapida = async (id_turno: number, id_cameriere: number, inizio: string, fine: string) => {
    const cameriere = camerieri.find(c => c.id_cameriere === id_cameriere);
    const nomeCompleto = cameriere ? `${cameriere.nome} ${cameriere.cognome}` : 'Dipendente';
    const infoOrario = `${format(new Date(inizio), 'dd/MM')} dalle ${formattaOrario(inizio)} alle ${formattaOrario(fine)}`;
    
    await eliminaTurno(id_turno, nomeCompleto, infoOrario);
    aggiornaTabellone();
  };

  const esportaTabellone = async () => {
    if (!exportRef.current) return;
    setIsExporting(true);
    
    setTimeout(async () => {
      try {
        const dataUrl = await domToPng(exportRef.current!, { quality: 1, scale: 2.5 });
        const nomeGiorno = format(dataSelezionata, "EEEE_d_MMMM", { locale: it });
        const link = document.createElement('a');
        link.download = `Turni_Bar_${nomeGiorno}.png`;
        link.href = dataUrl;
        link.click();
      } catch (err) {
        alert("Impossibile generare l'immagine.");
      } finally {
        setIsExporting(false);
      }
    }, 150); 
  };

  const renderRigaTurno = (turno: any, isActive: boolean = false) => {
    const cameriere = camerieri.find(c => c.id_cameriere === turno.id_cameriere);
    const ore = calcolaOreDecimali(turno.data_ora_inizio, turno.data_ora_fine);
    
    return (
      <li key={turno.id_turno} className={`flex items-center justify-between p-4 transition-colors ${isActive ? 'bg-emerald-50/50' : 'bg-white hover:bg-slate-50'}`}>
        <div className="flex flex-col gap-1 min-w-0 pr-4">
          <span className="font-bold text-sm text-slate-900 truncate">
            {cameriere ? `${cameriere.nome} ${cameriere.cognome}` : 'Dipendente'}
          </span>
          <div className="flex items-center gap-2 text-xs">
            <span className={`inline-flex items-center rounded-md px-2 py-0.5 font-bold ring-1 ring-inset tabular-nums ${isActive ? 'bg-emerald-100 text-emerald-800 ring-emerald-600/20' : 'bg-blue-50 text-blue-700 ring-blue-700/10'}`}>
              {formattaOrario(turno.data_ora_inizio)} - {formattaOrario(turno.data_ora_fine)}
            </span>
            {!isExporting && <span className="text-slate-400 font-medium">({ore}h)</span>}
          </div>
        </div>
        
        {!isExporting && (
          <button onClick={() => handleCancellazioneRapida(turno.id_turno, turno.id_cameriere, turno.data_ora_inizio, turno.data_ora_fine)} className="rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-500 active:scale-95 transition-all cursor-pointer shrink-0">
            <Trash2 className="h-4 w-4" />
          </button>
        )}
      </li>
    );
  };

  return (
    <div className="space-y-6 relative overflow-x-hidden">
      
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex flex-col gap-0.5">
          <h2 className="text-xl md:text-2xl font-bold tracking-tight text-slate-950">Orari Settimanali</h2>
          <p className="text-xs md:text-sm text-slate-500">Gestione dinamica a scatti di 30 minuti.</p>
        </div>
        <div className="flex w-full sm:w-auto items-center gap-3 mt-1 sm:mt-0">
          <button onClick={esportaTabellone} disabled={isExporting || turniDelGiorno.length === 0} className="flex flex-1 sm:flex-none justify-center items-center gap-2 rounded-xl border border-slate-200 bg-white py-3.5 sm:px-3.5 sm:py-2.5 text-[15px] sm:text-sm font-bold text-slate-700 shadow-sm hover:bg-slate-50 transition-all cursor-pointer disabled:opacity-50">
            <Share2 className="h-5 w-5 sm:h-4 sm:w-4 text-emerald-600 shrink-0" />
            <span className="truncate">{isExporting ? 'Creazione...' : 'Invia Staff'}</span>
          </button>
          
          <button onClick={() => { setErroreValidazione(null); setIsModalOpen(true); }} className="flex flex-1 sm:flex-none justify-center items-center gap-2 rounded-xl bg-amber-500 py-3.5 sm:px-3.5 sm:py-2.5 text-[15px] sm:text-sm font-bold text-slate-950 shadow-sm hover:bg-amber-400 active:scale-95 transition-all cursor-pointer">
            <Plus className="h-5 w-5 sm:h-4 sm:w-4 shrink-0" />
            <span className="truncate">Nuovo Turno</span>
          </button>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
        
        <div className="flex items-center justify-between bg-slate-50 border-b border-slate-200 px-4 py-3">
          <button onClick={settimanaPrecedente} className="p-1.5 text-slate-400 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer" title="Settimana precedente">
            <ChevronLeft className="h-5 w-5" />
          </button>
          
          <div className="flex items-center gap-3">
            <span className="text-sm font-bold text-slate-800 capitalize transition-all duration-300">
              {format(meseVisibile, "MMMM yyyy", { locale: it })}
            </span>
            <button onClick={tornaAdOggi} className="text-[10px] font-bold uppercase tracking-wider text-amber-700 bg-amber-100 px-3 py-1.5 rounded-md hover:bg-amber-200 transition-colors cursor-pointer shadow-xs">
              Oggi
            </button>
          </div>

          <button onClick={settimanaSuccessiva} className="p-1.5 text-slate-400 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer" title="Settimana successiva">
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>

        <div 
          ref={scrollContainerRef}
          onScroll={handleScroll}
          className="flex overflow-x-auto gap-2 p-3 scrollbar-none"
        >
          {giorniScroll.map((giorno) => {
            const isSelected = isSameDay(giorno, dataSelezionata);
            const isTodayDay = isSameDay(giorno, oraAttuale);
            
            return (
              <button
                key={giorno.toISOString()}
                data-date={giorno.toISOString()}
                onClick={() => {
                  setDataSelezionata(giorno);
                  scrollADataMorbido(giorno);
                }}
                className={`relative shrink-0 flex flex-col items-center justify-center min-w-18 py-2.5 px-3 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                  isSelected ? 'bg-slate-900 text-white shadow-md' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                }`}
              >
                <span className={`uppercase text-[9px] font-bold ${isSelected ? 'opacity-80' : 'opacity-50 text-slate-400'}`}>
                  {format(giorno, 'eee', { locale: it })}
                </span>
                <span className="text-base font-bold mt-0.5">
                  {format(giorno, 'd')}
                </span>
                
                {isTodayDay && !isSelected && (
                  <div className="absolute bottom-1 w-2.5 h-1 rounded-full bg-amber-500"></div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {!isExporting && (
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
          <div className="flex items-center gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
            <div className="p-2 rounded-lg bg-blue-50 text-blue-600"><Clock className="h-5 w-5" /></div>
            <div>
              <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Ore Pianificate</p>
              <p className="text-lg font-bold tabular-nums text-slate-900">{oreTotaliGiorno}h</p>
            </div>
          </div>
          <div className="flex items-center gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
            <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600"><Euro className="h-5 w-5" /></div>
            <div>
              <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Costo Personale</p>
              <p className="text-lg font-bold tabular-nums text-slate-900">{toEuro(budgetGiorno)}</p>
            </div>
          </div>
          <div className="hidden lg:flex items-center gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
            <div className="p-2 rounded-lg bg-purple-50 text-purple-600"><Users className="h-5 w-5" /></div>
            <div>
              <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Al Bar Ora</p>
              <p className="text-lg font-bold text-slate-900">{ragazziAttiviOra} in turno</p>
            </div>
          </div>
        </div>
      )}

      <div className={`rounded-xl border border-slate-200 bg-white shadow-xs overflow-hidden ${isExporting ? 'opacity-0' : ''}`}>
        <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-700 flex items-center gap-2">
            <CalendarDays className="h-4 w-4 text-slate-400" />
            Turni per {format(dataSelezionata, "eeee d MMMM", { locale: it })}
          </h3>
        </div>

        {loadingTurni || loadingStaff ? (
          <div className="p-8 text-center text-sm text-slate-400 animate-pulse">Aggiornamento orari...</div>
        ) : turniDelGiorno.length === 0 ? (
          <div className="p-12 text-center text-sm text-slate-400">Nessun cameriere pianificato.</div>
        ) : (
          <div className="divide-y divide-slate-100 flex flex-col">
            {turniInCorso.length > 0 && (
              <div className="pb-2">
                <div className="px-4 py-2 bg-emerald-50/50 flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></div>
                  <span className="text-xs font-bold uppercase tracking-wider text-emerald-800">In Turno Ora</span>
                </div>
                <ul className="divide-y divide-slate-100">{turniInCorso.map(t => renderRigaTurno(t, true))}</ul>
              </div>
            )}

            {turniFuturi.length > 0 && (
              <div className="pb-2">
                <div className="px-4 py-2 bg-slate-50 flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-blue-500"></div>
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-600">Prossimi Turni</span>
                </div>
                <ul className="divide-y divide-slate-100">{turniFuturi.map(t => renderRigaTurno(t, false))}</ul>
              </div>
            )}

            {(!isOggi && turniPassati.length > 0) && (
              <div className="pb-2 opacity-75">
                <div className="px-4 py-2 bg-slate-50 flex items-center gap-2 border-t border-slate-100">
                  <div className="h-2 w-2 rounded-full bg-slate-400"></div>
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Turni Conclusi</span>
                </div>
                <ul className="divide-y divide-slate-100 grayscale-50">{turniPassati.map(t => renderRigaTurno(t, false))}</ul>
              </div>
            )}
          </div>
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-xl border border-slate-100 animate-in zoom-in-95 duration-200">
            <h3 className="text-lg font-bold text-slate-900 mb-4">Aggiungi Turno</h3>
            
            <form onSubmit={handleSalvaTurno} className="space-y-4">
              {erroreValidazione && (
                <div className="flex items-start gap-2 rounded-lg bg-red-50 p-2.5 text-xs text-red-700 border border-red-200">
                  <AlertTriangle className="h-4 w-4 shrink-0 text-red-500 mt-0.5" />
                  <span>{erroreValidazione}</span>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">Ora Inizio</label>
                  <select value={nuovoTurno.ora_inizio} onChange={(e) => setNuovoTurno({ ...nuovoTurno, ora_inizio: e.target.value })} className="block w-full rounded-lg border border-slate-300 bg-slate-50 p-2.5 text-sm focus:border-amber-500 text-center font-semibold">
                    {opzioniOrari.map(o => <option key={`ini-${o}`} value={o}>{o}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">Ora Fine</label>
                  <select value={nuovoTurno.ora_fine} onChange={(e) => setNuovoTurno({ ...nuovoTurno, ora_fine: e.target.value })} className="block w-full rounded-lg border border-slate-300 bg-slate-50 p-2.5 text-sm focus:border-amber-500 text-center font-semibold">
                    {opzioniOrari.map(o => <option key={`fin-${o}`} value={o}>{o}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">Assegna a</label>
                <select value={nuovoTurno.id_cameriere} onChange={(e) => setNuovoTurno({ ...nuovoTurno, id_cameriere: e.target.value })} className="block w-full rounded-lg border border-slate-300 bg-slate-50 p-2.5 text-sm focus:border-amber-500" required disabled={loadingConsigliere}>
                  <option value="">{loadingConsigliere ? 'Calcolo...' : 'Scegli ragazzo...'}</option>
                  {candidati.map(c => {
                    let etichetta = `🟢 ${c.cameriere.nome} [${c.orePregresse}h]`;
                    if (c.stato === 'affaticato') etichetta = `⚠️ ${c.cameriere.nome} [Affaticato]`;
                    if (c.stato === 'bloccato') etichetta = `❌ ${c.cameriere.nome} [${c.motivoBlocco}]`;

                    return (
                      <option key={c.cameriere.id_cameriere} value={c.cameriere.id_cameriere} disabled={c.stato === 'bloccato'} className={c.stato === 'bloccato' ? 'text-slate-400 bg-slate-100' : ''}>
                        {etichetta}
                      </option>
                    );
                  })}
                </select>
                <p className="text-[10px] text-slate-400 mt-1 flex items-center gap-1"><ShieldCheck className="h-3 w-3 text-amber-500" /> Ordinati automaticamente per carichi ed equità.</p>
              </div>

              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 rounded-lg border border-slate-200 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer">Annulla</button>
                <button type="submit" disabled={loadingConsigliere || !nuovoTurno.id_cameriere || isSubmitting} className="flex-1 rounded-lg bg-amber-500 py-2.5 text-sm font-semibold text-slate-950 hover:bg-amber-400 disabled:opacity-40 cursor-pointer">
                  {isSubmitting ? 'Salvataggio...' : 'Conferma'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* TEMPLATE WHATSAPP */}
      <div className="absolute top-0 -left-2499.75 w-105 bg-slate-900 overflow-hidden" ref={exportRef}>
        <div className="bg-linear-to-b from-slate-800 to-slate-900 p-8 pb-6 border-b border-white/10">
          <div className="flex items-center gap-3 mb-6">
            <div className="bg-amber-500 text-slate-900 p-2 rounded-xl"><Coffee className="h-8 w-8" /></div>
            <div>
              <h1 className="text-2xl font-black text-white tracking-tight leading-none">Bar Manager</h1>
              <p className="text-amber-500 text-xs font-bold uppercase tracking-widest mt-0.5">Turni Ufficiali</p>
            </div>
          </div>
          <h2 className="text-4xl font-black text-white capitalize leading-tight">{format(dataSelezionata, "EEEE", { locale: it })}</h2>
          <p className="text-xl text-slate-400 font-medium">{format(dataSelezionata, "d MMMM yyyy", { locale: it })}</p>
        </div>

        <div className="p-6 min-h-100">
          {turniRaggruppati.length === 0 ? (
            <div className="flex items-center justify-center h-full text-slate-500 font-medium italic">Nessun turno previsto.</div>
          ) : (
            <div className="flex flex-col gap-4">
              {turniRaggruppati.map((gruppo) => {
                const c = gruppo.cameriere;
                return (
                  <div key={c?.id_cameriere || Math.random()} className="flex items-stretch bg-white/5 rounded-2xl border border-white/10 overflow-hidden">
                    <div className="w-3 bg-amber-500 shrink-0"></div>
                    <div className="flex-1 p-4 flex flex-col items-start justify-center gap-2">
                      <div className="text-[17px] font-bold text-white leading-tight">{c ? `${c.nome} ${c.cognome}` : 'Dipendente'}</div>
                      <div className="flex items-center text-[15px] font-black text-amber-400 tabular-nums tracking-tight bg-amber-500/10 px-3 py-1.5 rounded-lg border border-amber-500/20">
                        {gruppo.fasce.map((turno, index) => (
                          <React.Fragment key={turno.id_turno}>
                            {index > 0 && <span className="mx-2 text-amber-500/40 font-normal">/</span>}
                            <span>{formattaOrario(turno.data_ora_inizio)} - {formattaOrario(turno.data_ora_fine)}</span>
                          </React.Fragment>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
        <div className="p-6 text-center text-slate-600 text-[10px] font-bold uppercase tracking-widest border-t border-white/5">Generato automaticamente • Buon Lavoro!</div>
      </div>

    </div>
  );
};
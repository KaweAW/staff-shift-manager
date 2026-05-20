import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useCamerieri, Cameriere } from '../hooks/useCamerieri';
import { formattaEuro } from '../lib/formatters';
import { formattaOrario } from '../lib/timeUtils';
import { Plus, User, Phone, Euro, Edit2, Trash2, CalendarX, AlertCircle, Save, Repeat } from 'lucide-react';
import { format, parseISO, isSameDay, addWeeks, differenceInWeeks, addDays } from 'date-fns';
import { it } from 'date-fns/locale';

interface NonDisponibilita {
  id_blocco: number;
  data_ora_inizio: string;
  data_ora_fine: string;
  tipo_ricorrenza: string;
  id_gruppo_ricorrenza: number | null;
}

export const Staff: React.FC = () => {
  const { camerieri, loading, aggiungiCameriere, aggiornaCameriere, eliminaCameriere } = useCamerieri();
  
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [nuovoCameriere, setNuovoCameriere] = useState({
    nome: '', cognome: '', tariffa_oraria: '', telefono: '', note: '', sesso: 'uomo' as 'uomo' | 'donna'
  });

  const [selectedStaff, setSelectedStaff] = useState<Cameriere | null>(null);
  const [editForm, setEditForm] = useState<Partial<Cameriere>>({});
  const [isEditingInfo, setIsEditingInfo] = useState(false);
  
  const [nds, setNds] = useState<NonDisponibilita[]>([]);
  const [loadingNds, setLoadingNds] = useState(false);

  const [nuovaNd, setNuovaNd] = useState({
    tipo: 'singolo' as 'singolo' | 'fisso',
    data_inizio: format(new Date(), 'yyyy-MM-dd'),
    ora_inizio: '00:00',
    data_fine: format(new Date(), 'yyyy-MM-dd'),
    ora_fine: '23:59',
    data_fine_ricorrenza: format(addWeeks(new Date(), 4), 'yyyy-MM-dd')
  });

  const fetchNds = useCallback(async (id_cameriere: number) => {
    setLoadingNds(true);
    const { data } = await supabase
      .from('non_disponibilita')
      .select('*')
      .eq('id_cameriere', id_cameriere)
      .gte('data_ora_fine', new Date().toISOString())
      .order('data_ora_inizio', { ascending: true });
    
    setNds(data || []);
    setLoadingNds(false);
  }, []);

  useEffect(() => {
    if (selectedStaff) {
      fetchNds(selectedStaff.id_cameriere);
      setEditForm(selectedStaff);
      setIsEditingInfo(false);
    }
  }, [selectedStaff, fetchNds]);

  const handleAggiungi = async (e: React.FormEvent) => {
    e.preventDefault();
    await aggiungiCameriere({
      nome: nuovoCameriere.nome,
      cognome: nuovoCameriere.cognome,
      tariffa_oraria: parseFloat(nuovoCameriere.tariffa_oraria.replace(',', '.')),
      telefono: nuovoCameriere.telefono || null,
      note: nuovoCameriere.note || null,
      sesso: nuovoCameriere.sesso
    });
    setIsAddModalOpen(false);
    setNuovoCameriere({ nome: '', cognome: '', tariffa_oraria: '', telefono: '', note: '', sesso: 'uomo' });
  };

  const handleSalvaModifiche = async () => {
    if (!selectedStaff || !editForm.nome || !editForm.tariffa_oraria) return;
    await aggiornaCameriere(selectedStaff.id_cameriere, {
      nome: editForm.nome,
      cognome: editForm.cognome,
      tariffa_oraria: typeof editForm.tariffa_oraria === 'string' ? parseFloat((editForm.tariffa_oraria as string).replace(',', '.')) : editForm.tariffa_oraria,
      telefono: editForm.telefono || null,
      note: editForm.note || null,
      sesso: editForm.sesso
    });
    setIsEditingInfo(false);
    setSelectedStaff({ ...selectedStaff, ...editForm } as Cameriere);
  };

  const handleEliminaCameriere = async (id: number, nome: string) => {
    if (confirm(`Archiviare ${nome}?`)) {
      await eliminaCameriere(id, nome);
      setSelectedStaff(null);
    }
  };

  const handleAggiungiNd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStaff) return;

    let inizioBase: Date;
    let fineBase: Date;

    if (nuovaNd.tipo === 'singolo') {
      inizioBase = new Date(`${nuovaNd.data_inizio}T${nuovaNd.ora_inizio}:00`);
      fineBase = new Date(`${nuovaNd.data_fine}T${nuovaNd.ora_fine}:00`);
    } else {
      inizioBase = new Date(`${nuovaNd.data_inizio}T${nuovaNd.ora_inizio}:00`);
      fineBase = new Date(`${nuovaNd.data_inizio}T${nuovaNd.ora_fine}:00`);
      if (fineBase <= inizioBase) {
        fineBase = addDays(fineBase, 1);
      }
    }

    if (fineBase <= inizioBase) {
      alert("L'orario o la data di fine devono essere successivi all'inizio.");
      return;
    }

    const bulkRecords = [];
    const idGruppo = nuovaNd.tipo === 'fisso' ? Math.floor(Math.random() * 2000000000) : null;
    
    let cicli = 1;
    if (nuovaNd.tipo === 'fisso') {
      const fineRicorrenza = new Date(`${nuovaNd.data_fine_ricorrenza}T23:59:59`);
      if (fineRicorrenza <= inizioBase) {
        alert("La data di 'Fine Serie' deve essere successiva al giorno di inizio.");
        return;
      }
      cicli = differenceInWeeks(fineRicorrenza, inizioBase) + 1;
      if (cicli > 52) cicli = 52;
    }

    for (let i = 0; i < cicli; i++) {
      bulkRecords.push({
        id_cameriere: selectedStaff.id_cameriere,
        data_ora_inizio: addWeeks(inizioBase, i).toISOString(),
        data_ora_fine: addWeeks(fineBase, i).toISOString(),
        tipo_ricorrenza: nuovaNd.tipo,
        id_gruppo_ricorrenza: idGruppo
      });
    }

    const { error } = await supabase.from('non_disponibilita').insert(bulkRecords);
    
    if (error) {
      alert("Errore salvataggio: " + error.message);
      return;
    }

    setNuovaNd(prev => ({ ...prev, ora_inizio: '00:00', ora_fine: '23:59' }));
    fetchNds(selectedStaff.id_cameriere);
  };

  const handleRimuoviNd = async (id_blocco: number) => {
    await supabase.from('non_disponibilita').delete().eq('id_blocco', id_blocco);
    if (selectedStaff) fetchNds(selectedStaff.id_cameriere);
  };

  const handleRimuoviSerieNd = async (id_gruppo: number) => {
    if (confirm("Vuoi cancellare tutte le occorrenze di questa serie?")) {
      await supabase.from('non_disponibilita').delete().eq('id_gruppo_ricorrenza', id_gruppo);
      if (selectedStaff) fetchNds(selectedStaff.id_cameriere);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div className="flex flex-col gap-0.5">
          <h2 className="text-xl md:text-2xl font-bold tracking-tight text-slate-950">Gestione Staff</h2>
          <p className="text-xs md:text-sm text-slate-500">Anagrafiche, contatti ed eccezioni orarie.</p>
        </div>
        <button
          onClick={() => setIsAddModalOpen(true)}
          className="flex items-center gap-1.5 rounded-lg bg-slate-900 px-3.5 py-2.5 text-sm font-semibold text-white shadow-xs hover:bg-slate-800 transition-all cursor-pointer"
        >
          <Plus className="h-4 w-4" />
          <span className="hidden sm:inline">Nuovo Ragazzo</span>
        </button>
      </div>

      {loading ? (
        <div className="text-center p-12 text-sm text-slate-400 animate-pulse">Caricamento staff...</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {camerieri.map((c) => (
            <div 
              key={c.id_cameriere}
              onClick={() => setSelectedStaff(c)}
              className="group flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-5 shadow-xs hover:shadow-md hover:border-slate-300 transition-all cursor-pointer active:scale-[0.98]"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className={`flex h-10 w-10 items-center justify-center rounded-full transition-colors ${c.sesso === 'donna' ? 'bg-pink-100 text-pink-600 group-hover:bg-pink-200' : 'bg-blue-100 text-blue-600 group-hover:bg-blue-200'}`}>
                    <User className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900">{c.nome} {c.cognome}</h3>
                    <p className="text-xs text-slate-500 flex items-center gap-1">
                      <Euro className="h-3 w-3" /> {formattaEuro(c.tariffa_oraria)}/h
                    </p>
                  </div>
                </div>
              </div>
              <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3">
                <div className="flex items-center gap-1.5 text-xs text-slate-500">
                  <Phone className="h-3.5 w-3.5" />
                  {c.telefono ? <span>{c.telefono}</span> : <span className="italic opacity-60">Nessun numero</span>}
                </div>
                <Edit2 className="h-4 w-4 text-slate-300 group-hover:text-amber-500 transition-colors" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* MODALE NUOVO CAMERIERE */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl border border-slate-100 animate-in zoom-in-95 duration-200">
            <h3 className="text-lg font-bold text-slate-900 mb-4">Aggiungi in Anagrafica</h3>
            <form onSubmit={handleAggiungi} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">Nome *</label>
                  <input required type="text" value={nuovoCameriere.nome} onChange={e => setNuovoCameriere({...nuovoCameriere, nome: e.target.value})} className="block w-full rounded-lg border border-slate-300 bg-slate-50 p-2 text-sm focus:border-amber-500" />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">Cognome *</label>
                  <input required type="text" value={nuovoCameriere.cognome} onChange={e => setNuovoCameriere({...nuovoCameriere, cognome: e.target.value})} className="block w-full rounded-lg border border-slate-300 bg-slate-50 p-2 text-sm focus:border-amber-500" />
                </div>
              </div>
              
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-1">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">Sesso</label>
                  <select value={nuovoCameriere.sesso} onChange={e => setNuovoCameriere({...nuovoCameriere, sesso: e.target.value as 'uomo'|'donna'})} className="block w-full rounded-lg border border-slate-300 bg-slate-50 p-2 text-sm focus:border-amber-500">
                    <option value="uomo">Uomo</option>
                    <option value="donna">Donna</option>
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">Paga Oraria (€) *</label>
                  <input required type="number" step="0.5" value={nuovoCameriere.tariffa_oraria} onChange={e => setNuovoCameriere({...nuovoCameriere, tariffa_oraria: e.target.value})} className="block w-full rounded-lg border border-slate-300 bg-slate-50 p-2 text-sm focus:border-amber-500" placeholder="es. 10.50" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">Telefono</label>
                  <input type="tel" value={nuovoCameriere.telefono} onChange={e => setNuovoCameriere({...nuovoCameriere, telefono: e.target.value})} className="block w-full rounded-lg border border-slate-300 bg-slate-50 p-2 text-sm focus:border-amber-500" />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">Note</label>
                  <input type="text" value={nuovoCameriere.note} onChange={e => setNuovoCameriere({...nuovoCameriere, note: e.target.value})} className="block w-full rounded-lg border border-slate-300 bg-slate-50 p-2 text-sm focus:border-amber-500" />
                </div>
              </div>
              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => setIsAddModalOpen(false)} className="flex-1 rounded-lg border border-slate-200 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer">Annulla</button>
                <button type="submit" className="flex-1 rounded-lg bg-slate-900 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 cursor-pointer">Salva</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODALE GESTIONE */}
      {selectedStaff && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="flex flex-col w-full max-w-2xl max-h-[90dvh] rounded-xl bg-white shadow-xl border border-slate-100 animate-in zoom-in-95 duration-200 overflow-hidden">
            
            <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-6 py-4">
              <div className="flex items-center gap-3">
                <div className={`flex h-10 w-10 items-center justify-center rounded-full ${selectedStaff.sesso === 'donna' ? 'bg-pink-200 text-pink-700' : 'bg-blue-200 text-blue-700'}`}>
                  <User className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900 leading-tight">{selectedStaff.nome} {selectedStaff.cognome}</h3>
                  <p className="text-xs font-medium text-slate-500">Gestione Profilo</p>
                </div>
              </div>
              <button onClick={() => setSelectedStaff(null)} className="rounded-full p-2 text-slate-400 hover:bg-slate-200 hover:text-slate-900 transition-colors cursor-pointer">✕</button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-8">
              
              <section>
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-sm font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2">
                    <Edit2 className="h-4 w-4" /> Dati Anagrafici
                  </h4>
                  {!isEditingInfo ? (
                    <button onClick={() => setIsEditingInfo(true)} className="text-sm font-semibold text-amber-600 hover:text-amber-700 cursor-pointer">Modifica</button>
                  ) : (
                    <button onClick={handleSalvaModifiche} className="text-sm font-semibold text-emerald-600 hover:text-emerald-700 flex items-center gap-1 cursor-pointer"><Save className="h-4 w-4" /> Salva</button>
                  )}
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 rounded-xl border border-slate-100 bg-slate-50 p-4">
                  <div>
                    <p className="text-[10px] uppercase font-bold text-slate-400 mb-1">Sesso</p>
                    {isEditingInfo ? (
                      <select value={editForm.sesso} onChange={e => setEditForm({...editForm, sesso: e.target.value as 'uomo'|'donna'})} className="w-full rounded-md border border-slate-300 p-1.5 text-sm">
                        <option value="uomo">Uomo</option>
                        <option value="donna">Donna</option>
                      </select>
                    ) : (
                      <p className="font-semibold text-slate-900 capitalize">{selectedStaff.sesso}</p>
                    )}
                  </div>
                  <div>
                    <p className="text-[10px] uppercase font-bold text-slate-400 mb-1">Paga Oraria</p>
                    {isEditingInfo ? (
                      <input type="number" step="0.5" value={editForm.tariffa_oraria || ''} onChange={e => setEditForm({...editForm, tariffa_oraria: parseFloat(e.target.value)})} className="w-full rounded-md border border-slate-300 p-1.5 text-sm" />
                    ) : (
                      <p className="font-semibold text-slate-900">{formattaEuro(selectedStaff.tariffa_oraria)}/h</p>
                    )}
                  </div>
                  <div className="col-span-2 md:col-span-1">
                    <p className="text-[10px] uppercase font-bold text-slate-400 mb-1">Telefono</p>
                    {isEditingInfo ? (
                      <input type="text" value={editForm.telefono || ''} onChange={e => setEditForm({...editForm, telefono: e.target.value})} className="w-full rounded-md border border-slate-300 p-1.5 text-sm" />
                    ) : (
                      <p className="font-semibold text-slate-900">{selectedStaff.telefono || '-'}</p>
                    )}
                  </div>
                </div>
              </section>

              <section>
                <div className="mb-4">
                  <h4 className="text-sm font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2">
                    <CalendarX className="h-4 w-4" /> Eccezioni Orarie (ND)
                  </h4>
                </div>
                
                <form onSubmit={handleAggiungiNd} className="mb-6 space-y-4 rounded-xl border border-red-100 bg-red-50/30 p-4">
                  <div className="w-full">
                    <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Tipo di Blocco</label>
                    <select 
                      value={nuovaNd.tipo} 
                      onChange={e => setNuovaNd({...nuovaNd, tipo: e.target.value as 'singolo'|'fisso'})}
                      className="w-full rounded-md border border-slate-200 p-2 text-sm bg-white"
                    >
                      <option value="singolo">Singolo evento</option>
                      <option value="fisso">Serie Fissa</option>
                    </select>
                  </div>

                  {/* UI PER BLOCCO SINGOLO / FERIE */}
                  {nuovaNd.tipo === 'singolo' && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 animate-in fade-in">
                      <div>
                        <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Inizio</label>
                        <div className="flex gap-2">
                          <input required type="date" value={nuovaNd.data_inizio} onChange={e => setNuovaNd({...nuovaNd, data_inizio: e.target.value, data_fine: e.target.value})} className="w-full rounded-md border border-slate-200 p-2 text-sm bg-white" />
                          <input required type="time" value={nuovaNd.ora_inizio} onChange={e => setNuovaNd({...nuovaNd, ora_inizio: e.target.value})} className="w-24 rounded-md border border-slate-200 p-2 text-sm bg-white text-center shrink-0" />
                        </div>
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Fine</label>
                        <div className="flex gap-2">
                          <input required type="date" value={nuovaNd.data_fine} onChange={e => setNuovaNd({...nuovaNd, data_fine: e.target.value})} className="w-full rounded-md border border-slate-200 p-2 text-sm bg-white" />
                          <input required type="time" value={nuovaNd.ora_fine} onChange={e => setNuovaNd({...nuovaNd, ora_fine: e.target.value})} className="w-24 rounded-md border border-slate-200 p-2 text-sm bg-white text-center shrink-0" />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* UI PER SERIE FISSA */}
                  {nuovaNd.tipo === 'fisso' && (
                    <div className="space-y-4 animate-in fade-in">
                      <div className="grid grid-cols-3 gap-3">
                        <div className="col-span-3 sm:col-span-1">
                          <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Giorno</label>
                          <input required type="date" value={nuovaNd.data_inizio} onChange={e => setNuovaNd({...nuovaNd, data_inizio: e.target.value})} className="w-full rounded-md border border-slate-200 p-2 text-sm bg-white" />
                        </div>
                        <div className="col-span-1 sm:col-span-1">
                          <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Dalle ore</label>
                          <input required type="time" value={nuovaNd.ora_inizio} onChange={e => setNuovaNd({...nuovaNd, ora_inizio: e.target.value})} className="w-full rounded-md border border-slate-200 p-2 text-sm bg-white text-center" />
                        </div>
                        <div className="col-span-1 sm:col-span-1">
                          <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Alle ore</label>
                          <input required type="time" value={nuovaNd.ora_fine} onChange={e => setNuovaNd({...nuovaNd, ora_fine: e.target.value})} className="w-full rounded-md border border-slate-200 p-2 text-sm bg-white text-center" />
                        </div>
                      </div>
                      
                      <div className="border-t border-red-200 pt-3">
                        <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Ripeti Fino Al (Data Fine Serie)</label>
                        <input required type="date" value={nuovaNd.data_fine_ricorrenza} onChange={e => setNuovaNd({...nuovaNd, data_fine_ricorrenza: e.target.value})} className="w-full rounded-md border border-slate-200 p-2 text-sm bg-white" />
                      </div>
                    </div>
                  )}

                  <button type="submit" className="w-full rounded-md bg-red-500 py-2.5 text-sm font-bold text-white hover:bg-red-600 transition-all cursor-pointer">
                    Salva Blocco
                  </button>
                </form>

                {loadingNds ? (
                  <div className="text-center p-4 text-xs text-slate-400">Ricerca...</div>
                ) : nds.length === 0 ? (
                  <div className="flex items-center gap-2 rounded-lg border border-slate-100 bg-slate-50 p-4 text-sm text-slate-500">
                    <AlertCircle className="h-4 w-4 text-emerald-500" /> Nessun blocco registrato.
                  </div>
                ) : (
                  <ul className="space-y-2">
                    {nds.map(nd => {
                      const inizio = parseISO(nd.data_ora_inizio);
                      const fine = parseISO(nd.data_ora_fine);
                      const isStessoGiorno = isSameDay(inizio, fine);

                      return (
                        <li key={nd.id_blocco} className="flex items-center justify-between rounded-lg border border-red-100 bg-white p-3 shadow-xs">
                          <div>
                            {nd.tipo_ricorrenza === 'fisso' ? (
                              <>
                                <p className="font-bold text-slate-800 text-sm capitalize flex items-center gap-1.5">
                                  {format(inizio, "EEEE d MMMM", { locale: it })}
                                  <span className="flex items-center gap-0.5 text-[9px] bg-red-100 text-red-700 px-1.5 py-0.5 rounded font-bold uppercase"><Repeat className="h-3 w-3" /> Serie</span>
                                </p>
                                <p className="text-xs font-medium text-red-600 mt-0.5">Dalle {formattaOrario(nd.data_ora_inizio)} alle {formattaOrario(nd.data_ora_fine)}</p>
                              </>
                            ) : (
                              <>
                                <p className="font-bold text-slate-800 text-sm">
                                  {isStessoGiorno ? format(inizio, "EEEE d MMMM", { locale: it }) : 'Ferie / Blocco Lungo'}
                                </p>
                                <p className="text-xs font-medium text-red-600 mt-0.5">
                                  {isStessoGiorno ? `Dalle ${formattaOrario(nd.data_ora_inizio)} alle ${formattaOrario(nd.data_ora_fine)}` : `Dal ${format(inizio, "dd/MM")} al ${format(fine, "dd/MM")}`}
                                </p>
                              </>
                            )}
                          </div>
                          
                          <div className="flex flex-col gap-1 items-end">
                            {nd.id_gruppo_ricorrenza && (
                              <button 
                                type="button"
                                onClick={() => handleRimuoviSerieNd(nd.id_gruppo_ricorrenza!)}
                                className="text-[10px] font-bold text-red-600 hover:underline cursor-pointer"
                              >
                                Elimina Serie
                              </button>
                            )}
                            <button onClick={() => handleRimuoviNd(nd.id_blocco)} className="rounded p-1.5 text-slate-300 hover:text-red-500 transition-colors cursor-pointer" title="Elimina solo questo giorno">
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </li>
                      )
                    })}
                  </ul>
                )}
              </section>
            </div>

            <div className="border-t border-slate-200 bg-slate-50 p-4 sm:px-6">
              <button onClick={() => handleEliminaCameriere(selectedStaff.id_cameriere, `${selectedStaff.nome} ${selectedStaff.cognome}`)} className="flex w-full items-center justify-center gap-2 rounded-lg border border-red-200 bg-white py-2.5 text-sm font-bold text-red-600 hover:bg-red-50 transition-all cursor-pointer"><Trash2 className="h-4 w-4" /> Archivia {selectedStaff.nome}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
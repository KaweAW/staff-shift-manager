import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

export interface Cameriere {
  id_cameriere: number;
  nome: string;
  cognome: string;
  tariffa_oraria: number;
  telefono: string | null;
  note: string | null;
  attivo: boolean;
  sesso: 'uomo' | 'donna';
}

export const useCamerieri = () => {
  const [camerieri, setCamerieri] = useState<Cameriere[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const { user } = useAuth();

  const registraLog = async (azione: string, descrizione: string) => {
    if (!user) return;
    await supabase.from('audit_log').insert([{
      id_titolare: user.id_titolare,
      azione,
      descrizione
    }]);
  };

  const fetchCamerieri = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('camerieri')
      .select('*')
      .eq('attivo', true)
      .order('nome', { ascending: true });

    if (error) {
      setError(error.message);
      console.error(error);
    } else {
      setCamerieri(data || []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchCamerieri();
  }, [fetchCamerieri]);

  const aggiungiCameriere = async (cameriereData: Omit<Cameriere, 'id_cameriere' | 'attivo'>) => {
    const { data, error } = await supabase.from('camerieri').insert([cameriereData]).select().single();
    if (error) throw error;
    await registraLog('CREAZIONE_CAMERIERE', `Aggiunto: ${cameriereData.nome} ${cameriereData.cognome}`);
    await fetchCamerieri();
    return data;
  };

  const aggiornaCameriere = async (id: number, updates: Partial<Cameriere>) => {
    const { error } = await supabase.from('camerieri').update(updates).eq('id_cameriere', id);
    if (error) throw error;
    await registraLog('MODIFICA_CAMERIERE', `Modificata anagrafica: ${id}`);
    await fetchCamerieri();
  };

  const eliminaCameriere = async (id: number, nomeCompleto: string) => {
    const { error } = await supabase.from('camerieri').update({ attivo: false }).eq('id_cameriere', id);
    if (error) throw error;
    await registraLog('ELIMINAZIONE_CAMERIERE', `Archiviato: ${nomeCompleto}`);
    await fetchCamerieri();
  };

  return { camerieri, loading, error, aggiungiCameriere, aggiornaCameriere, eliminaCameriere, ricaricaDati: fetchCamerieri };
};
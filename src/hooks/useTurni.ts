import { useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { Cameriere } from './useCamerieri';
import { verificaSovrapposizione, calcolaOreDecimali } from '../lib/timeUtils';
import { subWeeks, differenceInHours } from 'date-fns';

export interface TurnoPianificato {
  id_turno: number;
  id_cameriere: number;
  data_ora_inizio: string;
  data_ora_fine: string;
}

export interface CandidatoConsigliato {
  cameriere: Cameriere;
  stato: 'disponibile' | 'affaticato' | 'bloccato';
  motivoBlocco?: string;
  orePregresse: number;
}

export const useTurni = () => {
  const [turni, setTurni] = useState<TurnoPianificato[]>([]);
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();

  const registraLog = async (azione: string, descrizione: string) => {
    if (!user) return;
    await supabase.from('audit_log').insert([{
      id_titolare: user.id_titolare,
      azione,
      descrizione
    }]);
  };

  const fetchTurniRange = useCallback(async (inizioIso: string, fineIso: string) => {
    setLoading(true);
    const { data, error } = await supabase
      .from('turni_pianificati')
      .select('*')
      .gte('data_ora_inizio', inizioIso)
      .lte('data_ora_fine', fineIso)
      .order('data_ora_inizio', { ascending: true });

    if (!error && data) {
      setTurni(data);
    }
    setLoading(false);
  }, []);

  const aggiungiTurno = async (id_cameriere: number, inizio: string, fine: string, nomeCameriere: string) => {
    const { error } = await supabase.from('turni_pianificati').insert([{
      id_cameriere,
      data_ora_inizio: inizio,
      data_ora_fine: fine
    }]);

    if (error) throw error;
    await registraLog('INSERT_TURNO', `Assegnato turno a ${nomeCameriere}: ${new Date(inizio).toLocaleString('it-IT')} -> ${new Date(fine).toLocaleString('it-IT')}`);
  };

  const eliminaTurno = async (id_turno: number, nomeCameriere: string, infoOrario: string) => {
    const { error } = await supabase.from('turni_pianificati').delete().eq('id_turno', id_turno);
    if (error) throw error;
    await registraLog('DELETE_TURNO', `Eliminato turno di ${nomeCameriere} del ${infoOrario}`);
  };

  const elaboraConsigliere = useCallback(async (
    isoInizioProposto: string,
    isoFineProposto: string,
    listaCamerieri: Cameriere[]
  ): Promise<CandidatoConsigliato[]> => {
    
    const dataInizioProposto = new Date(isoInizioProposto);
    const treSettimaneFa = subWeeks(dataInizioProposto, 3).toISOString();

    const [allTurniRes, ndsRes] = await Promise.all([
      supabase.from('turni_pianificati').select('*').gte('data_ora_inizio', treSettimaneFa),
      supabase.from('non_disponibilita').select('*').gte('data_ora_fine', isoInizioProposto)
    ]);

    const storiciTurni = allTurniRes.data || [];
    const blocchiNd = ndsRes.data || [];

    const risultato: CandidatoConsigliato[] = listaCamerieri.map(cameriere => {
      const id = cameriere.id_cameriere;

      const haNd = blocchiNd.some(nd => 
        nd.id_cameriere === id && verificaSovrapposizione(isoInizioProposto, isoFineProposto, nd.data_ora_inizio, nd.data_ora_fine)
      );
      if (haNd) return { cameriere, stato: 'bloccato', motivoBlocco: 'ND', orePregresse: 0 };

      const haTurnoParallelo = storiciTurni.some(t => 
        t.id_cameriere === id && verificaSovrapposizione(isoInizioProposto, isoFineProposto, t.data_ora_inizio, t.data_ora_fine)
      );
      if (haTurnoParallelo) return { cameriere, stato: 'bloccato', motivoBlocco: 'In Turno', orePregresse: 0 };

      const turniPrecedenti = storiciTurni
        .filter(t => t.id_cameriere === id && new Date(t.data_ora_fine) <= dataInizioProposto)
        .sort((a, b) => new Date(b.data_ora_fine).getTime() - new Date(a.data_ora_fine).getTime());

      let isAffaticato = false;
      if (turniPrecedenti.length > 0) {
        const fineUltimoTurno = new Date(turniPrecedenti[0].data_ora_fine);
        const oreRiposo = differenceInHours(dataInizioProposto, fineUltimoTurno);
        if (oreRiposo < 8) isAffaticato = true;
      }

      const oreUltime3Settimane = storiciTurni
        .filter(t => t.id_cameriere === id && new Date(t.data_ora_inizio) >= new Date(treSettimaneFa) && new Date(t.data_ora_fine) <= dataInizioProposto)
        .reduce((acc, t) => acc + calcolaOreDecimali(t.data_ora_inizio, t.data_ora_fine), 0);

      return {
        cameriere,
        stato: isAffaticato ? 'affaticato' : 'disponibile',
        orePregresse: oreUltime3Settimane
      };
    });

    return risultato.sort((a, b) => {
      const prioritaStato = { disponibile: 1, affaticato: 2, bloccato: 3 };
      if (prioritaStato[a.stato] !== prioritaStato[b.stato]) {
        return prioritaStato[a.stato] - prioritaStato[b.stato];
      }
      return a.orePregresse - b.orePregresse;
    });
  }, []);

  return { turni, loading, fetchTurniRange, aggiungiTurno, eliminaTurno, elaboraConsigliere };
};
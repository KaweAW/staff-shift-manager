import { differenceInMinutes, parseISO, format } from 'date-fns';

export const calcolaOreDecimali = (inizio: string, fine: string): number => {
  const start = new Date(inizio);
  const end = new Date(fine);
  
  if (end <= start) return 0;
  
  const minutiTotali = differenceInMinutes(end, start);
  return parseFloat((minutiTotali / 60).toFixed(1));
};

export const verificaSovrapposizione = (
  inizioA: string,
  fineA: string,
  inizioB: string,
  fineB: string
): boolean => {
  const startA = new Date(inizioA).getTime();
  const endA = new Date(fineA).getTime();
  const startB = new Date(inizioB).getTime();
  const endB = new Date(fineB).getTime();

  return startA < endB && endA > startB;
};

export const verificaRiposoSufficiente = (
  fineTurnoPrecedente: string,
  inizioNuovoTurno: string
): boolean => {
  const fine = new Date(fineTurnoPrecedente);
  const inizio = new Date(inizioNuovoTurno);
  
  const minutiRiposo = differenceInMinutes(inizio, fine);
  const oreRiposo = minutiRiposo / 60;
  
  return oreRiposo >= 8;
};

export const formattaOrario = (isoString: string): string => {
  try {
    return format(parseISO(isoString), 'HH:mm');
  } catch {
    return '--:--';
  }
};
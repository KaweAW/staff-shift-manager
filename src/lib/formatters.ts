/**
 * Formatta un numero in valuta Euro (es. 10.5 -> € 10,50)
 */
export const formattaEuro = (valore: number): string => {
  return new Intl.NumberFormat('it-IT', {
    style: 'currency',
    currency: 'EUR',
  }).format(valore);
};
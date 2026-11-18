/**
 * Estimativa do valor proporcional de um assento — mesma conta que a Stripe faz
 * (preço × fração do período que falta), só que em dias pra caber na tela:
 *   - alguém ENTRA no dia 10 de um ciclo de 30 dias → paga só os 20 dias restantes
 *   - alguém SAI no dia 10 → os 20 dias não usados viram crédito na próxima fatura
 * A Stripe calcula por segundo, então o valor real pode variar alguns centavos.
 */
const DAY_MS = 24 * 60 * 60 * 1000;

export type Proration = { daysLeft: number; totalDays: number; amount: number };

export function prorateSeat(unitPrice: number, periodStart: Date, periodEnd: Date, now = new Date()): Proration {
  const totalDays = Math.max(1, Math.round((periodEnd.getTime() - periodStart.getTime()) / DAY_MS));
  const daysLeft = Math.min(totalDays, Math.max(0, Math.ceil((periodEnd.getTime() - now.getTime()) / DAY_MS)));
  const amount = Math.round(((unitPrice * daysLeft) / totalDays) * 100) / 100;
  return { daysLeft, totalDays, amount };
}

/** Dias desde que a pessoa entrou (mínimo 0). */
export function daysSince(date: Date, now = new Date()): number {
  return Math.max(0, Math.floor((now.getTime() - date.getTime()) / DAY_MS));
}

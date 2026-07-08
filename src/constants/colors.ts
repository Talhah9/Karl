export const C = {
  bg: '#12100f',
  surf: '#1d1a17',
  surf2: '#272219',
  surf3: '#322b21',
  line: 'rgba(255,255,255,0.09)',
  lime: '#c4f542',
  purple: '#a78bfa',
  text: '#f6f3ee',
  muted: '#9a9288',
  warm: '#ff7a4d',
  dark: '#141210',
} as const;

export const RATES = {
  bnc: 0.246,
  bic: 0.212,
  vente: 0.123,
  other: 0.246,
} as const;

export function getChargeRate(
  status: 'bnc' | 'bic' | 'vente' | 'other',
  versementLiberatoire: boolean,
  acre: boolean
): number {
  let rate = RATES[status];
  if (versementLiberatoire) rate += 0.022;
  if (acre) rate *= 0.5;
  return rate;
}

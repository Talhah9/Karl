export interface Categorie {
  value: string;
  label: string;
  emoji: string;
}

// Aligned with Karl-chat tool: "restauration, transport, salaire, loyer, loisirs..."
export const PERSO_CATEGORIES: Categorie[] = [
  { value: 'courses', label: 'Courses', emoji: '🛒' },
  { value: 'restauration', label: 'Resto', emoji: '🍽️' },
  { value: 'transport', label: 'Transport', emoji: '🚇' },
  { value: 'loyer', label: 'Loyer', emoji: '🏠' },
  { value: 'loisirs', label: 'Loisirs', emoji: '🎮' },
  { value: 'santé', label: 'Santé', emoji: '💊' },
  { value: 'shopping', label: 'Shopping', emoji: '🛍️' },
  { value: 'abonnements', label: 'Abonnements', emoji: '📱' },
  { value: 'divers', label: 'Divers', emoji: '✨' },
];

export function getCatEmoji(value: string): string {
  return PERSO_CATEGORIES.find((c) => c.value === value.toLowerCase())?.emoji ?? '💰';
}

export function getCatLabel(value: string): string {
  return PERSO_CATEGORIES.find((c) => c.value === value.toLowerCase())?.label ?? value;
}

export const FREELANCE_INCOME_CATEGORIES: Categorie[] = [
  { value: 'prestation', label: 'Prestation', emoji: '💼' },
  { value: 'vente', label: 'Vente', emoji: '🛒' },
  { value: 'autre', label: 'Autre', emoji: '💰' },
];

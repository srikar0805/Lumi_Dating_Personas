import { Persona } from '../models/persona.model';

export function initialOf(persona: Pick<Persona, 'name'> | undefined | null): string {
  if (!persona?.name) return '?';
  return persona.name[0].toUpperCase();
}

export function hueOf(persona: Pick<Persona, 'name' | '_id'> | undefined | null): number {
  const seed = persona?._id || persona?.name || '';
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) | 0;
  return Math.abs(h) % 360;
}

export function ownerNameOf(persona: Persona | null | undefined, selfUserId?: string): string {
  if (!persona?.userId) return '';
  if (typeof persona.userId === 'string') return '';
  if (selfUserId && persona.userId._id === selfUserId) return 'You';
  return persona.userId.name;
}

export function ownerPossessive(persona: Persona | null | undefined, selfUserId?: string): string {
  const n = ownerNameOf(persona, selfUserId);
  if (!n) return '';
  if (n === 'You') return 'Your';
  return `${n}'s`;
}

export function formatGoal(goal: string | undefined | null): string {
  if (!goal) return '';
  const spaced = goal.replace(/-/g, ' ');
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

export function sharedTokens(a: Persona, b: Persona): string[] {
  const setB = new Set([...(b.traits || []), ...(b.interests || [])].map(x => x.toLowerCase()));
  const shared = [...(a.traits || []), ...(a.interests || [])].filter(x => setB.has(x.toLowerCase()));
  return Array.from(new Set(shared));
}

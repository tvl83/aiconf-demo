export type Speaker = {
  name: string;
  title: string;
  bio: string;
  /** Tailwind background class for the initials avatar. */
  accent: string;
};

export const SPEAKERS: Speaker[] = [
  {
    name: 'Jane Smith',
    title: 'CEO, FutureTech',
    bio: 'Building AI-first products since 2018.',
    accent: 'bg-indigo-500',
  },
  {
    name: 'Marcus Lee',
    title: 'Research Lead, DeepSystems',
    bio: 'Former Google Brain; now open-source AI.',
    accent: 'bg-emerald-500',
  },
  {
    name: 'Priya Patel',
    title: 'Founder, AgentLabs',
    bio: 'Shipped the first production agentic workflow in 2024.',
    accent: 'bg-rose-500',
  },
];

export function initials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .map((part) => part[0]!.toUpperCase())
    .join('');
}

export type AgendaItem = {
  time: string;
  session: string;
};

export const AGENDA: AgendaItem[] = [
  { time: '9:00 AM', session: 'Opening Keynote' },
  { time: '10:30 AM', session: 'Panel: Building with AI Agents' },
  { time: '12:00 PM', session: 'Lunch' },
  { time: '1:30 PM', session: 'Workshop: Live Build with Paperclip' },
  { time: '3:30 PM', session: 'Closing Remarks' },
];

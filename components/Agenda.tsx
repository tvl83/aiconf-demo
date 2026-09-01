import { AGENDA } from '../config/agenda';

export default function Agenda() {
  return (
    <section id="agenda" className="mx-auto max-w-3xl px-6 py-16">
      <h2 className="text-3xl font-bold tracking-tight text-white">Agenda</h2>

      <ul className="mt-8 divide-y divide-gray-800 border-y border-gray-800">
        {AGENDA.map((item) => (
          <li
            key={item.time}
            className="flex flex-col gap-1 py-4 sm:flex-row sm:items-baseline sm:gap-6"
          >
            <span className="w-28 shrink-0 font-mono text-sm text-indigo-400">
              {item.time}
            </span>
            <span className="text-lg text-gray-200">{item.session}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

import { SPEAKERS, initials } from '../config/speakers';

export default function Speakers() {
  return (
    <section id="speakers" className="mx-auto max-w-5xl px-6 py-16">
      <h2 className="text-3xl font-bold tracking-tight text-white">Speakers</h2>

      <div className="mt-8 flex flex-wrap gap-6">
        {SPEAKERS.map((speaker) => (
          <article
            key={speaker.name}
            className="flex min-w-[16rem] flex-1 flex-col items-start rounded-lg border border-gray-800 bg-gray-900 p-6"
          >
            <div
              className={`flex h-14 w-14 items-center justify-center rounded-full text-lg font-semibold text-white ${speaker.accent}`}
              aria-hidden="true"
            >
              {initials(speaker.name)}
            </div>

            <h3 className="mt-4 text-lg font-semibold text-white">{speaker.name}</h3>
            <p className="text-sm text-indigo-400">{speaker.title}</p>
            <p className="mt-3 text-sm text-gray-400">{speaker.bio}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

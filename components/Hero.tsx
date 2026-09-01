export default function Hero() {
  return (
    <section className="mx-auto flex max-w-4xl flex-col items-center px-6 py-24 text-center sm:py-32">
      <p className="text-sm font-medium uppercase tracking-widest text-indigo-400">
        September 6, 2025
      </p>

      <h1 className="mt-4 text-5xl font-bold tracking-tight text-white sm:text-6xl">
        AI Conf 2025
      </h1>

      <p className="mt-5 max-w-xl text-lg text-gray-400">
        The future of AI, live in San Francisco
      </p>

      <a
        href="#register"
        className="mt-10 rounded-md bg-indigo-500 px-6 py-3 text-base font-semibold text-white transition hover:bg-indigo-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-950"
      >
        Register Now
      </a>
    </section>
  );
}

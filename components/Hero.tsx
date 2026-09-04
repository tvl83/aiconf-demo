'use client';

export default function Hero() {
  // AIC-7 spec 3: at >=1024px the form is already on screen, so scrolling to it
  // looks broken. Focus the Name input instead. Below 1024px, let the anchor's
  // default smooth-scroll happen -- `scroll-behavior` in globals.css already
  // switches to an instant jump under prefers-reduced-motion.
  function handleClick(event: React.MouseEvent<HTMLAnchorElement>) {
    if (!window.matchMedia("(min-width: 1024px)").matches) return;
    const nameInput = document.getElementById("name");
    if (!nameInput) return; // fall through to the href
    event.preventDefault();
    nameInput.focus();
  }

  return (
    <div className="hero-stack">
      <p className="eyebrow">AI Conf 2025</p>
      <h1 className="h1">The future of AI, live in San Francisco</h1>
      <p className="subhead">September 6, 2025 · San Francisco</p>
      <a href="#register" onClick={handleClick} className="btn-hero">
        Register Now
      </a>
    </div>
  );
}

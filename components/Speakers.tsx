import { SPEAKERS, initials } from "@/config/speakers";

export default function Speakers() {
  return (
    <section className="section" aria-labelledby="speakers-heading">
      <h2 id="speakers-heading">Speakers</h2>
      <div className="speakers">
        {SPEAKERS.map((speaker) => (
          <article className="speaker" key={speaker.name}>
            <div
              className="avatar"
              style={{ background: speaker.avatarColor }}
              aria-hidden="true"
            >
              {initials(speaker.name)}
            </div>
            <h3>{speaker.name}</h3>
            <p className="title">{speaker.title}</p>
            <p className="bio">{speaker.bio}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

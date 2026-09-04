import { AGENDA } from "@/config/agenda";

export default function Agenda() {
  return (
    <section className="section" aria-labelledby="agenda-heading">
      <h2 id="agenda-heading">Agenda</h2>
      <div className="agenda">
        {AGENDA.map((item) => (
          <div className="agenda-row" key={item.time}>
            <p className="time">{item.time}</p>
            <p className="session">{item.session}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

import Hero from "@/components/Hero";
import Agenda from "@/components/Agenda";
import Speakers from "@/components/Speakers";
import RegistrationForm from "@/components/RegistrationForm";

export default function Home() {
  return (
    <main>
      {/* AIC-7 spec §3: hero and form share the first viewport at >=1024px so
          nobody has to scroll to reach the form on stage. Below 1024px .fold
          collapses to one column and the order is the PRD's top-to-bottom
          stack: hero, form, agenda, speakers. */}
      <div className="fold">
        <Hero />
        <RegistrationForm />
      </div>
      <Agenda />
      <Speakers />
    </main>
  );
}

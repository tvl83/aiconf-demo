import Hero from '../components/Hero';
import Agenda from '../components/Agenda';
import Speakers from '../components/Speakers';
import RegistrationForm from '../components/RegistrationForm';

export default function Home() {
  return (
    <main>
      <Hero />
      <Agenda />
      <Speakers />
      <RegistrationForm />
    </main>
  );
}

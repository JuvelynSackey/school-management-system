import Reveal from '../components/Reveal';
import Button from '../components/Button';
import HeroVisual from '../hero/HeroVisual';
import ProblemSection from '../sections/ProblemSection';
import EcosystemSection from '../sections/EcosystemSection';
import RoleExperienceSection from '../sections/RoleExperienceSection';
import ResultsWorkflowSection from '../sections/ResultsWorkflowSection';
import OfflineSection from '../sections/OfflineSection';
import IntelligenceTeaserSection from '../sections/IntelligenceTeaserSection';
import WhyJesManage from '../sections/WhyJesManage';
import GhanaFeatures from '../sections/GhanaFeatures';
import HealthScoreWidget from '../sections/HealthScoreWidget';

const TRUST_ITEMS = ['Multi-tenant security', 'Offline score entry', 'NaCCA-aligned assessment', 'Intelligent insights'];

export default function Home() {
  return (
    <div>
      <section className="mx-auto grid max-w-6xl items-center gap-10 px-4 pb-16 pt-14 sm:px-6 sm:pt-20 lg:grid-cols-2 lg:gap-6 lg:pt-24">
        <div className="flex flex-col items-center gap-6 text-center lg:items-start lg:text-left">
          <Reveal as="h1" className="max-w-xl text-4xl font-extrabold tracking-tight text-gray-900 dark:text-white sm:text-5xl">
            The Smarter Way to Run Your School.
          </Reveal>
          <Reveal as="p" delay={80} className="max-w-lg text-lg leading-relaxed text-gray-600 dark:text-gray-400">
            JesManage brings student records, results, attendance, fees, reporting and intelligent
            insights together in one secure platform built for Ghanaian schools.
          </Reveal>
          <Reveal delay={160} className="flex flex-wrap items-center justify-center gap-3 lg:justify-start">
            <Button variant="primary" to="/features">Explore JesManage</Button>
            <Button variant="secondary" to="/demo">Watch Product Demo</Button>
          </Reveal>
          <Reveal delay={240} className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-xs text-gray-500 dark:text-gray-500 lg:justify-start">
            {TRUST_ITEMS.map((t, i) => (
              <span key={t} className="flex items-center gap-2">
                {i > 0 && <span aria-hidden="true" className="text-gray-300 dark:text-gray-700">·</span>}
                {t}
              </span>
            ))}
          </Reveal>
        </div>

        <Reveal delay={200} className="flex items-center justify-center">
          <HeroVisual />
        </Reveal>
      </section>

      <ProblemSection />
      <EcosystemSection />
      <RoleExperienceSection />
      <ResultsWorkflowSection />
      <OfflineSection />
      <IntelligenceTeaserSection />
      <WhyJesManage />
      <GhanaFeatures />
      <HealthScoreWidget />
    </div>
  );
}

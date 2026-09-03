import Reveal from '../components/Reveal';
import SectionHeading from '../components/SectionHeading';
import Button from '../components/Button';

const iconProps = { width: 20, height: 20, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.7, strokeLinecap: 'round', strokeLinejoin: 'round' };

const MODULES = [
  { title: 'Remark Assistant', desc: 'Suggests report-card remarks from a student\'s own term data.', icon: <svg {...iconProps}><path d="M12 3l2.2 5.5L20 10l-5.5 2.2L12 18l-2.2-5.8L4 10l5.8-1.5L12 3Z" /></svg> },
  { title: 'Performance Insights', desc: "Term-over-term trends, strongest and weakest subjects.", icon: <svg {...iconProps}><path d="M5 20V13M11 20V7M17 20V11" /><path d="M3 20h18" /></svg> },
  { title: 'Early Warning', desc: 'Flags declining trends, low attendance, or multiple subject failures.', icon: <svg {...iconProps}><path d="M12 3l9 16H3L12 3Z" /><path d="M12 10v4M12 17h.01" /></svg> },
  { title: 'Natural Language Queries', desc: 'Ask admin questions in plain English, with permission-aware answers.', icon: <svg {...iconProps}><rect x="3" y="5" width="18" height="12" rx="2.5" /><path d="M7 20h10M9 9h6M9 13h3" /></svg> },
  { title: 'Assessment Summary', desc: 'School-wide subject averages, strengths, and areas for attention.', icon: <svg {...iconProps}><rect x="4" y="3" width="16" height="18" rx="2" /><path d="M8 8h8M8 12h8M8 16h5" /></svg> },
  { title: 'Smart Announcements', desc: 'Drafts announcements in a chosen tone — you review before sending.', icon: <svg {...iconProps}><path d="M3 11l18-7-7 18-3-8-8-3Z" /></svg> },
];

export default function IntelligenceTeaserSection() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
      <SectionHeading
        eyebrow="JesManage Intelligence"
        title="Your school's data is more useful than a spreadsheet."
        subtitle="Decision-support that assists people — authorized users always review before anything counts."
      />

      <div className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {MODULES.map((m, i) => (
          <Reveal key={m.title} delay={i * 70} className="rounded-2xl border border-indigo-100 bg-indigo-50/40 p-5 dark:border-indigo-950 dark:bg-indigo-950/20">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300">
              {m.icon}
            </div>
            <h3 className="mt-3 text-sm font-semibold text-gray-900 dark:text-white">{m.title}</h3>
            <p className="mt-1.5 text-xs leading-relaxed text-gray-600 dark:text-gray-400">{m.desc}</p>
          </Reveal>
        ))}
      </div>

      <Reveal delay={420} className="mt-10 flex justify-center">
        <Button variant="secondary" to="/jesmanage-intelligence">Explore JesManage Intelligence →</Button>
      </Reveal>
    </section>
  );
}

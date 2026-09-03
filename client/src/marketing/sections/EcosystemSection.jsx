import { useState } from 'react';
import Reveal from '../components/Reveal';
import SectionHeading from '../components/SectionHeading';

const NODES = [
  { label: 'Students', desc: 'Complete student records, admissions, and profiles.' },
  { label: 'Teachers', desc: 'Teacher accounts, class assignments, and subject loads.' },
  { label: 'Academics', desc: 'Terms, subjects, classes, and grading schemes.' },
  { label: 'Attendance', desc: 'Daily class attendance, recorded by teachers.' },
  { label: 'Finance', desc: 'Fee structures, payments, arrears, and digital receipts.' },
  { label: 'Parents', desc: "Guardian accounts linked to their children's records." },
  { label: 'Reports', desc: 'Terminal report cards, QR-verified and locked once approved.' },
  { label: 'Communication', desc: 'Targeted announcements to classes, teachers, or parents.' },
  { label: 'Intelligence', desc: 'Decision-support insights — never automatic decisions.' },
];

const RADIUS = 40; // percent of container
const angleFor = (i) => (i / NODES.length) * 2 * Math.PI - Math.PI / 2;
const posFor = (i) => ({
  x: 50 + RADIUS * Math.cos(angleFor(i)),
  y: 50 + RADIUS * Math.sin(angleFor(i)),
});

export default function EcosystemSection() {
  const [hovered, setHovered] = useState(null);

  return (
    <section className="border-t border-gray-100 bg-gray-50 py-20 dark:border-gray-900 dark:bg-gray-900/40">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <SectionHeading eyebrow="The Platform" title="One platform. Every part of your school." />

        <Reveal delay={100} className="relative mx-auto mt-16 aspect-square w-full max-w-[560px]">
          <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full overflow-visible" aria-hidden="true">
            {NODES.map((n, i) => {
              const { x, y } = posFor(i);
              const active = hovered === i;
              return (
                <line
                  key={n.label}
                  x1="50" y1="50" x2={x} y2={y}
                  className={`transition-all duration-300 ${active ? 'stroke-cyan-500' : 'stroke-gray-300 dark:stroke-gray-700'}`}
                  strokeWidth={active ? 0.5 : 0.3}
                />
              );
            })}
          </svg>

          <div className="absolute left-1/2 top-1/2 flex h-24 w-24 -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center rounded-full border border-cyan-200 bg-white text-center shadow-md dark:border-cyan-900 dark:bg-gray-950">
            <span className="text-sm font-extrabold tracking-tight text-gray-900 dark:text-white">JESMANAGE</span>
          </div>

          {NODES.map((n, i) => {
            const { x, y } = posFor(i);
            const active = hovered === i;
            return (
              <button
                key={n.label}
                type="button"
                className="absolute flex -translate-x-1/2 -translate-y-1/2 cursor-default appearance-none flex-col items-center border-none bg-transparent p-0"
                style={{ left: `${x}%`, top: `${y}%` }}
                onMouseEnter={() => setHovered(i)}
                onMouseLeave={() => setHovered(null)}
                onFocus={() => setHovered(i)}
                onBlur={() => setHovered(null)}
              >
                <span
                  className={`whitespace-nowrap rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
                    active
                      ? 'border-cyan-400 bg-cyan-50 text-cyan-700 dark:border-cyan-600 dark:bg-cyan-950 dark:text-cyan-300'
                      : 'border-gray-200 bg-white text-gray-700 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-300'
                  }`}
                >
                  {n.label}
                </span>
                {active && (
                  <span className="absolute top-full mt-2 w-40 rounded-lg border border-gray-200 bg-white p-2.5 text-center text-[11px] leading-snug text-gray-600 shadow-lg dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300">
                    {n.desc}
                  </span>
                )}
              </button>
            );
          })}
        </Reveal>
      </div>
    </section>
  );
}

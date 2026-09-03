import { useRef, useState } from 'react';
import { motion, useMotionValueEvent, useScroll, useTransform } from 'framer-motion';
import SectionHeading from '../components/SectionHeading';
import ReportCardPreviewLite from '../components/reports/ReportCardPreviewLite';

const STAGES = [
  'Teacher enters scores', 'Submit', 'Admin Review', 'Approve', 'Lock', 'Publish', 'Parent / Student', 'Download Report',
];

export default function ResultsWorkflowSection() {
  const containerRef = useRef(null);
  const [activeStage, setActiveStage] = useState(0);

  const { scrollYProgress } = useScroll({ target: containerRef, offset: ['start 0.75', 'end 0.4'] });
  const lineScale = useTransform(scrollYProgress, [0, 1], [0, 1]);
  const stageFloat = useTransform(scrollYProgress, [0, 1], [0, STAGES.length - 1]);

  useMotionValueEvent(stageFloat, 'change', (v) => {
    const next = Math.max(0, Math.min(STAGES.length - 1, Math.round(v)));
    setActiveStage((prev) => (prev === next ? prev : next));
  });

  return (
    <section ref={containerRef} className="border-t border-gray-100 py-20 dark:border-gray-900">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <SectionHeading
          eyebrow="Results Workflow"
          title="From marksheet to final report — without the paperwork."
        />

        <div className="mt-16 grid gap-14 lg:grid-cols-2 lg:gap-10">
          <div className="relative pl-8">
            <div className="absolute left-[7px] top-1 h-[calc(100%-8px)] w-0.5 bg-gray-200 dark:bg-gray-800" aria-hidden="true" />
            <motion.div
              className="absolute left-[7px] top-1 w-0.5 origin-top bg-cyan-500"
              style={{ scaleY: lineScale, height: 'calc(100% - 8px)' }}
              aria-hidden="true"
            />
            <ol className="flex flex-col gap-8">
              {STAGES.map((s, i) => {
                const active = i <= activeStage;
                return (
                  <li key={s} className="relative flex items-center gap-4">
                    <span
                      className={`absolute -left-8 flex h-4 w-4 items-center justify-center rounded-full border-2 transition-colors duration-300 ${
                        active ? 'border-cyan-500 bg-cyan-500' : 'border-gray-300 bg-white dark:border-gray-700 dark:bg-gray-950'
                      }`}
                    />
                    <span
                      className={`text-sm font-semibold transition-colors duration-300 ${
                        active ? 'text-gray-900 dark:text-white' : 'text-gray-400 dark:text-gray-600'
                      }`}
                    >
                      {i + 1}. {s}
                    </span>
                  </li>
                );
              })}
            </ol>
          </div>

          <div className="lg:sticky lg:top-24 lg:self-start">
            <ReportCardPreviewLite revealLevel={activeStage + 1} />
          </div>
        </div>
      </div>
    </section>
  );
}

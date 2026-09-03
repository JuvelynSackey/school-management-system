import Reveal from './Reveal';

// Shared large-headline + optional eyebrow/subtitle pattern reused across
// every marketing page, so each page's hero/section headers read as one
// coherent typographic system rather than ad-hoc per-page styling.
export default function SectionHeading({ eyebrow, title, subtitle, align = 'center', className = '' }) {
  const alignClass = align === 'left' ? 'text-left items-start' : 'text-center items-center mx-auto';
  return (
    <div className={`flex max-w-2xl flex-col gap-3 ${alignClass} ${className}`}>
      {eyebrow && (
        <Reveal as="span" className="text-xs font-semibold uppercase tracking-[0.16em] text-cyan-700 dark:text-cyan-400">
          {eyebrow}
        </Reveal>
      )}
      <Reveal as="h2" delay={60} className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-4xl">
        {title}
      </Reveal>
      {subtitle && (
        <Reveal as="p" delay={120} className="text-base leading-relaxed text-gray-600 dark:text-gray-400 sm:text-lg">
          {subtitle}
        </Reveal>
      )}
    </div>
  );
}

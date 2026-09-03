import { motion } from 'framer-motion';

// Generic icon + title + description card, reused across the marketing
// site wherever the same shape fits (Features grid, module lists, etc.).
export default function Card({ icon, title, description, className = '' }) {
  return (
    <motion.div
      whileHover={{ y: -4 }}
      transition={{ duration: 0.2 }}
      className={`rounded-2xl border border-gray-200 bg-white p-6 shadow-sm transition-[box-shadow,border-color] duration-200 hover:border-cyan-200 hover:shadow-lg dark:border-gray-800 dark:bg-gray-900 dark:hover:border-cyan-900 ${className}`}
    >
      {icon && (
        <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-cyan-50 text-cyan-700 dark:bg-cyan-950 dark:text-cyan-400">
          {icon}
        </div>
      )}
      <h3 className="text-base font-semibold text-gray-900 dark:text-white">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-gray-600 dark:text-gray-400">{description}</p>
    </motion.div>
  );
}

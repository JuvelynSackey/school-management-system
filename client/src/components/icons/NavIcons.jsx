// Sidebar nav icons — same hand-drawn line-icon language as LandingPage.jsx's
// FEATURE_ICONS/INTELLIGENCE_ICONS (24x24 viewBox, stroke="currentColor",
// no external icon library), sized down to 20x20 for the sidebar's row
// height. Several shapes are reused verbatim from those landing icon maps
// where the concept already overlaps (attendance, results, fees,
// announcements, people, classes) to keep one consistent visual language.
const props = {
  width: 20, height: 20, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round',
};

export const NAV_ICONS = {
  dashboard: (
    <svg {...props}>
      <rect x="3" y="3" width="8" height="8" rx="1.5" />
      <rect x="13" y="3" width="8" height="8" rx="1.5" />
      <rect x="3" y="13" width="8" height="8" rx="1.5" />
      <rect x="13" y="13" width="8" height="8" rx="1.5" />
    </svg>
  ),
  intelligence: (
    <svg {...props}>
      <path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3z" />
    </svg>
  ),
  admissions: (
    <svg {...props}>
      <rect x="5" y="4" width="14" height="17" rx="2" />
      <path d="M9 4V3a1 1 0 011-1h4a1 1 0 011 1v1" />
      <path d="M12 10v6M9 13h6" />
    </svg>
  ),
  students: (
    <svg {...props}>
      <path d="M12 3l10 5-10 5L2 8l10-5z" />
      <path d="M6 10.5V16c0 1.5 2.7 3 6 3s6-1.5 6-3v-5.5" />
    </svg>
  ),
  teachers: (
    <svg {...props}>
      <circle cx="9" cy="7" r="3" />
      <path d="M4 20c0-3 2.2-5 5-5s5 2 5 5" />
      <path d="M15 6h6M15 10h6M15 14h4" />
    </svg>
  ),
  parents: (
    <svg {...props}>
      <circle cx="8.5" cy="8" r="3" />
      <circle cx="16" cy="9" r="2.5" />
      <path d="M2.5 20c0-3.3 2.7-6 6-6s6 2.7 6 6" />
      <path d="M14.5 14.2c2.6.4 4.5 2.7 4.5 5.3" />
    </svg>
  ),
  profile: (
    <svg {...props}>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 20c0-4.4 3.6-8 8-8s8 3.6 8 8" />
    </svg>
  ),
  classes: (
    <svg {...props}>
      <path d="M12 6.5c-1.8-1.3-4.3-2-7-2v13c2.7 0 5.2.7 7 2" />
      <path d="M12 6.5c1.8-1.3 4.3-2 7-2v13c-2.7 0-5.2.7-7 2" />
    </svg>
  ),
  subjects: (
    <svg {...props}>
      <path d="M6 3h9a2 2 0 012 2v16l-6.5-3L4 21V5a2 2 0 012-2z" />
    </svg>
  ),
  terms: (
    <svg {...props}>
      <rect x="3" y="4.5" width="18" height="16" rx="2.5" />
      <path d="M3 9.5h18" />
      <path d="M8 2.5v4M16 2.5v4" />
    </svg>
  ),
  attendance: (
    <svg {...props}>
      <rect x="3" y="4.5" width="18" height="16" rx="2.5" />
      <path d="M3 9.5h18" />
      <path d="M8 2.5v4M16 2.5v4" />
      <path d="M8.5 14.5l2 2 4-4.5" />
    </svg>
  ),
  timetable: (
    <svg {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3.5 2" />
    </svg>
  ),
  results: (
    <svg {...props}>
      <path d="M5 20V13M11 20V7M17 20V11" />
      <path d="M3 20h18" />
    </svg>
  ),
  assessment: (
    <svg {...props}>
      <path d="M6 3h9l3 3v15a1 1 0 01-1 1H6a1 1 0 01-1-1V4a1 1 0 011-1z" />
      <path d="M8 11h8M8 15h8M8 7h4" />
    </svg>
  ),
  fees: (
    <svg {...props}>
      <rect x="2.5" y="6" width="19" height="13" rx="2.5" />
      <path d="M2.5 10h19" />
      <circle cx="17" cy="14.5" r="1.4" fill="currentColor" stroke="none" />
    </svg>
  ),
  feeStructures: (
    <svg {...props}>
      <path d="M12.5 2.5H4a1.5 1.5 0 00-1.5 1.5v8.5a1.5 1.5 0 00.44 1.06l8 8a1.5 1.5 0 002.12 0l8-8a1.5 1.5 0 000-2.12l-8-8a1.5 1.5 0 00-1.06-.44z" />
      <circle cx="7.5" cy="7.5" r="1.2" fill="currentColor" stroke="none" />
    </svg>
  ),
  feedingCharges: (
    <svg {...props}>
      <circle cx="12" cy="12" r="8" />
      <circle cx="12" cy="12" r="3.5" />
    </svg>
  ),
  arrears: (
    <svg {...props}>
      <path d="M12 3l10 18H2L12 3z" />
      <path d="M12 10v4M12 17v.01" />
    </svg>
  ),
  terminalReports: (
    <svg {...props}>
      <circle cx="12" cy="8" r="5" />
      <path d="M9 12.5L7 21l5-3 5 3-2-8.5" />
    </svg>
  ),
  announcements: (
    <svg {...props}>
      <path d="M3 10v4a2 2 0 0 0 2 2h1l3 5V3l-3 5H5a2 2 0 0 0-2 2Z" />
      <path d="M13 8.5a4 4 0 0 1 0 7" />
      <path d="M17 6a8 8 0 0 1 0 12" />
    </svg>
  ),
  reports: (
    <svg {...props}>
      <path d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" />
    </svg>
  ),
  idcards: (
    <svg {...props}>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <circle cx="8" cy="11" r="2" />
      <path d="M5.5 16c.5-1.8 1.9-2.5 2.5-2.5s2 .7 2.5 2.5" />
      <path d="M13 9h6M13 12h6M13 15h4" />
    </svg>
  ),
  analytics: (
    <svg {...props}>
      <path d="M3 17l5-5 4 3 7-8" />
      <path d="M3 20h18" />
    </svg>
  ),
  audit: (
    <svg {...props}>
      <path d="M3 12a9 9 0 109-9" />
      <path d="M3 4v5h5" />
      <path d="M12 7v5l3.5 2" />
    </svg>
  ),
  bulkImport: (
    <svg {...props}>
      <path d="M12 3v12" />
      <path d="M7 8l5-5 5 5" />
      <path d="M4 15v3a2 2 0 002 2h12a2 2 0 002-2v-3" />
    </svg>
  ),
  settings: (
    <svg {...props}>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 11-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 11-4 0v-.09a1.65 1.65 0 00-1-1.51 1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 11-2.83-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 110-4h.09a1.65 1.65 0 001.51-1 1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 112.83-2.83l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 114 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 112.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 110 4h-.09a1.65 1.65 0 00-1.51 1z" />
    </svg>
  ),
  account: (
    <svg {...props}>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 20c0-4.4 3.6-8 8-8s8 3.6 8 8" />
      <circle cx="18" cy="17" r="2.5" fill="currentColor" stroke="none" />
    </svg>
  ),
};

// Single source of truth for sidebar nav — shared with CommandPalette.jsx so
// Ctrl+K search results can never drift out of sync with the sidebar itself.
export const NAV_ITEMS = [
  { to: '/dashboard', label: 'Dashboard', roles: ['admin', 'teacher', 'student', 'parent'] },
  { to: '/admissions', label: 'Admissions', roles: ['admin'] },
  { to: '/students', label: 'Students', roles: ['admin', 'teacher'] },
  { to: '/profile', label: 'My Profile', roles: ['student'] },
  { to: '/teachers', label: 'Teachers', roles: ['admin'] },
  { to: '/classes', label: 'Classes', roles: ['admin'] },
  { to: '/subjects', label: 'Subjects', roles: ['admin'] },
  { to: '/houses', label: 'Houses', roles: ['admin'] },
  { to: '/terms', label: 'Academic Terms', roles: ['admin'] },
  { to: '/attendance', label: 'Attendance', roles: ['admin', 'teacher', 'student'] },
  { to: '/results', label: 'Results', roles: ['admin', 'teacher', 'student'] },
  { to: '/assessment-sheets', label: 'Assessment Sheets', roles: ['admin', 'teacher'] },
  { to: '/fees', label: 'Fees', roles: ['admin', 'student'] },
  { to: '/announcements', label: 'Announcements', roles: ['admin', 'teacher', 'student', 'parent'] },
  { to: '/reports', label: 'Reports', roles: ['admin'] },
  { to: '/analytics', label: 'Analytics', roles: ['admin'] },
  { to: '/school-settings', label: 'School Settings', roles: ['admin'] },
  { to: '/audit-log', label: 'Audit Log', roles: ['admin'] },
  { to: '/account', label: 'My Account', roles: ['admin', 'teacher', 'student', 'parent'] },
];

export const SUPER_ADMIN_NAV_ITEMS = [
  { to: '/super-admin/dashboard', label: 'Dashboard' },
  { to: '/super-admin/schools', label: 'Schools' },
  { to: '/super-admin/users', label: 'Platform Users' },
  { to: '/super-admin/audit-log', label: 'Global Audit Log' },
  { to: '/super-admin/security', label: 'Security Center' },
  { to: '/super-admin/settings', label: 'Platform Settings' },
  { to: '/super-admin/backups', label: 'Backup & Recovery' },
];

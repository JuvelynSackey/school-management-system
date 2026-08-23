// Single source of truth for sidebar nav — shared with CommandPalette.jsx so
// Ctrl+K search results can never drift out of sync with the sidebar itself.
//
// `group` drives the sidebar's section headers (AppShell.jsx groups items by
// this field, in NAV_GROUPS order, and skips a group entirely when the
// current role has no items in it). CommandPalette ignores `group` — it
// searches the flat list.
export const NAV_GROUPS = ['MAIN', 'PEOPLE', 'ACADEMICS', 'FINANCE', 'COMMUNICATION', 'REPORTS', 'SYSTEM'];

export const NAV_ITEMS = [
  { to: '/dashboard', label: 'Dashboard', roles: ['admin', 'teacher', 'student', 'parent'], group: 'MAIN' },
  { to: '/admissions', label: 'Admissions', roles: ['admin'], group: 'PEOPLE' },
  { to: '/students', label: 'Students', roles: ['admin', 'teacher'], group: 'PEOPLE' },
  { to: '/teachers', label: 'Teachers', roles: ['admin'], group: 'PEOPLE' },
  { to: '/profile', label: 'My Profile', roles: ['student'], group: 'PEOPLE' },
  { to: '/classes', label: 'Classes', roles: ['admin'], group: 'ACADEMICS' },
  { to: '/subjects', label: 'Subjects', roles: ['admin'], group: 'ACADEMICS' },
  { to: '/houses', label: 'Houses', roles: ['admin'], group: 'ACADEMICS' },
  { to: '/terms', label: 'Academic Terms', roles: ['admin'], group: 'ACADEMICS' },
  { to: '/attendance', label: 'Attendance', roles: ['admin', 'teacher', 'student'], group: 'ACADEMICS' },
  { to: '/results', label: 'Results', roles: ['admin', 'teacher', 'student'], group: 'ACADEMICS' },
  { to: '/assessment-sheets', label: 'Assessment Sheets', roles: ['admin', 'teacher'], group: 'ACADEMICS' },
  { to: '/fees', label: 'Fees', roles: ['admin', 'student'], group: 'FINANCE' },
  { to: '/announcements', label: 'Announcements', roles: ['admin', 'teacher', 'student', 'parent'], group: 'COMMUNICATION' },
  { to: '/reports', label: 'Reports', roles: ['admin'], group: 'REPORTS' },
  { to: '/analytics', label: 'Analytics', roles: ['admin'], group: 'REPORTS' },
  { to: '/audit-log', label: 'Audit Log', roles: ['admin'], group: 'REPORTS' },
  { to: '/school-settings', label: 'School Settings', roles: ['admin'], group: 'SYSTEM' },
  { to: '/account', label: 'My Account', roles: ['admin', 'teacher', 'student', 'parent'], group: 'SYSTEM' },
];

export const SUPER_ADMIN_NAV_ITEMS = [
  { to: '/super-admin/dashboard', label: 'Dashboard' },
  { to: '/super-admin/schools', label: 'Schools' },
  { to: '/super-admin/users', label: 'Platform Users' },
  { to: '/super-admin/audit-log', label: 'Global Audit Log' },
  { to: '/super-admin/security', label: 'Security Center' },
  { to: '/super-admin/settings', label: 'Platform Settings' },
  { to: '/super-admin/backups', label: 'Backup & Recovery' },
  { to: '/super-admin/account', label: 'My Account' },
];

// Single source of truth for sidebar nav — shared with CommandPalette.jsx so
// Ctrl+K search results can never drift out of sync with the sidebar itself.
//
// `group` drives the sidebar's section headers (AppShell.jsx groups items by
// this field, in NAV_GROUPS order, and skips a group entirely when the
// current role has no items in it). CommandPalette ignores `group` — it
// searches the flat list. `icon` is an explicit key into NavIcons.jsx's
// NAV_ICONS map (not derived from `to`, so it survives route renames).
export const NAV_GROUPS = ['MAIN', 'PEOPLE', 'ACADEMICS', 'FINANCE', 'COMMUNICATION', 'REPORTS', 'SYSTEM'];

export const NAV_ITEMS = [
  { to: '/dashboard', label: 'Dashboard', roles: ['admin', 'teacher', 'student', 'parent'], group: 'MAIN', icon: 'dashboard' },
  { to: '/intelligence', label: 'JesManage Intelligence', roles: ['admin'], group: 'MAIN', icon: 'intelligence' },
  { to: '/admissions', label: 'Admissions', roles: ['admin'], group: 'PEOPLE', icon: 'admissions' },
  { to: '/students', label: 'Students', roles: ['admin', 'teacher'], group: 'PEOPLE', icon: 'students' },
  { to: '/teachers', label: 'Teachers', roles: ['admin'], group: 'PEOPLE', icon: 'teachers' },
  { to: '/parents', label: 'Parents', roles: ['admin', 'teacher'], group: 'PEOPLE', icon: 'parents' },
  { to: '/profile', label: 'My Profile', roles: ['student'], group: 'PEOPLE', icon: 'profile' },
  { to: '/classes', label: 'Classes', roles: ['admin'], group: 'ACADEMICS', icon: 'classes' },
  { to: '/subjects', label: 'Subjects', roles: ['admin'], group: 'ACADEMICS', icon: 'subjects' },
  { to: '/terms', label: 'Academic Terms', roles: ['admin'], group: 'ACADEMICS', icon: 'terms' },
  { to: '/attendance', label: 'Attendance', roles: ['admin', 'teacher', 'student'], group: 'ACADEMICS', icon: 'attendance' },
  { to: '/exam-timetable', label: 'Exam Timetable', roles: ['admin', 'teacher', 'student', 'parent'], group: 'ACADEMICS', icon: 'timetable' },
  { to: '/results', label: 'Results', roles: ['admin', 'teacher', 'student'], group: 'ACADEMICS', icon: 'results' },
  { to: '/assessment-sheets', label: 'Assessment Sheets', roles: ['admin', 'teacher'], group: 'ACADEMICS', icon: 'assessment' },
  { to: '/fees', label: 'Fees', roles: ['admin', 'student'], group: 'FINANCE', icon: 'fees' },
  { to: '/fee-structures', label: 'Fee Structures', roles: ['admin'], group: 'FINANCE', icon: 'feeStructures' },
  { to: '/feeding-charges', label: 'Feeding Charges', roles: ['admin', 'teacher'], group: 'FINANCE', icon: 'feedingCharges' },
  { to: '/arrears', label: 'Arrears', roles: ['admin'], group: 'FINANCE', icon: 'arrears' },
  { to: '/announcements', label: 'Announcements', roles: ['admin', 'teacher', 'student', 'parent'], group: 'COMMUNICATION', icon: 'announcements' },
  { to: '/reports', label: 'Reports', roles: ['admin'], group: 'REPORTS', icon: 'reports' },
  { to: '/terminal-reports', label: 'Terminal Reports', roles: ['admin', 'teacher'], group: 'REPORTS', icon: 'terminalReports' },
  { to: '/id-cards', label: 'ID Cards', roles: ['admin'], group: 'REPORTS', icon: 'idcards' },
  { to: '/analytics', label: 'Analytics', roles: ['admin'], group: 'REPORTS', icon: 'analytics' },
  { to: '/analytics/data-quality', label: 'Data Quality', roles: ['admin'], group: 'REPORTS', icon: 'audit' },
  { to: '/analytics/bece-readiness', label: 'BECE Readiness', roles: ['admin'], group: 'REPORTS', icon: 'terminalReports' },
  { to: '/audit-log', label: 'Audit Log', roles: ['admin'], group: 'REPORTS', icon: 'audit' },
  { to: '/migration', label: 'Data Migration', roles: ['admin'], group: 'SYSTEM', icon: 'bulkImport' },
  { to: '/school-settings', label: 'School Settings', roles: ['admin'], group: 'SYSTEM', icon: 'settings' },
  { to: '/account', label: 'My Account', roles: ['admin', 'teacher', 'student', 'parent'], group: 'SYSTEM', icon: 'account' },
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

export const DOMAINS = {
  academics:      { label: 'Academics',       icon: '📚', color: '#2563EB', bg: '#EFF6FF' },
  infrastructure: { label: 'Infrastructure',  icon: '🏗️', color: '#EA580C', bg: '#FFF7ED' },
  safety:         { label: 'Safety',          icon: '🛡️', color: '#DC2626', bg: '#FEF2F2' },
  personal:       { label: 'Personal',        icon: '👤', color: '#7C3AED', bg: '#F5F3FF' },
  behaviour:      { label: 'Behaviour',       icon: '⚠️', color: '#D97706', bg: '#FFFBEB' },
  other:          { label: 'Other',           icon: '📋', color: '#6B7280', bg: '#F9FAFB' },
}

export const STATUSES = {
  raised:                   { label: 'Raised',                    color: '#6B7280', bg: '#F3F4F6' },
  verified:                 { label: 'Verified',                  color: '#2563EB', bg: '#DBEAFE' },
  in_progress:              { label: 'In Progress',               color: '#4F46E5', bg: '#EEF2FF' },
  escalated_to_teacher:     { label: 'Escalated to Teacher',      color: '#EA580C', bg: '#FFEDD5' },
  escalated_to_coordinator: { label: 'Escalated to Coordinator',  color: '#D97706', bg: '#FEF3C7' },
  escalated_to_principal:   { label: 'Escalated to Principal',    color: '#DC2626', bg: '#FEE2E2' },
  resolved:                 { label: 'Resolved',                  color: '#16A34A', bg: '#DCFCE7' },
  appealed:                 { label: 'Appealed',                  color: '#7C3AED', bg: '#EDE9FE' },
  closed:                   { label: 'Closed',                    color: '#374151', bg: '#E5E7EB' },
}

export const ROLES = {
  student:         'Student',
  council_member:  'Council Member',
  class_teacher:   'Class Teacher',
  coordinator:     'Coordinator',
  principal:       'Principal',
  supervisor:      'Supervisor',
  vice_principal:  'Vice Principal',
}

// Brand palette — updated to forest green theme
export const COLORS = {
  nav:           '#2d5c26',   // Forest green — navbar, primary CTA (VIP use)
  navDark:       '#1e3f18',   // Deeper green — hover
  bg:            '#eae1c4',   // Warm parchment — page background
  card:          '#ffffff',   // White — all cards/dialogs
  surface:       '#f5f0e8',   // Warm off-white — secondary surfaces
  gold:          '#c9a84c',   // Warm gold accent
  textPrimary:   '#1A1A1A',
  textSecondary: '#6B7280',
  success:       '#16A34A',
  warning:       '#D97706',
  danger:        '#DC2626',
  border:        'rgba(45,92,38,0.12)',
}

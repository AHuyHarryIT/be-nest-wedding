export const SESSION_ACCESS_SCOPE = {
  CUSTOMER: 'customer',
  STAFF: 'staff',
} as const;

export type SessionAccessScope =
  (typeof SESSION_ACCESS_SCOPE)[keyof typeof SESSION_ACCESS_SCOPE];

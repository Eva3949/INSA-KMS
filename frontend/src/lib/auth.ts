export type UserRole = 
  | 'ROLE_ADMIN' 
  | 'ROLE_CONTENT_OWNER' 
  | 'ROLE_CONTRIBUTOR' 
  | 'ROLE_VIEWER' 
  | 'ROLE_COMPLIANCE_OFFICER' 
  | 'ROLE_IT_SECURITY';

export interface UserContext {
  sub: string;
  username: string;
  email: string;
  departmentId?: string;
  roles: UserRole[];
}

export function hasRole(userRoles: UserRole[], requiredRole: UserRole): boolean {
  if (userRoles.includes('ROLE_ADMIN')) return true;
  return userRoles.includes(requiredRole);
}

export function getSecurityBadgeVariant(level: 'PUBLIC' | 'INTERNAL' | 'CONFIDENTIAL' | 'RESTRICTED') {
  switch (level) {
    case 'PUBLIC':
      return 'green';
    case 'INTERNAL':
      return 'blue';
    case 'CONFIDENTIAL':
      return 'amber';
    case 'RESTRICTED':
      return 'red';
  }
}

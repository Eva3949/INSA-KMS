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
  if (userRoles.includes(requiredRole)) return true;
  // Role hierarchy: higher roles inherit lower role permissions
  const hierarchy: UserRole[] = ['ROLE_VIEWER', 'ROLE_CONTRIBUTOR', 'ROLE_CONTENT_OWNER', 'ROLE_COMPLIANCE_OFFICER', 'ROLE_IT_SECURITY', 'ROLE_ADMIN'];
  const requiredIdx = hierarchy.indexOf(requiredRole);
  if (requiredIdx >= 0) {
    // Check if user has any role that is at or above the required level
    return userRoles.some((r) => {
      const idx = hierarchy.indexOf(r);
      return idx >= requiredIdx;
    });
  }
  return false;
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

export type UserRole = 
  | 'ROLE_SUPER_ADMIN'
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
  if (!userRoles || userRoles.length === 0) return false;

  // ROLE_SUPER_ADMIN has all access
  if (userRoles.includes('ROLE_SUPER_ADMIN')) return true;

  // Exact match
  if (userRoles.includes(requiredRole)) return true;

  // Only ROLE_SUPER_ADMIN can access ROLE_SUPER_ADMIN
  if (requiredRole === 'ROLE_SUPER_ADMIN') {
    return false;
  }

  // Standard Admin (ROLE_ADMIN) access
  if (userRoles.includes('ROLE_ADMIN')) {
    return true;
  }

  // ROLE_VIEWER is inherited by all authenticated roles
  if (requiredRole === 'ROLE_VIEWER') {
    return userRoles.length > 0;
  }

  // ROLE_CONTRIBUTOR is inherited by ROLE_CONTENT_OWNER
  if (requiredRole === 'ROLE_CONTRIBUTOR') {
    return userRoles.includes('ROLE_CONTRIBUTOR') || userRoles.includes('ROLE_CONTENT_OWNER');
  }

  // ROLE_CONTENT_OWNER is inherited by ROLE_ADMIN
  if (requiredRole === 'ROLE_CONTENT_OWNER') {
    return userRoles.includes('ROLE_CONTENT_OWNER');
  }

  // ROLE_COMPLIANCE_OFFICER is inherited by ROLE_ADMIN
  if (requiredRole === 'ROLE_COMPLIANCE_OFFICER') {
    return userRoles.includes('ROLE_COMPLIANCE_OFFICER');
  }

  // ROLE_IT_SECURITY is inherited by ROLE_ADMIN
  if (requiredRole === 'ROLE_IT_SECURITY') {
    return userRoles.includes('ROLE_IT_SECURITY');
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

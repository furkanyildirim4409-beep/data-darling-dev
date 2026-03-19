import { useAuth } from '@/contexts/AuthContext';

export interface Permissions {
  canEditAthletes: boolean;
  canDeleteAthletes: boolean;
  canCreatePrograms: boolean;
  canAssignPrograms: boolean;
  canManageFinances: boolean;
}

export function usePermissions(): Permissions {
  const { isSubCoach, teamMemberPermissions } = useAuth();

  // Head coach or full-access sub-coach: everything allowed
  if (!isSubCoach || teamMemberPermissions === 'full') {
    return {
      canEditAthletes: true,
      canDeleteAthletes: true,
      canCreatePrograms: true,
      canAssignPrograms: true,
      canManageFinances: true,
    };
  }

  // Read-only: nothing allowed
  if (teamMemberPermissions === 'read-only') {
    return {
      canEditAthletes: false,
      canDeleteAthletes: false,
      canCreatePrograms: false,
      canAssignPrograms: false,
      canManageFinances: false,
    };
  }

  // Limited: can edit/assign but not delete or manage finances
  return {
    canEditAthletes: true,
    canDeleteAthletes: false,
    canCreatePrograms: true,
    canAssignPrograms: true,
    canManageFinances: false,
  };
}

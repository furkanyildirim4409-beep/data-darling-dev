import { useAuth } from '@/contexts/AuthContext';
import {
  type GranularPermissions,
  type FlatPermissions,
  getDefaultPermissions,
  flattenPermissions,
  fullAccessPermissions,
} from '@/types/permissions';

// Re-export FlatPermissions as Permissions for backward compatibility
export type Permissions = FlatPermissions;

export function usePermissions(): Permissions {
  const { isSubCoach, teamMember, teamMemberPermissions } = useAuth();

  // Head coach or not a sub-coach → unrestricted
  if (!isSubCoach) {
    return fullAccessPermissions();
  }

  // Sub-coach with JSONB custom_permissions → use granular engine
  const custom: GranularPermissions | null = teamMember?.custom_permissions ?? null;
  if (custom) {
    return flattenPermissions(custom);
  }

  // Legacy fallback: map old 3-tier string to granular then flatten
  const tier = (teamMemberPermissions as 'full' | 'limited' | 'read-only') ?? 'read-only';
  return flattenPermissions(getDefaultPermissions(tier));
}

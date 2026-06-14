// Granular ACL Permission Schema — stored as JSONB in team_members.custom_permissions

export interface GranularPermissions {
  athletes: { view: boolean; edit: boolean; delete: boolean; scopeOwnOnly: boolean };
  workouts: { view: boolean; create: boolean; edit: boolean; delete: boolean; assign: boolean };
  diets: { view: boolean; create: boolean; edit: boolean; delete: boolean; assign: boolean };
  finances: { view: boolean; manage: boolean };
  team: { view: boolean; invite: boolean; editPermissions: boolean };
  store: { view: boolean; manage: boolean };
  content: { view: boolean; manage: boolean };
  mail: { view: boolean; manage: boolean };
  templates: { view: boolean; edit: boolean };
}

/** Flat boolean flags consumed by UI components */
export interface FlatPermissions {
  // Athletes
  canViewAthletes: boolean;
  canEditAthletes: boolean;
  canDeleteAthletes: boolean;
  canViewOnlyAssignedAthletes: boolean;
  // Workouts (legacy "programs")
  canViewWorkouts: boolean;
  canCreatePrograms: boolean;
  canEditWorkouts: boolean;
  canDeleteWorkouts: boolean;
  canAssignPrograms: boolean;
  // Diets
  canViewDiets: boolean;
  canCreateDiets: boolean;
  canEditDiets: boolean;
  canDeleteDiets: boolean;
  canAssignDiets: boolean;
  // Finances
  canViewFinances: boolean;
  canManageFinances: boolean;
  // Team
  canViewTeam: boolean;
  canInviteMembers: boolean;
  canEditPermissions: boolean;
  // Store
  canViewStore: boolean;
  canManageStore: boolean;
  // Content
  canViewContent: boolean;
  canManageContent: boolean;
  // Mail
  canViewMail: boolean;
  canManageMail: boolean;
  // Templates
  canViewTemplates: boolean;
  canEditTemplates: boolean;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const ALL_TRUE: GranularPermissions = {
  athletes: { view: true, edit: true, delete: true, scopeOwnOnly: false },
  workouts: { view: true, create: true, edit: true, delete: true, assign: true },
  diets: { view: true, create: true, edit: true, delete: true, assign: true },
  finances: { view: true, manage: true },
  team: { view: true, invite: true, editPermissions: true },
  store: { view: true, manage: true },
  content: { view: true, manage: true },
  mail: { view: true, manage: true },
  templates: { view: true, edit: true },
};

const ALL_FALSE: GranularPermissions = {
  athletes: { view: true, edit: false, delete: false, scopeOwnOnly: true },
  workouts: { view: true, create: false, edit: false, delete: false, assign: false },
  diets: { view: true, create: false, edit: false, delete: false, assign: false },
  finances: { view: false, manage: false },
  team: { view: true, invite: false, editPermissions: false },
  store: { view: false, manage: false },
  content: { view: false, manage: false },
  mail: { view: false, manage: false },
  templates: { view: true, edit: false },
};

const LIMITED: GranularPermissions = {
  athletes: { view: true, edit: true, delete: false, scopeOwnOnly: true },
  workouts: { view: true, create: true, edit: true, delete: false, assign: true },
  diets: { view: true, create: true, edit: true, delete: false, assign: true },
  finances: { view: false, manage: false },
  team: { view: true, invite: false, editPermissions: false },
  store: { view: true, manage: false },
  content: { view: true, manage: false },
  mail: { view: false, manage: false },
  templates: { view: true, edit: false },
};

export function getDefaultPermissions(tier: 'full' | 'limited' | 'read-only'): GranularPermissions {
  switch (tier) {
    case 'full':
      return structuredClone(ALL_TRUE);
    case 'limited':
      return structuredClone(LIMITED);
    case 'read-only':
    default:
      return structuredClone(ALL_FALSE);
  }
}

export function flattenPermissions(g: GranularPermissions): FlatPermissions {
  return {
    canViewAthletes: g.athletes?.view ?? true,
    canEditAthletes: g.athletes?.edit ?? false,
    canDeleteAthletes: g.athletes?.delete ?? false,
    canViewOnlyAssignedAthletes: g.athletes?.scopeOwnOnly ?? false,

    canViewWorkouts: g.workouts?.view ?? true,
    canCreatePrograms: g.workouts?.create ?? false,
    canEditWorkouts: g.workouts?.edit ?? false,
    canDeleteWorkouts: g.workouts?.delete ?? false,
    canAssignPrograms: g.workouts?.assign ?? false,

    canViewDiets: g.diets?.view ?? true,
    canCreateDiets: g.diets?.create ?? false,
    canEditDiets: g.diets?.edit ?? false,
    canDeleteDiets: g.diets?.delete ?? false,
    canAssignDiets: g.diets?.assign ?? false,

    canViewFinances: g.finances?.view ?? false,
    canManageFinances: g.finances?.manage ?? false,

    canViewTeam: g.team?.view ?? true,
    canInviteMembers: g.team?.invite ?? false,
    canEditPermissions: g.team?.editPermissions ?? false,

    canViewStore: g.store?.view ?? false,
    canManageStore: g.store?.manage ?? false,

    canViewContent: g.content?.view ?? false,
    canManageContent: g.content?.manage ?? false,

    canViewMail: g.mail?.view ?? false,
    canManageMail: g.mail?.manage ?? false,

    canViewTemplates: g.templates?.view ?? true,
    canEditTemplates: g.templates?.edit ?? false,
  };
}

export function fullAccessPermissions(): FlatPermissions {
  return flattenPermissions(ALL_TRUE);
}

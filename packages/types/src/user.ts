export interface User {
  id: string;
  email: string;
  name: string;
  avatarUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

export type OrgRole = 'OWNER' | 'ADMIN' | 'MEMBER' | 'VIEWER';

export interface OrganizationMembership {
  id: string;
  orgId: string;
  role: OrgRole;
  organization: { id: string; name: string; slug: string; logoUrl: string | null };
}

export interface UserProfile extends User {
  organizations: OrganizationMembership[];
}

import { Tenant, TenantUser, Profile, UserRole } from "./database";

export interface TenantContextState {
  tenant: Tenant | null;
  tenantUser: TenantUser | null;
  profile: Profile | null;
  role: UserRole | null;
  isLoading: boolean;
  userTenants: Array<{ tenant: Tenant; role: UserRole }>;
  switchTenant: (tenantId: string) => Promise<void>;
}

export interface AuthenticatedTenantSession {
  user: {
    id: string;
    email: string;
  };
  profile: Profile;
  tenant: Tenant;
  tenantUser: TenantUser;
  role: UserRole;
  allUserTenants: Array<{ tenant: Tenant; role: UserRole }>;
}

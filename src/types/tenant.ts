import { Tenant, TenantUser, Profile, UserRole } from "./database";
import { TenantTrialInfo } from "@/lib/tenant/trial";

export interface TenantContextState {
  tenant: Tenant | null;
  tenantUser: TenantUser | null;
  profile: Profile | null;
  role: UserRole | null;
  trialInfo: TenantTrialInfo | null;
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
  trialInfo: TenantTrialInfo;
  allUserTenants: Array<{ tenant: Tenant; role: UserRole }>;
}


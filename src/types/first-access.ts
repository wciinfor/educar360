export interface SetupFirstAdminInput {
  tenantId: string;
  fullName: string;
  email: string;
}

export interface SetupFirstAdminResult {
  success: boolean;
  tenant_id?: string;
  user_id?: string;
  admin_name?: string;
  admin_email?: string;
  role?: string;
  invite_token?: string;
  access_domain?: string;
  error?: string;
}

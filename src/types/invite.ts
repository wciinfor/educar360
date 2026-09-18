export interface InviteDetails {
  valid: boolean;
  already_accepted?: boolean;
  expired?: boolean;
  expires_at?: string;
  tenant_id?: string;
  school_name?: string;
  slug?: string;
  status?: string;
  admin_name?: string;
  admin_email?: string;
  role?: string;
  message?: string;
}

export interface ActivateAccountInput {
  token: string;
  password: string;
}

export interface ActivateAccountResult {
  success: boolean;
  message?: string;
  error?: string;
  email?: string;
}

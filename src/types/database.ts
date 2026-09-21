export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type UserRole =
  | 'admin_escola'
  | 'coordenacao'
  | 'secretaria'
  | 'financeiro'
  | 'comercial'
  | 'recepcao'
  | 'professor'
  | 'responsavel'
  | 'aluno';

export type TenantStatus = 'active' | 'suspended' | 'trial' | 'inactive';

export interface Tenant {
  id: string;
  name: string;
  trade_name: string | null;
  slug: string;
  cnpj: string | null;
  email: string | null;
  phone: string | null;
  status: TenantStatus;
  settings: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface Profile {
  id: string;
  email: string;
  full_name: string;
  avatar_url: string | null;
  phone: string | null;
  is_platform_admin: boolean;
  created_at: string;
  updated_at: string;
}

export interface TenantUser {
  id: string;
  tenant_id: string;
  user_id: string;
  role: UserRole;
  is_active: boolean;
  custom_permissions: string[];
  created_at: string;
  updated_at: string;
  tenant?: Tenant;
  profile?: Profile;
}

export interface AuditLog {
  id: string;
  tenant_id: string;
  user_id: string | null;
  action: string;
  entity_name: string;
  entity_id: string | null;
  old_values: Json | null;
  new_values: Json | null;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
}

export interface Lead {
  id: string;
  school_name: string;
  contact_name: string;
  email: string;
  phone: string;
  role_in_school: string | null;
  students_range: string | null;
  plan_interest: string;
  message: string | null;
  status: 'new' | 'contacted' | 'qualified' | 'converted' | 'discarded';
  created_at: string;
}

export interface Database {
  public: {
    Tables: {
      tenants: {
        Row: Tenant;
        Insert: Omit<Tenant, 'id' | 'created_at' | 'updated_at'> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Tenant>;
      };
      profiles: {
        Row: Profile;
        Insert: Omit<Profile, 'created_at' | 'updated_at'> & {
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Profile>;
      };
      tenant_users: {
        Row: TenantUser;
        Insert: Omit<TenantUser, 'id' | 'created_at' | 'updated_at'> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<TenantUser>;
      };
      audit_logs: {
        Row: AuditLog;
        Insert: Omit<AuditLog, 'id' | 'created_at'> & {
          id?: string;
          created_at?: string;
        };
        Update: Partial<AuditLog>;
      };
      leads: {
        Row: Lead;
        Insert: Omit<Lead, 'id' | 'status' | 'created_at'> & {
          id?: string;
          status?: 'new' | 'contacted' | 'qualified' | 'converted' | 'discarded';
          created_at?: string;
        };
        Update: Partial<Lead>;
      };
      students: {
        Row: any;
        Insert: any;
        Update: any;
      };
      guardians: {
        Row: any;
        Insert: any;
        Update: any;
      };
      student_guardians: {
        Row: any;
        Insert: any;
        Update: any;
      };
    };
  };
}

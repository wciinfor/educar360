"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { Tenant, TenantUser, Profile, UserRole } from "@/types/database";
import { TenantContextState } from "@/types/tenant";
import { createClient } from "@/lib/supabase/client";

import { TenantTrialInfo, calculateTrialInfo } from "@/lib/tenant/trial";

const TenantContext = createContext<TenantContextState | undefined>(undefined);

interface TenantProviderProps {
  children: React.ReactNode;
  initialTenant?: Tenant | null;
  initialTenantUser?: TenantUser | null;
  initialProfile?: Profile | null;
  initialRole?: UserRole | null;
  initialTrialInfo?: TenantTrialInfo | null;
  initialUserTenants?: Array<{ tenant: Tenant; role: UserRole }>;
}

export function TenantProvider({
  children,
  initialTenant = null,
  initialTenantUser = null,
  initialProfile = null,
  initialRole = null,
  initialTrialInfo = null,
  initialUserTenants = [],
}: TenantProviderProps) {
  const [tenant, setTenant] = useState<Tenant | null>(initialTenant);
  const [tenantUser, setTenantUser] = useState<TenantUser | null>(initialTenantUser);
  const [profile, setProfile] = useState<Profile | null>(initialProfile);
  const [role, setRole] = useState<UserRole | null>(initialRole);
  const [trialInfo, setTrialInfo] = useState<TenantTrialInfo | null>(
    initialTrialInfo || (initialTenant ? calculateTrialInfo(initialTenant) : null)
  );
  const [userTenants, setUserTenants] = useState<Array<{ tenant: Tenant; role: UserRole }>>(initialUserTenants);
  const [isLoading, setIsLoading] = useState<boolean>(!initialTenant);

  const supabase = createClient();

  const switchTenant = async (tenantId: string) => {
    try {
      setIsLoading(true);
      // Salva preferência em cookie para persistência nas requisições SSR
      document.cookie = `educar360_active_tenant=${tenantId}; path=/; max-age=31536000; SameSite=Lax`;
      window.location.reload();
    } catch (err) {
      console.error("Erro ao alternar escola/tenant:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!initialTenant) {
      const fetchSessionData = async () => {
        try {
          const { data: { user } } = await supabase.auth.getUser();
          if (!user) {
            setIsLoading(false);
            return;
          }

          const { data: profileData } = await supabase
            .from("profiles")
            .select("*")
            .eq("id", user.id)
            .single();

          if (profileData) {
            setProfile(profileData as unknown as Profile);
          }

          const { data: tuData } = await supabase
            .from("tenant_users")
            .select(`
              *,
              tenant:tenants(*)
            `)
            .eq("user_id", user.id)
            .eq("is_active", true);

          if (tuData && tuData.length > 0) {
            const rawList = tuData as any[];
            const formattedTenants = rawList
              .filter((item) => item.tenant && (item.tenant.status === "active" || item.tenant.status === "trial"))
              .map((item) => ({
                tenant: item.tenant as Tenant,
                role: item.role as UserRole,
              }));

            setUserTenants(formattedTenants);

            const active = rawList[0];
            const activeTenant = active.tenant as Tenant;
            setTenant(activeTenant);
            setTenantUser(active as TenantUser);
            setRole(active.role as UserRole);

            if (activeTenant) {
              const { data: subData } = await supabase
                .from("saas_subscriptions")
                .select("*")
                .eq("tenant_id", activeTenant.id)
                .maybeSingle();

              setTrialInfo(calculateTrialInfo(activeTenant, subData as any));
            }
          }
        } catch (error) {
          console.error("Falha ao inicializar contexto do tenant:", error);
        } finally {
          setIsLoading(false);
        }
      };

      fetchSessionData();
    }
  }, [initialTenant, supabase]);

  return (
    <TenantContext.Provider
      value={{
        tenant,
        tenantUser,
        profile,
        role,
        trialInfo,
        isLoading,
        userTenants,
        switchTenant,
      }}
    >
      {children}
    </TenantContext.Provider>
  );
}

export function useTenant() {
  const context = useContext(TenantContext);
  if (!context) {
    throw new Error("useTenant deve ser utilizado dentro de um TenantProvider");
  }
  return context;
}

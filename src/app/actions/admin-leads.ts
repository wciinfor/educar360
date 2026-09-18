"use server";

import { createClient } from "@/lib/supabase/server";
import { getPlatformAdminSession } from "@/lib/platform/resolver";
import { Lead, LeadStatus } from "@/types/lead";
import { revalidatePath } from "next/cache";

export async function getLeadsAction(): Promise<{ success: boolean; data: Lead[]; error?: string }> {
  try {
    const session = await getPlatformAdminSession();
    if (!session) {
      return { success: false, data: [], error: "Acesso não autorizado. Apenas Super Admins." };
    }

    const supabase = await createClient();

    const { data, error } = await (supabase.from("leads") as any)
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Erro ao buscar leads:", error);
      return { success: false, data: [], error: error.message };
    }

    return { success: true, data: (data as Lead[]) || [] };
  } catch (err: any) {
    console.error("Exceção getLeadsAction:", err);
    return { success: false, data: [], error: err?.message };
  }
}

export async function updateLeadStatusAction(
  leadId: string,
  newStatus: LeadStatus,
  internalNotes?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await getPlatformAdminSession();
    if (!session) {
      return { success: false, error: "Acesso não autorizado." };
    }

    const supabase = await createClient();

    const updatePayload: Record<string, any> = {
      status: newStatus,
      updated_at: new Date().toISOString(),
    };

    if (internalNotes !== undefined) {
      updatePayload.internal_notes = internalNotes;
    }

    const { error } = await (supabase.from("leads") as any)
      .update(updatePayload)
      .eq("id", leadId);

    if (error) {
      console.error("Erro ao atualizar lead:", error);
      return { success: false, error: error.message };
    }

    revalidatePath("/admin/leads");
    return { success: true };
  } catch (err: any) {
    console.error("Exceção updateLeadStatusAction:", err);
    return { success: false, error: err?.message };
  }
}

export async function updateLeadNotesAction(
  leadId: string,
  notes: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await getPlatformAdminSession();
    if (!session) {
      return { success: false, error: "Acesso não autorizado." };
    }

    const supabase = await createClient();

    const { error } = await (supabase.from("leads") as any)
      .update({
        internal_notes: notes,
        updated_at: new Date().toISOString(),
      })
      .eq("id", leadId);

    if (error) {
      console.error("Erro ao salvar notas do lead:", error);
      return { success: false, error: error.message };
    }

    revalidatePath("/admin/leads");
    return { success: true };
  } catch (err: any) {
    console.error("Exceção updateLeadNotesAction:", err);
    return { success: false, error: err?.message };
  }
}

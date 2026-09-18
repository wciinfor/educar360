"use server";

import { createClient } from "@/lib/supabase/server";
import { LeadInput, LeadResponse } from "@/types/lead";

export async function submitLeadAction(data: LeadInput): Promise<LeadResponse> {
  try {
    if (!data.school_name || !data.contact_name || !data.email || !data.phone) {
      return {
        success: false,
        message: "Por favor, preencha todos os campos obrigatórios (Escola, Nome, E-mail e WhatsApp).",
      };
    }

    // Validação básica de formato de e-mail
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(data.email)) {
      return {
        success: false,
        message: "Por favor, informe um endereço de e-mail válido.",
      };
    }

    const supabase = await createClient();

    const leadPayload = {
      school_name: data.school_name.trim(),
      contact_name: data.contact_name.trim(),
      email: data.email.trim().toLowerCase(),
      phone: data.phone.trim(),
      role_in_school: data.role_in_school || null,
      students_range: data.students_range || null,
      plan_interest: data.plan_interest || "profissional",
      message: data.message ? data.message.trim() : null,
    };

    const { error } = await (supabase.from("leads") as any).insert([leadPayload]);

    if (error) {
      console.error("Erro ao registrar lead no Supabase:", error);
      return {
        success: false,
        message: "Não foi possível enviar sua solicitação no momento. Tente novamente mais tarde.",
        error: error.message,
      };
    }

    return {
      success: true,
      message: "Sua solicitação de teste foi recebida com sucesso! Em breve um especialista do Educar360 entrará em contato para ativar o ambiente da sua escola.",
    };
  } catch (err: any) {
    console.error("Exceção ao processar lead:", err);
    return {
      success: false,
      message: "Ocorreu uma falha inesperada. Por favor, tente novamente.",
      error: err?.message,
    };
  }
}

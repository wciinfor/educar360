import {
  AsaasCustomerPayload,
  AsaasCustomerResponse,
  AsaasSubscriptionPayload,
  AsaasSubscriptionResponse,
} from "./types";

/**
 * Cliente de Integração preparado exclusivamente para o Gateway ASAAS no Backoffice da Plataforma.
 * Não utiliza nem suporta múltiplos gateways ou provedores legados.
 */
export class AsaasPlatformClient {
  private apiKey: string;
  private baseUrl: string;

  constructor() {
    this.apiKey = process.env.ASAAS_API_KEY || "";
    // Sandbox vs Produção
    this.baseUrl =
      process.env.ASAAS_ENVIRONMENT === "production"
        ? "https://api.asaas.com/v3"
        : "https://sandbox.asaas.com/api/v3";
  }

  private get headers() {
    return {
      "Content-Type": "application/json",
      access_token: this.apiKey,
    };
  }

  /**
   * Previsão: Criação de cliente no ASAAS vinculado à instituição (tenant)
   */
  async createCustomer(payload: AsaasCustomerPayload): Promise<AsaasCustomerResponse> {
    if (!this.apiKey) {
      // Mock estruturado enquanto a chave da API do ASAAS não é fornecida
      return {
        object: "customer",
        id: `cus_mock_${Date.now()}`,
        name: payload.name,
        email: payload.email,
        cpfCnpj: payload.cpfCnpj,
        dateCreated: new Date().toISOString(),
      };
    }

    const res = await fetch(`${this.baseUrl}/customers`, {
      method: "POST",
      headers: this.headers,
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(`Erro ASAAS createCustomer: ${JSON.stringify(err)}`);
    }

    return await res.json();
  }

  /**
   * Previsão: Criação de assinatura recorrente no ASAAS
   */
  async createSubscription(payload: AsaasSubscriptionPayload): Promise<AsaasSubscriptionResponse> {
    if (!this.apiKey) {
      // Mock estruturado
      return {
        object: "subscription",
        id: `sub_mock_${Date.now()}`,
        customer: payload.customer,
        dateCreated: new Date().toISOString(),
        value: payload.value,
        nextDueDate: payload.nextDueDate,
        cycle: payload.cycle,
        status: "ACTIVE",
      };
    }

    const res = await fetch(`${this.baseUrl}/subscriptions`, {
      method: "POST",
      headers: this.headers,
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(`Erro ASAAS createSubscription: ${JSON.stringify(err)}`);
    }

    return await res.json();
  }
}

export const asaasPlatformClient = new AsaasPlatformClient();

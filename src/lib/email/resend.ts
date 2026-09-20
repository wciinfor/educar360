import { Resend } from "resend";

export interface SendInviteEmailParams {
  toEmail: string;
  adminName: string;
  schoolName: string;
  inviteToken: string;
  planName?: string;
  trialDays?: number;
}

export interface SendEmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
  skipped?: boolean;
}

/**
 * Serviço de Envio de E-mail Centralizado com Resend.
 * Executa estritamente no servidor (Server-Side only).
 * Utiliza a variável RESEND_API_KEY ou fallback seguro para log caso não configurada.
 */
import { getActivationUrl } from "@/lib/urls";

export async function sendTenantInviteEmail(
  params: SendInviteEmailParams
): Promise<SendEmailResult> {
  const apiKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.RESEND_FROM_EMAIL || "Educar360 <noreply@educar360.com.br>";
  const activationUrl = getActivationUrl(params.inviteToken, params.toEmail);

  // Se a chave não estiver configurada no ambiente local/servidor, loga com segurança sem quebrar o fluxo
  if (!apiKey) {
    console.warn(
      "[Resend Email Service] RESEND_API_KEY não configurada. O convite de ativação foi gerado mas o e-mail não foi disparado via API externa.",
      {
        to: params.toEmail,
        school: params.schoolName,
        activationUrl,
      }
    );
    return {
      success: false,
      skipped: true,
      error: "RESEND_API_KEY não configurada no servidor.",
    };
  }

  try {
    const resend = new Resend(apiKey);
    const planName = params.planName || "Profissional";
    const trialDays = params.trialDays || 14;

    const htmlContent = `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Bem-vindo ao Educar360</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; color: #1e293b; margin: 0; padding: 0; }
    .container { max-width: 600px; margin: 40px auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px -5px rgba(15, 23, 42, 0.05); }
    .header { background: #1d4ed8; padding: 32px 24px; text-align: center; }
    .logo { color: #ffffff; font-size: 26px; font-weight: 800; letter-spacing: -0.5px; margin: 0; }
    .logo span { color: #60a5fa; }
    .tagline { color: #bfdbfe; font-size: 12px; margin-top: 4px; font-weight: 500; }
    .content { padding: 36px 32px; }
    .greeting { font-size: 20px; font-weight: 700; color: #0f172a; margin-bottom: 16px; }
    .paragraph { font-size: 15px; line-height: 1.6; color: #475569; margin-bottom: 20px; }
    .badge-box { background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 12px; padding: 16px; margin: 24px 0; text-align: center; }
    .badge-title { color: #15803d; font-weight: 700; font-size: 15px; margin-bottom: 4px; }
    .badge-desc { color: #166534; font-size: 13px; margin: 0; }
    .btn-container { text-align: center; margin: 32px 0; }
    .btn { display: inline-block; background: #10b981; color: #ffffff !important; text-decoration: none; padding: 14px 32px; border-radius: 12px; font-weight: 700; font-size: 15px; box-shadow: 0 4px 12px rgba(16, 185, 129, 0.25); }
    .btn:hover { background: #059669; }
    .link-alt { font-size: 12px; color: #94a3b8; word-break: break-all; margin-top: 24px; }
    .footer { background: #f8fafc; border-top: 1px solid #f1f5f9; padding: 24px; text-align: center; font-size: 12px; color: #64748b; }
    .footer a { color: #2563eb; text-decoration: none; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1 class="logo">Educar<span>360</span></h1>
      <div class="tagline">Gestão escolar sem limites</div>
    </div>
    <div class="content">
      <div class="greeting">Olá, ${params.adminName}!</div>
      <p class="paragraph">
        É com grande satisfação que damos as boas-vindas à <strong>${params.schoolName}</strong> na plataforma <strong>Educar360</strong>.
      </p>
      <p class="paragraph">
        O seu ambiente dedicado e isolado foi provisionado com sucesso para que você possa vivenciar a gestão escolar moderna, eficiente e sem burocracias.
      </p>
      
      <div class="badge-box">
        <div class="badge-title">✓ Período de ${trialDays} Dias Grátis Ativado</div>
        <div class="badge-desc">Plano <strong>${planName}</strong> · Sem necessidade de cartão de crédito</div>
      </div>

      <p class="paragraph" style="text-align: center;">
        Clique no botão abaixo para cadastrar sua senha de acesso e começar a explorar o painel escolar:
      </p>

      <div class="btn-container">
        <a href="${activationUrl}" target="_blank" class="btn">
          Ativar meu acesso &rarr;
        </a>
      </div>

      <p class="link-alt">
        Se o botão não funcionar, copie e cole este link diretamente no seu navegador:<br>
        <a href="${activationUrl}" style="color: #2563eb;">${activationUrl}</a>
      </p>
    </div>
    <div class="footer">
      <p style="margin: 0 0 6px 0;">© ${new Date().getFullYear()} Educar360. Todos os direitos reservados.</p>
      <p style="margin: 0;">Ambiente protegido com isolamento rigoroso de dados e em conformidade com a LGPD.</p>
    </div>
  </div>
</body>
</html>
    `;

    const { data, error } = await resend.emails.send({
      from: fromEmail,
      to: [params.toEmail],
      subject: `Seu acesso ao Educar360 está pronto! (${params.schoolName})`,
      html: htmlContent,
    });

    if (error) {
      console.error("[Resend Email Service] Erro retornado pela API do Resend:", error);
      return {
        success: false,
        error: error.message,
      };
    }

    return {
      success: true,
      messageId: data?.id,
    };
  } catch (err: any) {
    console.error("[Resend Email Service] Exceção inesperada ao enviar e-mail:", err);
    return {
      success: false,
      error: err?.message || "Erro desconhecido ao enviar e-mail.",
    };
  }
}

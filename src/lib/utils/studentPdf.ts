import { Student } from "@/types/secretaria";

/**
 * Utilitário para geração de Ficha Cadastral do Aluno em formato A4 para impressão e salvamento em PDF
 */

function formatGender(gender?: string | null): string {
  switch (gender) {
    case "male":
      return "Masculino";
    case "female":
      return "Feminino";
    case "other":
      return "Outro";
    case "uninformed":
    default:
      return "Não informado";
  }
}

function formatKinship(kinship?: string | null): string {
  switch (kinship) {
    case "mae":
      return "Mãe";
    case "pai":
      return "Pai";
    case "avo":
      return "Avô / Avó";
    case "tio":
      return "Tio / Tia";
    case "tutor":
      return "Tutor(a) Legal";
    case "outro":
    default:
      return "Outro";
  }
}

function calculateAge(birthDateStr?: string | null): string {
  if (!birthDateStr) return "";
  try {
    const birth = new Date(birthDateStr + "T00:00:00");
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return ` (${age} anos)`;
  } catch {
    return "";
  }
}

export function generateStudentHtml(student: Student, tenantName: string): string {
  const birthFormatted = student.birth_date
    ? new Date(student.birth_date + "T00:00:00").toLocaleDateString("pt-BR")
    : "Não informado";

  const ageText = calculateAge(student.birth_date);
  const emissionDate = new Date().toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  const cityState = student.city
    ? `${student.city} - ${student.state || "PA"}`
    : "Localidade Escolar";

  const todayExtensive = new Date().toLocaleDateString("pt-BR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>Ficha Cadastral - ${student.full_name}</title>
  <style>
    @page {
      size: A4 portrait;
      margin: 10mm 12mm;
    }
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      font-size: 9.5pt;
      line-height: 1.35;
      color: #0f172a;
      background: #ffffff;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .document-container {
      width: 100%;
      max-width: 190mm;
      margin: 0 auto;
    }
    
    /* CABEÇALHO INSTITUCIONAL */
    .header-table {
      width: 100%;
      border-bottom: 2px solid #1e293b;
      padding-bottom: 6px;
      margin-bottom: 8px;
    }
    .inst-name {
      font-size: 13pt;
      font-weight: 800;
      text-transform: uppercase;
      color: #0f172a;
      letter-spacing: 0.5px;
    }
    .inst-sub {
      font-size: 8pt;
      color: #475569;
      font-weight: 500;
    }
    .doc-meta {
      text-align: right;
      font-size: 8pt;
      color: #64748b;
    }
    .doc-meta strong {
      color: #1e293b;
    }

    /* TÍTULO PRINCIPAL DO DOCUMENTO */
    .title-banner {
      background-color: #f1f5f9;
      border: 1px solid #cbd5e1;
      padding: 6px 10px;
      text-align: center;
      margin-bottom: 10px;
      border-radius: 4px;
    }
    .title-banner h1 {
      font-size: 12pt;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 1px;
      color: #0f172a;
    }
    .title-banner p {
      font-size: 7.5pt;
      color: #475569;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    /* SEÇÕES E GRIDS */
    .section-block {
      margin-bottom: 8px;
      page-break-inside: avoid;
    }
    .section-title {
      font-size: 8pt;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      background-color: #e2e8f0;
      color: #1e293b;
      padding: 3px 8px;
      border: 1px solid #cbd5e1;
      border-bottom: none;
      border-radius: 4px 4px 0 0;
    }
    .section-content {
      border: 1px solid #cbd5e1;
      padding: 8px;
      border-radius: 0 0 4px 4px;
      background-color: #ffffff;
    }

    /* IDENTIFICAÇÃO COM FOTO */
    .id-wrapper {
      display: table;
      width: 100%;
    }
    .id-info {
      display: table-cell;
      vertical-align: top;
      width: 82%;
    }
    .id-photo {
      display: table-cell;
      vertical-align: top;
      width: 18%;
      text-align: right;
    }
    .photo-box {
      width: 25mm;
      height: 32mm;
      border: 1px solid #94a3b8;
      border-radius: 3px;
      display: inline-block;
      overflow: hidden;
      background-color: #f8fafc;
      text-align: center;
    }
    .photo-box img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
    .photo-placeholder {
      font-size: 7pt;
      color: #94a3b8;
      line-height: 32mm;
      text-transform: uppercase;
      font-weight: bold;
    }

    /* TABELAS DE DADOS */
    .data-table {
      width: 100%;
      border-collapse: collapse;
    }
    .data-table td {
      padding: 3px 4px;
      vertical-align: top;
      font-size: 8.5pt;
    }
    .lbl {
      font-weight: 700;
      color: #475569;
      font-size: 7.5pt;
      text-transform: uppercase;
      display: block;
      margin-bottom: 1px;
    }
    .val {
      font-weight: 600;
      color: #0f172a;
    }

    /* TABELA DE RESPONSÁVEIS */
    .guardians-table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 2px;
    }
    .guardians-table th {
      background-color: #f8fafc;
      border: 1px solid #cbd5e1;
      padding: 4px 6px;
      font-size: 7.5pt;
      text-transform: uppercase;
      font-weight: 800;
      color: #334155;
      text-align: left;
    }
    .guardians-table td {
      border: 1px solid #cbd5e1;
      padding: 4px 6px;
      font-size: 8pt;
      vertical-align: middle;
    }

    .badge {
      display: inline-block;
      padding: 1px 4px;
      font-size: 6.5pt;
      font-weight: 700;
      text-transform: uppercase;
      border-radius: 2px;
      border: 1px solid #94a3b8;
    }

    /* CAIXA DE SAÚDE */
    .alert-box {
      border-left: 3px solid #e11d48;
      background-color: #fff1f2;
      padding: 6px 8px;
      border-radius: 2px;
      font-size: 8.5pt;
      color: #9f1239;
    }

    /* TERMO E ASSINATURAS */
    .signatures-block {
      margin-top: 14px;
      page-break-inside: avoid;
    }
    .terms-text {
      font-size: 7.5pt;
      color: #475569;
      text-align: justify;
      margin-bottom: 12px;
      line-height: 1.25;
    }
    .date-line {
      text-align: right;
      font-size: 8.5pt;
      margin-bottom: 22px;
      font-weight: 600;
      color: #1e293b;
    }
    .signatures-table {
      width: 100%;
      border-collapse: collapse;
    }
    .signatures-table td {
      width: 50%;
      text-align: center;
      padding: 0 16px;
    }
    .sig-line {
      border-top: 1px solid #334155;
      margin-top: 24px;
      padding-top: 4px;
      font-size: 8pt;
      font-weight: bold;
      color: #0f172a;
    }
    .sig-sub {
      font-size: 7pt;
      color: #64748b;
    }

    /* RODAPÉ DO DOCUMENTO */
    .footer-bar {
      margin-top: 14px;
      border-top: 1px solid #cbd5e1;
      padding-top: 4px;
      display: table;
      width: 100%;
      font-size: 7pt;
      color: #64748b;
    }
    .footer-left {
      display: table-cell;
      text-align: left;
    }
    .footer-right {
      display: table-cell;
      text-align: right;
    }
  </style>
</head>
<body>
  <div class="document-container">
    
    <!-- CABEÇALHO INSTITUCIONAL -->
    <table class="header-table">
      <tr>
        <td style="vertical-align: middle;">
          <div class="inst-name">${tenantName}</div>
          <div class="inst-sub">Secretaria Escolar • Sistema de Gestão Educacional Educar360</div>
        </td>
        <td class="doc-meta" style="vertical-align: middle;">
          <div>Emissão: <strong>${emissionDate}</strong></div>
          <div>Prontuário Nº: <strong>MAT-${student.id.slice(0, 8).toUpperCase()}</strong></div>
          <div>Status: <strong>${student.is_active ? "ATIVO" : "INATIVO"}</strong></div>
        </td>
      </tr>
    </table>

    <!-- BANNER DE TÍTULO -->
    <div class="title-banner">
      <h1>Ficha Cadastral do Aluno</h1>
      <p>Prontuário Oficial do Discente • Registro Civil, Documental e Familiar</p>
    </div>

    <!-- SEÇÃO 1: IDENTIFICAÇÃO CIVIL DO ALUNO -->
    <div class="section-block">
      <div class="section-title">1. Identificação Civil & Dados Pessoais</div>
      <div class="section-content">
        <div class="id-wrapper">
          <div class="id-info">
            <table class="data-table">
              <tr>
                <td colspan="3" style="padding-bottom: 6px;">
                  <span class="lbl">Nome Completo do Aluno</span>
                  <span class="val" style="font-size: 11pt; color: #0f172a;">${student.full_name || student.first_name + " " + student.last_name}</span>
                </td>
              </tr>
              <tr>
                <td style="width: 33%;">
                  <span class="lbl">Data de Nascimento</span>
                  <span class="val">${birthFormatted}${ageText}</span>
                </td>
                <td style="width: 33%;">
                  <span class="lbl">Sexo / Gênero</span>
                  <span class="val">${formatGender(student.gender)}</span>
                </td>
                <td style="width: 34%;">
                  <span class="lbl">CPF</span>
                  <span class="val">${student.cpf || "Não informado"}</span>
                </td>
              </tr>
              <tr>
                <td>
                  <span class="lbl">RG / Certidão de Nascimento</span>
                  <span class="val">${student.rg || "Não informado"}</span>
                </td>
                <td>
                  <span class="lbl">Órgão Emissor / UF</span>
                  <span class="val">${student.rg_issuer || "Não informado"}</span>
                </td>
                <td>
                  <span class="lbl">Nacionalidade</span>
                  <span class="val">Brasileira</span>
                </td>
              </tr>
              <tr>
                <td>
                  <span class="lbl">WhatsApp / Celular</span>
                  <span class="val">${student.whatsapp || "Não informado"}</span>
                </td>
                <td>
                  <span class="lbl">Telefone Fixo</span>
                  <span class="val">${student.phone || "Não informado"}</span>
                </td>
                <td>
                  <span class="lbl">E-mail do Aluno</span>
                  <span class="val">${student.email || "Não informado"}</span>
                </td>
              </tr>
            </table>
          </div>
          <div class="id-photo">
            <div class="photo-box">
              ${
                student.photo_url
                  ? `<img src="${student.photo_url}" alt="Foto 3x4" />`
                  : `<div class="photo-placeholder">Foto 3x4</div>`
              }
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- SEÇÃO 2: ENDEREÇO RESIDENCIAL -->
    <div class="section-block">
      <div class="section-title">2. Endereço Residencial</div>
      <div class="section-content">
        <table class="data-table">
          <tr>
            <td style="width: 25%;">
              <span class="lbl">CEP</span>
              <span class="val">${student.postal_code || "Não informado"}</span>
            </td>
            <td style="width: 55%;">
              <span class="lbl">Logradouro (Rua / Av)</span>
              <span class="val">${student.street || "Não informado"}</span>
            </td>
            <td style="width: 20%;">
              <span class="lbl">Número</span>
              <span class="val">${student.number || "S/N"}</span>
            </td>
          </tr>
          <tr>
            <td>
              <span class="lbl">Complemento</span>
              <span class="val">${student.complement || "Nenhum"}</span>
            </td>
            <td>
              <span class="lbl">Bairro</span>
              <span class="val">${student.neighborhood || "Não informado"}</span>
            </td>
            <td>
              <span class="lbl">Cidade / UF</span>
              <span class="val">${student.city ? student.city + " - " + (student.state || "") : "Não informado"}</span>
            </td>
          </tr>
        </table>
      </div>
    </div>

    <!-- SEÇÃO 3: RESPONSÁVEIS LEGAIS & VÍNCULOS -->
    <div class="section-block">
      <div class="section-title">3. Responsáveis Legais & Vínculos Familiares</div>
      <div class="section-content">
        ${
          student.guardians && student.guardians.length > 0
            ? `<table class="guardians-table">
                <thead>
                  <tr>
                    <th>Nome do Responsável</th>
                    <th style="width: 14%;">Vínculo</th>
                    <th style="width: 22%;">Documentos</th>
                    <th style="width: 24%;">Contatos</th>
                    <th style="width: 16%;">Atribuição</th>
                  </tr>
                </thead>
                <tbody>
                  ${student.guardians
                    .map(
                      (g) => `<tr>
                        <td>
                          <strong>${g.guardian?.name || "Responsável"}</strong>
                          ${g.guardian?.profession ? `<div style="font-size: 7pt; color: #64748b;">Profissão: ${g.guardian.profession}</div>` : ""}
                        </td>
                        <td>${formatKinship(g.kinship)}</td>
                        <td>
                          <div>CPF: ${g.guardian?.cpf || "N/A"}</div>
                          ${g.guardian?.rg ? `<div style="font-size: 7pt; color: #64748b;">RG: ${g.guardian.rg}</div>` : ""}
                        </td>
                        <td>
                          <div>Tel: ${g.guardian?.whatsapp || g.guardian?.phone || "N/A"}</div>
                          ${g.guardian?.email ? `<div style="font-size: 7pt; color: #64748b;">${g.guardian.email}</div>` : ""}
                        </td>
                        <td>
                          ${g.is_financial ? `<span class="badge" style="background:#ecfdf5;color:#065f46;border-color:#a7f3d0;">Financeiro</span> ` : ""}
                          ${g.is_pedagogical ? `<span class="badge" style="background:#eef2ff;color:#3730a3;border-color:#c7d2fe;">Pedagógico</span>` : ""}
                        </td>
                      </tr>`
                    )
                    .join("")}
                </tbody>
              </table>`
            : `<p style="font-size: 8pt; color: #94a3b8; font-style: italic; padding: 4px;">Nenhum responsável legal vinculado no momento.</p>`
        }
      </div>
    </div>

    <!-- SEÇÃO 4: SAÚDE, RESTRIÇÕES E ALERGIAS -->
    <div class="section-block">
      <div class="section-title">4. Observações Médicas e Restrições de Saúde</div>
      <div class="section-content">
        ${
          student.medical_notes
            ? `<div class="alert-box">
                <strong>RESTRIÇÕES / CUIDADOS ESPECIAIS:</strong><br/>
                ${student.medical_notes}
              </div>`
            : `<p style="font-size: 8pt; color: #64748b; font-style: italic;">Nenhuma restrição médica, alergia ou medicação contínua declarada no ato da matrícula.</p>`
        }
      </div>
    </div>

    <!-- SEÇÃO 5: OBSERVAÇÕES INTERNAS DA SECRETARIA -->
    ${
      student.general_notes
        ? `<div class="section-block">
            <div class="section-title">5. Anotações Gerais da Secretaria</div>
            <div class="section-content">
              <p style="font-size: 8pt; color: #334155; line-height: 1.3;">${student.general_notes}</p>
            </div>
          </div>`
        : ""
    }

    <!-- TERMO DE DECLARAÇÃO E ASSINATURAS -->
    <div class="signatures-block">
      <p class="terms-text">
        Declaro que as informações cadastrais prestadas acima são a expressão da verdade e conferem integralmente com os documentos originais apresentados perante a secretaria escolar desta instituição de ensino. Comprometo-me a comunicar imediatamente à escola qualquer alteração cadastral, de endereço, contato ou de saúde.
      </p>

      <div class="date-line">
        ${cityState}, ${todayExtensive}.
      </div>

      <table class="signatures-table">
        <tr>
          <td>
            <div class="sig-line">Responsável Legal pelo Discente</div>
            <div class="sig-sub">Assinatura conforme documento de identidade</div>
          </td>
          <td>
            <div class="sig-line">Secretaria Escolar / Direção</div>
            <div class="sig-sub">${tenantName}</div>
          </td>
        </tr>
      </table>
    </div>

    <!-- RODAPÉ DO DOCUMENTO -->
    <div class="footer-bar">
      <div class="footer-left">
        Educar360 • Plataforma de Gestão Escolar Integrada
      </div>
      <div class="footer-right">
        Ficha Cadastral Discente • Via da Secretaria Escolar
      </div>
    </div>

  </div>
</body>
</html>`;
}

/**
 * Dispara a impressão ou download em PDF da Ficha Cadastral através de um iframe isolado
 */
export function printStudentCard(student: Student, tenantName: string) {
  if (typeof window === "undefined") return;

  const iframe = document.createElement("iframe");
  iframe.setAttribute(
    "style",
    "position:fixed;right:0;bottom:0;width:0;height:0;border:0;opacity:0;pointer-events:none;"
  );
  document.body.appendChild(iframe);

  const doc = iframe.contentWindow?.document;
  if (!doc) return;

  const html = generateStudentHtml(student, tenantName);
  doc.open();
  doc.write(html);
  doc.close();

  const handlePrint = () => {
    try {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
    } catch (err) {
      console.error("Falha ao invocar impressão da ficha do aluno:", err);
    } finally {
      setTimeout(() => {
        if (document.body.contains(iframe)) {
          document.body.removeChild(iframe);
        }
      }, 2500);
    }
  };

  if (iframe.contentWindow) {
    iframe.contentWindow.onload = handlePrint;
    // Timeout para execução imediata em caso de imagens em cache ou base64
    setTimeout(handlePrint, 400);
  }
}

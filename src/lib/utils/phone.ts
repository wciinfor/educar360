/**
 * Utilitários de normalização, formatação e validação de Telefone/WhatsApp brasileiro.
 * Suporta telefones fixos (10 dígitos: DDD + 8 dígitos) e celulares (11 dígitos: DDD + 9 dígitos).
 */

export const VALID_BRAZILIAN_DDDS = new Set([
  "11", "12", "13", "14", "15", "16", "17", "18", "19",
  "21", "22", "24", "27", "28",
  "31", "32", "33", "34", "35", "37", "38",
  "41", "42", "43", "44", "45", "46", "47", "48", "49",
  "51", "53", "54", "55",
  "61", "62", "63", "64", "65", "66", "67", "68", "69",
  "71", "73", "74", "75", "77", "79",
  "81", "82", "83", "84", "85", "86", "87", "88", "89",
  "91", "92", "93", "94", "95", "96", "97", "98", "99",
]);

/**
 * Normaliza o telefone mantendo apenas os dígitos (máximo 11 dígitos).
 */
export function normalizePhoneDigits(value?: string | null): string {
  if (!value) return "";
  return value.replace(/\D/g, "").slice(0, 11);
}

/**
 * Aplica máscara progressiva brasileira em tempo real:
 * - Fixo (10 dígitos): (XX) XXXX-XXXX
 * - Celular (11 dígitos): (XX) XXXXX-XXXX
 */
export function formatPhoneBR(value?: string | null): string {
  const digits = normalizePhoneDigits(value);
  if (!digits) return "";

  if (digits.length <= 2) {
    return `(${digits}`;
  }
  if (digits.length <= 6) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  }
  if (digits.length <= 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  }
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7, 11)}`;
}

export interface PhoneValidationResult {
  valid: boolean;
  error?: string;
  cleanDigits: string;
  formatted: string;
}

/**
 * Validação rigorosa de telefone brasileiro:
 * 1. Quantidade de dígitos (10 para fixo, 11 para celular).
 * 2. DDD válido conforme tabela oficial da ANATEL.
 * 3. Dígito inicial após DDD (9 para celular, 2 a 5 para fixo).
 * 4. Rejeição de sequências falsas com todos os dígitos iguais.
 */
export function validateBrazilianPhone(value?: string | null): PhoneValidationResult {
  const cleanDigits = normalizePhoneDigits(value);
  const formatted = formatPhoneBR(cleanDigits);

  if (!cleanDigits) {
    return {
      valid: false,
      error: "O telefone/WhatsApp é obrigatório.",
      cleanDigits: "",
      formatted: "",
    };
  }

  if (cleanDigits.length < 10) {
    return {
      valid: false,
      error: "Telefone incompleto. Informe o DDD e o número completo com 10 ou 11 dígitos.",
      cleanDigits,
      formatted,
    };
  }

  if (cleanDigits.length > 11) {
    return {
      valid: false,
      error: "Telefone inválido. Deve possuir no máximo 11 dígitos com DDD.",
      cleanDigits,
      formatted,
    };
  }

  // Rejeita sequências repetidas como 11111111111 ou 0000000000
  if (/^(\d)\1+$/.test(cleanDigits)) {
    return {
      valid: false,
      error: "Por favor, informe um número de telefone real.",
      cleanDigits,
      formatted,
    };
  }

  const ddd = cleanDigits.slice(0, 2);
  if (!VALID_BRAZILIAN_DDDS.has(ddd)) {
    return {
      valid: false,
      error: `O DDD (${ddd}) não é um código de área brasileiro válido.`,
      cleanDigits,
      formatted,
    };
  }

  const firstDigitAfterDdd = cleanDigits.charAt(2);

  // Celular (11 dígitos): o 3º dígito obrigatoriamente deve ser '9'
  if (cleanDigits.length === 11) {
    if (firstDigitAfterDdd !== "9") {
      return {
        valid: false,
        error: "Números de celular com 11 dígitos devem iniciar com o dígito 9 após o DDD.",
        cleanDigits,
        formatted,
      };
    }
  }

  // Telefone Fixo (10 dígitos): o 3º dígito normalmente é 2, 3, 4 ou 5
  if (cleanDigits.length === 10) {
    if (!["2", "3", "4", "5"].includes(firstDigitAfterDdd)) {
      return {
        valid: false,
        error: "Telefones fixos com 10 dígitos devem iniciar com 2, 3, 4 ou 5 após o DDD.",
        cleanDigits,
        formatted,
      };
    }
  }

  return {
    valid: true,
    cleanDigits,
    formatted,
  };
}

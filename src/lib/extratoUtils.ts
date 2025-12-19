// Utility functions for Extrato Asaas

// Mapeamento de tipos de transação para labels amigáveis
const TIPO_TRANSACAO_MAP: Record<string, string> = {
  'Taxa de boleto, cartão ou Pix': 'Saídas - Taxa de pagamento',
  'Taxa de mensageria de fatura': 'Saídas - Mensageria',
  'Taxa de notificação por WhatsApp': 'Saídas - WhatsApp',
  'Taxa de notificação por voz': 'Saídas - Voz',
};

export function formatarTipoTransacao(tipo: string): string {
  return TIPO_TRANSACAO_MAP[tipo] || tipo;
}

// Função reversa para buscar o tipo original a partir do label
export function getTipoOriginal(label: string): string {
  for (const [original, mapped] of Object.entries(TIPO_TRANSACAO_MAP)) {
    if (mapped === label) return original;
  }
  return label;
}

// Formata valor em moeda brasileira
export function formatCurrency(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

// Formata número com separador de milhar brasileiro
export function formatNumber(value: number): string {
  return new Intl.NumberFormat("pt-BR").format(value);
}

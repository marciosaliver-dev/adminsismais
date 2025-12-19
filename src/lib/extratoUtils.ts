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

/**
 * Parse de data DD/MM/YYYY ou YYYY-MM-DD para string ISO YYYY-MM-DD
 * SEM conversão de timezone - mantém a data exatamente como está no arquivo
 */
export function parseDateBR(dateString: string | number | Date | null | undefined): string | null {
  if (!dateString) return null;
  
  // Se for número (Excel serial date)
  if (typeof dateString === 'number') {
    // Excel serial date: dias desde 1/1/1900 (com bug do leap year 1900)
    const excelEpoch = new Date(Date.UTC(1899, 11, 30));
    const date = new Date(excelEpoch.getTime() + dateString * 86400000);
    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    const day = String(date.getUTCDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
  
  // Se for Date object
  if (dateString instanceof Date) {
    // Usar UTC para evitar timezone shift
    const year = dateString.getUTCFullYear();
    const month = String(dateString.getUTCMonth() + 1).padStart(2, '0');
    const day = String(dateString.getUTCDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
  
  const str = String(dateString).trim();
  if (!str) return null;
  
  let day: number, month: number, year: number;
  
  // Formato DD/MM/YYYY
  if (str.includes('/')) {
    const parts = str.split('/');
    if (parts.length !== 3) return null;
    day = parseInt(parts[0], 10);
    month = parseInt(parts[1], 10);
    year = parseInt(parts[2], 10);
  } 
  // Formato YYYY-MM-DD
  else if (str.includes('-')) {
    const parts = str.split('-');
    if (parts.length !== 3) return null;
    year = parseInt(parts[0], 10);
    month = parseInt(parts[1], 10);
    day = parseInt(parts[2], 10);
  } else {
    return null;
  }
  
  // Validação básica
  if (isNaN(day) || isNaN(month) || isNaN(year)) return null;
  if (day < 1 || day > 31 || month < 1 || month > 12 || year < 1900) return null;
  
  // Retorna string ISO sem hora (YYYY-MM-DD) - evita qualquer conversão de timezone
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

/**
 * Formata data ISO YYYY-MM-DD para DD/MM/YYYY
 * SEM conversão de timezone
 */
export function formatDateBR(dateValue: string | null | undefined): string {
  if (!dateValue) return '';
  
  // Se vier como string "YYYY-MM-DD"
  if (typeof dateValue === 'string' && dateValue.includes('-')) {
    const parts = dateValue.split('-');
    if (parts.length === 3) {
      const [year, month, day] = parts;
      return `${day}/${month}/${year}`;
    }
  }
  
  return dateValue;
}

/**
 * Compara datas como strings YYYY-MM-DD para filtros
 * Evita conversão para Date object
 */
export function isDateInRange(date: string, startDate?: string, endDate?: string): boolean {
  if (!date) return false;
  if (startDate && date < startDate) return false;
  if (endDate && date > endDate) return false;
  return true;
}

/**
 * Converte Date object de um DatePicker para string YYYY-MM-DD
 * Usando componentes locais (não UTC) já que o DatePicker usa hora local
 */
export function datePickerToString(date: Date | undefined): string | undefined {
  if (!date) return undefined;
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

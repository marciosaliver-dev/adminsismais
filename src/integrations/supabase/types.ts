export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      comissao_calculada: {
        Row: {
          bonus_anual: number
          bonus_empresa: number
          bonus_meta_equipe: number
          comissao_venda_unica: number
          created_at: string
          faixa_nome: string | null
          fechamento_id: string
          id: string
          mrr_comissao: number
          mrr_total: number
          percentual: number
          qtd_vendas: number
          total_receber: number
          updated_at: string
          valor_comissao: number
          vendedor: string
        }
        Insert: {
          bonus_anual?: number
          bonus_empresa?: number
          bonus_meta_equipe?: number
          comissao_venda_unica?: number
          created_at?: string
          faixa_nome?: string | null
          fechamento_id: string
          id?: string
          mrr_comissao?: number
          mrr_total?: number
          percentual?: number
          qtd_vendas?: number
          total_receber?: number
          updated_at?: string
          valor_comissao?: number
          vendedor: string
        }
        Update: {
          bonus_anual?: number
          bonus_empresa?: number
          bonus_meta_equipe?: number
          comissao_venda_unica?: number
          created_at?: string
          faixa_nome?: string | null
          fechamento_id?: string
          id?: string
          mrr_comissao?: number
          mrr_total?: number
          percentual?: number
          qtd_vendas?: number
          total_receber?: number
          updated_at?: string
          valor_comissao?: number
          vendedor?: string
        }
        Relationships: [
          {
            foreignKeyName: "comissao_calculada_fechamento_id_fkey"
            columns: ["fechamento_id"]
            isOneToOne: false
            referencedRelation: "fechamento_comissao"
            referencedColumns: ["id"]
          },
        ]
      }
      configuracao_comissao: {
        Row: {
          chave: string
          created_at: string
          descricao: string | null
          id: string
          updated_at: string
          valor: string
        }
        Insert: {
          chave: string
          created_at?: string
          descricao?: string | null
          id?: string
          updated_at?: string
          valor: string
        }
        Update: {
          chave?: string
          created_at?: string
          descricao?: string | null
          id?: string
          updated_at?: string
          valor?: string
        }
        Relationships: []
      }
      extrato_asaas: {
        Row: {
          created_at: string
          data: string
          descricao: string
          fatura_cobranca: string | null
          fatura_parcelamento: string | null
          id: string
          importacao_id: string
          nota_fiscal: string | null
          saldo: number
          tipo_lancamento: string
          tipo_transacao: string
          transacao_id: string
          valor: number
        }
        Insert: {
          created_at?: string
          data: string
          descricao: string
          fatura_cobranca?: string | null
          fatura_parcelamento?: string | null
          id?: string
          importacao_id: string
          nota_fiscal?: string | null
          saldo?: number
          tipo_lancamento: string
          tipo_transacao: string
          transacao_id: string
          valor?: number
        }
        Update: {
          created_at?: string
          data?: string
          descricao?: string
          fatura_cobranca?: string | null
          fatura_parcelamento?: string | null
          id?: string
          importacao_id?: string
          nota_fiscal?: string | null
          saldo?: number
          tipo_lancamento?: string
          tipo_transacao?: string
          transacao_id?: string
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "extrato_asaas_importacao_id_fkey"
            columns: ["importacao_id"]
            isOneToOne: false
            referencedRelation: "importacoes_extrato"
            referencedColumns: ["id"]
          },
        ]
      }
      faixa_comissao: {
        Row: {
          ativo: boolean
          created_at: string
          id: string
          mrr_max: number | null
          mrr_min: number
          nome: string
          ordem: number
          percentual: number
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          id?: string
          mrr_max?: number | null
          mrr_min?: number
          nome: string
          ordem?: number
          percentual?: number
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          id?: string
          mrr_max?: number | null
          mrr_min?: number
          nome?: string
          ordem?: number
          percentual?: number
          updated_at?: string
        }
        Relationships: []
      }
      fechamento_comissao: {
        Row: {
          arquivo_nome: string | null
          created_at: string
          data_importacao: string
          id: string
          mes_referencia: string
          meta_batida: boolean
          status: string
          total_mrr: number
          total_vendas: number
          updated_at: string
        }
        Insert: {
          arquivo_nome?: string | null
          created_at?: string
          data_importacao?: string
          id?: string
          mes_referencia: string
          meta_batida?: boolean
          status?: string
          total_mrr?: number
          total_vendas?: number
          updated_at?: string
        }
        Update: {
          arquivo_nome?: string | null
          created_at?: string
          data_importacao?: string
          id?: string
          mes_referencia?: string
          meta_batida?: boolean
          status?: string
          total_mrr?: number
          total_vendas?: number
          updated_at?: string
        }
        Relationships: []
      }
      importacoes_extrato: {
        Row: {
          arquivo_nome: string
          created_at: string
          id: string
          observacao: string | null
          periodo_fim: string
          periodo_inicio: string
          registros_duplicados: number
          registros_novos: number
          saldo_final: number
          status: string
          total_creditos: number
          total_debitos: number
          total_registros: number
        }
        Insert: {
          arquivo_nome: string
          created_at?: string
          id?: string
          observacao?: string | null
          periodo_fim: string
          periodo_inicio: string
          registros_duplicados?: number
          registros_novos?: number
          saldo_final?: number
          status?: string
          total_creditos?: number
          total_debitos?: number
          total_registros?: number
        }
        Update: {
          arquivo_nome?: string
          created_at?: string
          id?: string
          observacao?: string | null
          periodo_fim?: string
          periodo_inicio?: string
          registros_duplicados?: number
          registros_novos?: number
          saldo_final?: number
          status?: string
          total_creditos?: number
          total_debitos?: number
          total_registros?: number
        }
        Relationships: []
      }
      meta_mensal: {
        Row: {
          bonus_meta_empresa: number
          bonus_meta_equipe: number
          comissao_venda_unica: number
          created_at: string
          id: string
          ltv_medio: number
          mes_referencia: string
          meta_mrr: number
          meta_quantidade: number
          multiplicador_anual: number
          num_colaboradores: number
          observacao: string | null
          updated_at: string
        }
        Insert: {
          bonus_meta_empresa?: number
          bonus_meta_equipe?: number
          comissao_venda_unica?: number
          created_at?: string
          id?: string
          ltv_medio?: number
          mes_referencia: string
          meta_mrr?: number
          meta_quantidade?: number
          multiplicador_anual?: number
          num_colaboradores?: number
          observacao?: string | null
          updated_at?: string
        }
        Update: {
          bonus_meta_empresa?: number
          bonus_meta_equipe?: number
          comissao_venda_unica?: number
          created_at?: string
          id?: string
          ltv_medio?: number
          mes_referencia?: string
          meta_mrr?: number
          meta_quantidade?: number
          multiplicador_anual?: number
          num_colaboradores?: number
          observacao?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      venda_importada: {
        Row: {
          cliente: string | null
          conta_comissao: boolean
          conta_faixa: boolean
          conta_meta: boolean
          created_at: string
          data_contrato: string | null
          email: string | null
          fechamento_id: string
          id: string
          intervalo: string | null
          num_contrato: string | null
          plano: string | null
          plataforma: string | null
          tipo_venda: string | null
          updated_at: string
          valor_adesao: number
          valor_assinatura: number
          valor_mrr: number
          vendedor: string | null
        }
        Insert: {
          cliente?: string | null
          conta_comissao?: boolean
          conta_faixa?: boolean
          conta_meta?: boolean
          created_at?: string
          data_contrato?: string | null
          email?: string | null
          fechamento_id: string
          id?: string
          intervalo?: string | null
          num_contrato?: string | null
          plano?: string | null
          plataforma?: string | null
          tipo_venda?: string | null
          updated_at?: string
          valor_adesao?: number
          valor_assinatura?: number
          valor_mrr?: number
          vendedor?: string | null
        }
        Update: {
          cliente?: string | null
          conta_comissao?: boolean
          conta_faixa?: boolean
          conta_meta?: boolean
          created_at?: string
          data_contrato?: string | null
          email?: string | null
          fechamento_id?: string
          id?: string
          intervalo?: string | null
          num_contrato?: string | null
          plano?: string | null
          plataforma?: string | null
          tipo_venda?: string | null
          updated_at?: string
          valor_adesao?: number
          valor_assinatura?: number
          valor_mrr?: number
          vendedor?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "venda_importada_fechamento_id_fkey"
            columns: ["fechamento_id"]
            isOneToOne: false
            referencedRelation: "fechamento_comissao"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const

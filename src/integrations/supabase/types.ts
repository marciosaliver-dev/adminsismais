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
      ajuste_comissao: {
        Row: {
          created_at: string
          created_by: string | null
          descricao: string
          fechamento_id: string
          id: string
          tipo: string
          valor: number
          vendedor: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          descricao: string
          fechamento_id: string
          id?: string
          tipo: string
          valor?: number
          vendedor: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          descricao?: string
          fechamento_id?: string
          id?: string
          tipo?: string
          valor?: number
          vendedor?: string
        }
        Relationships: [
          {
            foreignKeyName: "ajuste_comissao_fechamento_id_fkey"
            columns: ["fechamento_id"]
            isOneToOne: false
            referencedRelation: "fechamento_comissao"
            referencedColumns: ["id"]
          },
        ]
      }
      ajuste_fechamento_equipe: {
        Row: {
          colaborador_id: string | null
          created_at: string
          created_by: string | null
          descricao: string
          fechamento_equipe_id: string
          id: string
          tipo: string
          valor: number
        }
        Insert: {
          colaborador_id?: string | null
          created_at?: string
          created_by?: string | null
          descricao: string
          fechamento_equipe_id: string
          id?: string
          tipo: string
          valor?: number
        }
        Update: {
          colaborador_id?: string | null
          created_at?: string
          created_by?: string | null
          descricao?: string
          fechamento_equipe_id?: string
          id?: string
          tipo?: string
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "ajuste_fechamento_equipe_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "colaboradores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ajuste_fechamento_equipe_fechamento_equipe_id_fkey"
            columns: ["fechamento_equipe_id"]
            isOneToOne: false
            referencedRelation: "fechamento_equipe"
            referencedColumns: ["id"]
          },
        ]
      }
      colaboradores: {
        Row: {
          ativo: boolean | null
          cargo: string | null
          created_at: string | null
          data_admissao: string | null
          departamento: string | null
          eh_vendedor_direto: boolean | null
          email: string | null
          id: string
          nome: string
          participa_fechamento_equipe: boolean | null
          percentual_comissao: number | null
          salario_base: number
          telefone: string | null
          updated_at: string | null
        }
        Insert: {
          ativo?: boolean | null
          cargo?: string | null
          created_at?: string | null
          data_admissao?: string | null
          departamento?: string | null
          eh_vendedor_direto?: boolean | null
          email?: string | null
          id?: string
          nome: string
          participa_fechamento_equipe?: boolean | null
          percentual_comissao?: number | null
          salario_base?: number
          telefone?: string | null
          updated_at?: string | null
        }
        Update: {
          ativo?: boolean | null
          cargo?: string | null
          created_at?: string | null
          data_admissao?: string | null
          departamento?: string | null
          eh_vendedor_direto?: boolean | null
          email?: string | null
          id?: string
          nome?: string
          participa_fechamento_equipe?: boolean | null
          percentual_comissao?: number | null
          salario_base?: number
          telefone?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
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
      contratos_assinatura: {
        Row: {
          cancelado_por: string | null
          ciclo_dias: number
          codigo_assinatura: string
          created_at: string
          cupom: string | null
          data_cancelamento: string | null
          data_fim_ciclo: string | null
          data_inicio: string | null
          data_proximo_ciclo: string | null
          data_status: string | null
          doc_contato: string | null
          email_contato: string | null
          forma_pagamento: string | null
          id: string
          importacao_id: string | null
          motivo_cancelamento: string | null
          mrr: number | null
          nome_assinatura: string | null
          nome_contato: string | null
          nome_oferta: string | null
          nome_produto: string | null
          parcelamento: number | null
          plataforma: string
          quantidade_cobrancas: number | null
          status: string
          telefone_contato: string | null
          updated_at: string
          valor_assinatura: number
          valor_liquido: number | null
        }
        Insert: {
          cancelado_por?: string | null
          ciclo_dias?: number
          codigo_assinatura: string
          created_at?: string
          cupom?: string | null
          data_cancelamento?: string | null
          data_fim_ciclo?: string | null
          data_inicio?: string | null
          data_proximo_ciclo?: string | null
          data_status?: string | null
          doc_contato?: string | null
          email_contato?: string | null
          forma_pagamento?: string | null
          id?: string
          importacao_id?: string | null
          motivo_cancelamento?: string | null
          mrr?: number | null
          nome_assinatura?: string | null
          nome_contato?: string | null
          nome_oferta?: string | null
          nome_produto?: string | null
          parcelamento?: number | null
          plataforma: string
          quantidade_cobrancas?: number | null
          status?: string
          telefone_contato?: string | null
          updated_at?: string
          valor_assinatura?: number
          valor_liquido?: number | null
        }
        Update: {
          cancelado_por?: string | null
          ciclo_dias?: number
          codigo_assinatura?: string
          created_at?: string
          cupom?: string | null
          data_cancelamento?: string | null
          data_fim_ciclo?: string | null
          data_inicio?: string | null
          data_proximo_ciclo?: string | null
          data_status?: string | null
          doc_contato?: string | null
          email_contato?: string | null
          forma_pagamento?: string | null
          id?: string
          importacao_id?: string | null
          motivo_cancelamento?: string | null
          mrr?: number | null
          nome_assinatura?: string | null
          nome_contato?: string | null
          nome_oferta?: string | null
          nome_produto?: string | null
          parcelamento?: number | null
          plataforma?: string
          quantidade_cobrancas?: number | null
          status?: string
          telefone_contato?: string | null
          updated_at?: string
          valor_assinatura?: number
          valor_liquido?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "contratos_assinatura_importacao_id_fkey"
            columns: ["importacao_id"]
            isOneToOne: false
            referencedRelation: "importacoes_assinaturas"
            referencedColumns: ["id"]
          },
        ]
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
      extrato_eduzz: {
        Row: {
          created_at: string
          data: string
          descricao: string
          fatura_id: string
          id: string
          importacao_id: string
          tipo_transacao: string
          valor: number | null
        }
        Insert: {
          created_at?: string
          data: string
          descricao: string
          fatura_id: string
          id?: string
          importacao_id: string
          tipo_transacao: string
          valor?: number | null
        }
        Update: {
          created_at?: string
          data?: string
          descricao?: string
          fatura_id?: string
          id?: string
          importacao_id?: string
          tipo_transacao?: string
          valor?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "extrato_eduzz_importacao_id_fkey"
            columns: ["importacao_id"]
            isOneToOne: false
            referencedRelation: "importacoes_extrato_eduzz"
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
      fechamento_colaborador: {
        Row: {
          bonus_churn: number | null
          bonus_meta_equipe: number | null
          bonus_retencao: number | null
          cargo: string | null
          colaborador_id: string
          comissao_servicos: number | null
          created_at: string | null
          enviado: boolean | null
          enviado_em: string | null
          enviado_para: string | null
          fechamento_equipe_id: string
          id: string
          nome_colaborador: string
          percentual_comissao: number | null
          qtd_metas_atingidas: number | null
          qtd_metas_individuais: number | null
          qtd_vendas_servicos: number | null
          relatorio_html: string | null
          salario_base: number | null
          subtotal_bonus_equipe: number | null
          total_a_receber: number | null
          total_bonus_metas_individuais: number | null
          total_vendas_servicos: number | null
        }
        Insert: {
          bonus_churn?: number | null
          bonus_meta_equipe?: number | null
          bonus_retencao?: number | null
          cargo?: string | null
          colaborador_id: string
          comissao_servicos?: number | null
          created_at?: string | null
          enviado?: boolean | null
          enviado_em?: string | null
          enviado_para?: string | null
          fechamento_equipe_id: string
          id?: string
          nome_colaborador: string
          percentual_comissao?: number | null
          qtd_metas_atingidas?: number | null
          qtd_metas_individuais?: number | null
          qtd_vendas_servicos?: number | null
          relatorio_html?: string | null
          salario_base?: number | null
          subtotal_bonus_equipe?: number | null
          total_a_receber?: number | null
          total_bonus_metas_individuais?: number | null
          total_vendas_servicos?: number | null
        }
        Update: {
          bonus_churn?: number | null
          bonus_meta_equipe?: number | null
          bonus_retencao?: number | null
          cargo?: string | null
          colaborador_id?: string
          comissao_servicos?: number | null
          created_at?: string | null
          enviado?: boolean | null
          enviado_em?: string | null
          enviado_para?: string | null
          fechamento_equipe_id?: string
          id?: string
          nome_colaborador?: string
          percentual_comissao?: number | null
          qtd_metas_atingidas?: number | null
          qtd_metas_individuais?: number | null
          qtd_vendas_servicos?: number | null
          relatorio_html?: string | null
          salario_base?: number | null
          subtotal_bonus_equipe?: number | null
          total_a_receber?: number | null
          total_bonus_metas_individuais?: number | null
          total_vendas_servicos?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "fechamento_colaborador_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "colaboradores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fechamento_colaborador_fechamento_equipe_id_fkey"
            columns: ["fechamento_equipe_id"]
            isOneToOne: false
            referencedRelation: "fechamento_equipe"
            referencedColumns: ["id"]
          },
        ]
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
      fechamento_equipe: {
        Row: {
          assinaturas_inicio_mes: number | null
          bonus_churn_liberado: boolean | null
          bonus_meta_liberado: boolean | null
          bonus_retencao_liberado: boolean | null
          calculado_em: string | null
          cancelamentos_mes: number | null
          churn_rate: number | null
          created_at: string | null
          fechado_em: string | null
          fechado_por: string | null
          id: string
          limite_cancelamentos: number | null
          limite_churn: number | null
          mes_referencia: string
          meta_atingida: boolean | null
          meta_vendas: number | null
          mrr_base_comissao: number | null
          mrr_mes: number | null
          percentual_bonus_churn: number | null
          percentual_bonus_meta: number | null
          percentual_bonus_retencao: number | null
          percentual_meta: number | null
          status: string | null
          total_colaboradores_participantes: number | null
          total_comissoes_vendedores: number | null
          updated_at: string | null
          valor_bonus_meta_individual: number | null
          valor_bonus_meta_total: number | null
          vendas_mes: number | null
        }
        Insert: {
          assinaturas_inicio_mes?: number | null
          bonus_churn_liberado?: boolean | null
          bonus_meta_liberado?: boolean | null
          bonus_retencao_liberado?: boolean | null
          calculado_em?: string | null
          cancelamentos_mes?: number | null
          churn_rate?: number | null
          created_at?: string | null
          fechado_em?: string | null
          fechado_por?: string | null
          id?: string
          limite_cancelamentos?: number | null
          limite_churn?: number | null
          mes_referencia: string
          meta_atingida?: boolean | null
          meta_vendas?: number | null
          mrr_base_comissao?: number | null
          mrr_mes?: number | null
          percentual_bonus_churn?: number | null
          percentual_bonus_meta?: number | null
          percentual_bonus_retencao?: number | null
          percentual_meta?: number | null
          status?: string | null
          total_colaboradores_participantes?: number | null
          total_comissoes_vendedores?: number | null
          updated_at?: string | null
          valor_bonus_meta_individual?: number | null
          valor_bonus_meta_total?: number | null
          vendas_mes?: number | null
        }
        Update: {
          assinaturas_inicio_mes?: number | null
          bonus_churn_liberado?: boolean | null
          bonus_meta_liberado?: boolean | null
          bonus_retencao_liberado?: boolean | null
          calculado_em?: string | null
          cancelamentos_mes?: number | null
          churn_rate?: number | null
          created_at?: string | null
          fechado_em?: string | null
          fechado_por?: string | null
          id?: string
          limite_cancelamentos?: number | null
          limite_churn?: number | null
          mes_referencia?: string
          meta_atingida?: boolean | null
          meta_vendas?: number | null
          mrr_base_comissao?: number | null
          mrr_mes?: number | null
          percentual_bonus_churn?: number | null
          percentual_bonus_meta?: number | null
          percentual_bonus_retencao?: number | null
          percentual_meta?: number | null
          status?: string | null
          total_colaboradores_participantes?: number | null
          total_comissoes_vendedores?: number | null
          updated_at?: string | null
          valor_bonus_meta_individual?: number | null
          valor_bonus_meta_total?: number | null
          vendas_mes?: number | null
        }
        Relationships: []
      }
      funcionalidades: {
        Row: {
          ativo: boolean | null
          codigo: string
          created_at: string
          descricao: string | null
          id: string
          modulo_id: string
          nome: string
        }
        Insert: {
          ativo?: boolean | null
          codigo: string
          created_at?: string
          descricao?: string | null
          id?: string
          modulo_id: string
          nome: string
        }
        Update: {
          ativo?: boolean | null
          codigo?: string
          created_at?: string
          descricao?: string | null
          id?: string
          modulo_id?: string
          nome?: string
        }
        Relationships: [
          {
            foreignKeyName: "funcionalidades_modulo_id_fkey"
            columns: ["modulo_id"]
            isOneToOne: false
            referencedRelation: "modulos"
            referencedColumns: ["id"]
          },
        ]
      }
      importacoes_assinaturas: {
        Row: {
          arquivo_nome: string
          created_at: string
          id: string
          observacao: string | null
          periodo_referencia: string
          plataforma: string
          registros_atualizados: number | null
          registros_novos: number | null
          status: string
          total_contratos_ativos: number | null
          total_mrr: number | null
          total_registros: number | null
        }
        Insert: {
          arquivo_nome: string
          created_at?: string
          id?: string
          observacao?: string | null
          periodo_referencia: string
          plataforma: string
          registros_atualizados?: number | null
          registros_novos?: number | null
          status?: string
          total_contratos_ativos?: number | null
          total_mrr?: number | null
          total_registros?: number | null
        }
        Update: {
          arquivo_nome?: string
          created_at?: string
          id?: string
          observacao?: string | null
          periodo_referencia?: string
          plataforma?: string
          registros_atualizados?: number | null
          registros_novos?: number | null
          status?: string
          total_contratos_ativos?: number | null
          total_mrr?: number | null
          total_registros?: number | null
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
      importacoes_extrato_eduzz: {
        Row: {
          arquivo_nome: string
          created_at: string
          id: string
          observacao: string | null
          periodo_fim: string
          periodo_inicio: string
          registros_duplicados: number | null
          registros_novos: number | null
          status: string
          total_registros: number | null
          total_vendas: number | null
        }
        Insert: {
          arquivo_nome: string
          created_at?: string
          id?: string
          observacao?: string | null
          periodo_fim: string
          periodo_inicio: string
          registros_duplicados?: number | null
          registros_novos?: number | null
          status?: string
          total_registros?: number | null
          total_vendas?: number | null
        }
        Update: {
          arquivo_nome?: string
          created_at?: string
          id?: string
          observacao?: string | null
          periodo_fim?: string
          periodo_inicio?: string
          registros_duplicados?: number | null
          registros_novos?: number | null
          status?: string
          total_registros?: number | null
          total_vendas?: number | null
        }
        Relationships: []
      }
      levantamento_operacional_2024: {
        Row: {
          atividades_top5: string
          colaborador_nome: string
          continue_action: string
          created_at: string
          ferramentas_uso: string
          id: string
          interdependencias: string
          ladrao_tempo: string
          reclamacao_cliente: string
          score_ambiente: number
          score_autonomia: number
          score_financeiro: number
          score_maestria: number
          score_proposito: number
          start_action: string
          stop_action: string
          talento_oculto: string | null
          visao_papel_10k: string
        }
        Insert: {
          atividades_top5: string
          colaborador_nome: string
          continue_action: string
          created_at?: string
          ferramentas_uso: string
          id?: string
          interdependencias: string
          ladrao_tempo: string
          reclamacao_cliente: string
          score_ambiente: number
          score_autonomia: number
          score_financeiro: number
          score_maestria: number
          score_proposito: number
          start_action: string
          stop_action: string
          talento_oculto?: string | null
          visao_papel_10k: string
        }
        Update: {
          atividades_top5?: string
          colaborador_nome?: string
          continue_action?: string
          created_at?: string
          ferramentas_uso?: string
          id?: string
          interdependencias?: string
          ladrao_tempo?: string
          reclamacao_cliente?: string
          score_ambiente?: number
          score_autonomia?: number
          score_financeiro?: number
          score_maestria?: number
          score_proposito?: number
          start_action?: string
          stop_action?: string
          talento_oculto?: string | null
          visao_papel_10k?: string
        }
        Relationships: []
      }
      meta_mensal: {
        Row: {
          assinaturas_inicio_mes: number | null
          bonus_meta_empresa: number
          bonus_meta_equipe: number
          colaboradores_bonus_meta: string[] | null
          comissao_venda_unica: number
          created_at: string
          id: string
          limite_cancelamentos: number | null
          limite_churn: number | null
          ltv_medio: number
          mes_referencia: string
          meta_mrr: number
          meta_quantidade: number
          multiplicador_anual: number
          num_colaboradores: number
          observacao: string | null
          percentual_bonus_churn: number | null
          percentual_bonus_retencao: number | null
          updated_at: string
        }
        Insert: {
          assinaturas_inicio_mes?: number | null
          bonus_meta_empresa?: number
          bonus_meta_equipe?: number
          colaboradores_bonus_meta?: string[] | null
          comissao_venda_unica?: number
          created_at?: string
          id?: string
          limite_cancelamentos?: number | null
          limite_churn?: number | null
          ltv_medio?: number
          mes_referencia: string
          meta_mrr?: number
          meta_quantidade?: number
          multiplicador_anual?: number
          num_colaboradores?: number
          observacao?: string | null
          percentual_bonus_churn?: number | null
          percentual_bonus_retencao?: number | null
          updated_at?: string
        }
        Update: {
          assinaturas_inicio_mes?: number | null
          bonus_meta_empresa?: number
          bonus_meta_equipe?: number
          colaboradores_bonus_meta?: string[] | null
          comissao_venda_unica?: number
          created_at?: string
          id?: string
          limite_cancelamentos?: number | null
          limite_churn?: number | null
          ltv_medio?: number
          mes_referencia?: string
          meta_mrr?: number
          meta_quantidade?: number
          multiplicador_anual?: number
          num_colaboradores?: number
          observacao?: string | null
          percentual_bonus_churn?: number | null
          percentual_bonus_retencao?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      metas_individuais: {
        Row: {
          atingida: boolean | null
          colaborador_id: string
          created_at: string | null
          descricao: string | null
          id: string
          mes_referencia: string
          percentual_atingido: number | null
          tipo_bonus: string
          titulo: string
          updated_at: string | null
          valor_atingido: string | null
          valor_bonus: number
          valor_meta: string
        }
        Insert: {
          atingida?: boolean | null
          colaborador_id: string
          created_at?: string | null
          descricao?: string | null
          id?: string
          mes_referencia: string
          percentual_atingido?: number | null
          tipo_bonus?: string
          titulo: string
          updated_at?: string | null
          valor_atingido?: string | null
          valor_bonus: number
          valor_meta: string
        }
        Update: {
          atingida?: boolean | null
          colaborador_id?: string
          created_at?: string | null
          descricao?: string | null
          id?: string
          mes_referencia?: string
          percentual_atingido?: number | null
          tipo_bonus?: string
          titulo?: string
          updated_at?: string | null
          valor_atingido?: string | null
          valor_bonus?: number
          valor_meta?: string
        }
        Relationships: [
          {
            foreignKeyName: "metas_individuais_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "colaboradores"
            referencedColumns: ["id"]
          },
        ]
      }
      modulos: {
        Row: {
          ativo: boolean | null
          created_at: string
          descricao: string | null
          icone: string | null
          id: string
          nome: string
          ordem: number | null
          rota: string
        }
        Insert: {
          ativo?: boolean | null
          created_at?: string
          descricao?: string | null
          icone?: string | null
          id?: string
          nome: string
          ordem?: number | null
          rota: string
        }
        Update: {
          ativo?: boolean | null
          created_at?: string
          descricao?: string | null
          icone?: string | null
          id?: string
          nome?: string
          ordem?: number | null
          rota?: string
        }
        Relationships: []
      }
      permissoes_usuario: {
        Row: {
          created_at: string
          funcionalidade_id: string
          id: string
          permitido: boolean | null
          user_id: string
        }
        Insert: {
          created_at?: string
          funcionalidade_id: string
          id?: string
          permitido?: boolean | null
          user_id: string
        }
        Update: {
          created_at?: string
          funcionalidade_id?: string
          id?: string
          permitido?: boolean | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "permissoes_usuario_funcionalidade_id_fkey"
            columns: ["funcionalidade_id"]
            isOneToOne: false
            referencedRelation: "funcionalidades"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          aprovado: boolean | null
          created_at: string
          departamento: string | null
          email: string
          id: string
          nome: string
          updated_at: string
          user_id: string
        }
        Insert: {
          aprovado?: boolean | null
          created_at?: string
          departamento?: string | null
          email: string
          id?: string
          nome: string
          updated_at?: string
          user_id: string
        }
        Update: {
          aprovado?: boolean | null
          created_at?: string
          departamento?: string | null
          email?: string
          id?: string
          nome?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      simulacoes_meta: {
        Row: {
          analise_ia: string | null
          churn_mensal: number | null
          clientes_ativos: number | null
          comissao_venda: number | null
          created_at: string
          custo_fixo_vendedor: number | null
          custo_por_lead: number | null
          custo_total: number | null
          data_meta: string | null
          descricao: string | null
          id: string
          leads_necessarios: number | null
          leads_vendedor_mes: number | null
          ltv_cac_ratio: number | null
          ltv_meses: number | null
          mrr_atual: number | null
          mrr_meta: number | null
          nome: string
          novas_vendas: number | null
          payback_meses: number | null
          receita_necessaria: number | null
          roi: number | null
          taxa_conversao: number | null
          ticket_medio: number | null
          updated_at: string
          user_id: string
          vendedores_atuais: number | null
          vendedores_necessarios: number | null
        }
        Insert: {
          analise_ia?: string | null
          churn_mensal?: number | null
          clientes_ativos?: number | null
          comissao_venda?: number | null
          created_at?: string
          custo_fixo_vendedor?: number | null
          custo_por_lead?: number | null
          custo_total?: number | null
          data_meta?: string | null
          descricao?: string | null
          id?: string
          leads_necessarios?: number | null
          leads_vendedor_mes?: number | null
          ltv_cac_ratio?: number | null
          ltv_meses?: number | null
          mrr_atual?: number | null
          mrr_meta?: number | null
          nome: string
          novas_vendas?: number | null
          payback_meses?: number | null
          receita_necessaria?: number | null
          roi?: number | null
          taxa_conversao?: number | null
          ticket_medio?: number | null
          updated_at?: string
          user_id: string
          vendedores_atuais?: number | null
          vendedores_necessarios?: number | null
        }
        Update: {
          analise_ia?: string | null
          churn_mensal?: number | null
          clientes_ativos?: number | null
          comissao_venda?: number | null
          created_at?: string
          custo_fixo_vendedor?: number | null
          custo_por_lead?: number | null
          custo_total?: number | null
          data_meta?: string | null
          descricao?: string | null
          id?: string
          leads_necessarios?: number | null
          leads_vendedor_mes?: number | null
          ltv_cac_ratio?: number | null
          ltv_meses?: number | null
          mrr_atual?: number | null
          mrr_meta?: number | null
          nome?: string
          novas_vendas?: number | null
          payback_meses?: number | null
          receita_necessaria?: number | null
          roi?: number | null
          taxa_conversao?: number | null
          ticket_medio?: number | null
          updated_at?: string
          user_id?: string
          vendedores_atuais?: number | null
          vendedores_necessarios?: number | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
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
      vendas_servicos: {
        Row: {
          aprovado_em: string | null
          aprovado_por: string | null
          cliente: string
          colaborador_id: string
          created_at: string | null
          data_venda: string
          descricao_servico: string
          id: string
          mes_referencia: string
          motivo_rejeicao: string | null
          observacoes: string | null
          plataforma: string | null
          status: string | null
          valor_servico: number
        }
        Insert: {
          aprovado_em?: string | null
          aprovado_por?: string | null
          cliente: string
          colaborador_id: string
          created_at?: string | null
          data_venda: string
          descricao_servico: string
          id?: string
          mes_referencia: string
          motivo_rejeicao?: string | null
          observacoes?: string | null
          plataforma?: string | null
          status?: string | null
          valor_servico: number
        }
        Update: {
          aprovado_em?: string | null
          aprovado_por?: string | null
          cliente?: string
          colaborador_id?: string
          created_at?: string | null
          data_venda?: string
          descricao_servico?: string
          id?: string
          mes_referencia?: string
          motivo_rejeicao?: string | null
          observacoes?: string | null
          plataforma?: string | null
          status?: string | null
          valor_servico?: number
        }
        Relationships: [
          {
            foreignKeyName: "vendas_servicos_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "colaboradores"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_permission: {
        Args: { _codigo: string; _user_id: string }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: { _user_id: string }; Returns: boolean }
      is_user_approved: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "user"
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
    Enums: {
      app_role: ["admin", "user"],
    },
  },
} as const
import { z } from "zod";
import { Clock, Zap, Star, TrendingUp } from "lucide-react";

export const STORAGE_KEY = "sismais-10k-form-data";

const minMsg = "Sua resposta é muito curta. Detalhe um pouco mais.";
const scoreSchema = z.coerce.number().min(1, "Obrigatório").max(5, "Obrigatório");
const satisfacaoSchema = z.coerce.number().min(0, "Obrigatório").max(10, "Obrigatório");

export const formSchema = z.object({
  colaborador_nome: z.string().min(2, "Nome é obrigatório"),
  funcao_atual: z.string().min(2, "Função é obrigatória"),
  satisfacao_trabalho: satisfacaoSchema,
  motivo_satisfacao_baixa: z.string().optional(),
  talento_oculto: z.string().max(255).optional(),
  
  rotina_diaria: z.string().min(10, minMsg),
  expectativa_empresa: z.string().min(10, minMsg),
  definicao_sucesso: z.string().min(10, minMsg),
  sentimento_valorizacao: z.string().min(10, minMsg),

  atividades_top5: z.string().min(10, minMsg),
  ladrao_tempo: z.string().min(10, minMsg),
  ferramentas_uso: z.string().min(5, "Informe as ferramentas que você utiliza"),
  interdependencias: z.string().min(10, minMsg),
  start_action: z.string().min(5, "Conte o que deveríamos começar"),
  stop_action: z.string().min(5, "Conte o que deveríamos parar"),
  continue_action: z.string().min(5, "Conte o que deveríamos manter"),
  reclamacao_cliente: z.string().min(5, "Conte a maior reclamação"),
  prioridades_setor: z.string().min(10, minMsg),

  visao_papel_10k: z.string().min(10, minMsg),
  falta_plano_2026: z.string().min(5, "Dê sua sugestão para o plano"),
  falta_metas_2025: z.string().min(5, "Dê sua opinião sobre as metas"),
  score_autonomia: scoreSchema,
  score_maestria: scoreSchema,
  score_proposito: scoreSchema,
  score_financeiro: scoreSchema,
  score_ambiente: scoreSchema,
  
  interesse_lideranca: z.enum(["sim", "nao"], { required_error: "Obrigatório" }),
  motivo_lideranca: z.string().min(10, minMsg).optional(),
  papel_bom_lider: z.string().min(10, minMsg).optional(),
  
  maior_sonho: z.string().min(10, minMsg),
  fotos_sonhos: z.array(z.string()).optional().default([]),
}).refine((data) => {
  if (data.satisfacao_trabalho < 8 && (!data.motivo_satisfacao_baixa || data.motivo_satisfacao_baixa.length < 10)) {
    return false;
  }
  return true;
}, {
  message: "Por favor, conte o que falta para chegar a 10.",
  path: ["motivo_satisfacao_baixa"],
});

export type FormData = z.infer<typeof formSchema>;

export const TABS = [
  { id: "rotina", label: "Rotina & Foco", icon: Clock, fields: ["rotina_diaria", "expectativa_empresa", "definicao_sucesso", "sentimento_valorizacao"] },
  { id: "gargalos", label: "Gargalos & Ação", icon: Zap, fields: ["atividades_top5", "ladrao_tempo", "ferramentas_uso", "interdependencias", "start_action", "stop_action", "continue_action", "reclamacao_cliente", "prioridades_setor"] },
  { id: "cultura", label: "Visão & Estratégia", icon: Star, fields: ["visao_papel_10k", "falta_plano_2026", "falta_metas_2025", "score_autonomia", "score_maestria", "score_proposito", "score_financeiro", "score_ambiente"] },
  { id: "lideranca", label: "Liderança & Finalização", icon: TrendingUp, fields: ["interesse_lideranca", "motivo_lideranca", "papel_bom_lider", "colaborador_nome", "funcao_atual", "satisfacao_trabalho", "motivo_satisfacao_baixa", "talento_oculto", "maior_sonho", "fotos_sonhos"] },
];
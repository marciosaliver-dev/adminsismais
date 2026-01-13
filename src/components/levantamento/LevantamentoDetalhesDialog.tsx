"use client";

import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  Brain, 
  Loader2, 
  Clock, 
  Target, 
  Zap, 
  Star, 
  MessageSquare, 
  Rocket, 
  TrendingUp,
  X
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import type { Tables } from "@/integrations/supabase/types";

type LevantamentoRow = Tables<"levantamento_operacional_2024">;

interface LevantamentoDetalhesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  resposta: LevantamentoRow | null;
}

export function LevantamentoDetalhesDialog({
  open,
  onOpenChange,
  resposta,
}: LevantamentoDetalhesDialogProps) {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<string | null>(null);

  if (!resposta) return null;

  const handleAnalyze = async () => {
    setIsAnalyzing(true);
    try {
      const { data, error } = await supabase.functions.invoke("analisar-levantamento", {
        body: resposta,
      });

      if (error) throw error;
      setAnalysis(data.analysis);
      toast({ title: "Análise concluída", description: "Insights gerados com sucesso." });
    } catch (err) {
      console.error(err);
      toast({ 
        title: "Erro na análise", 
        description: "Não foi possível gerar a análise por IA.", 
        variant: "destructive" 
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const SectionHeader = ({ icon: Icon, title, color }: { icon: any; title: string; color: string }) => (
    <div className="flex items-center gap-2 mb-3 mt-6">
      <div className={cn("p-1.5 rounded-lg", color)}>
        <Icon className="w-4 h-4 text-white" />
      </div>
      <h3 className="font-bold text-lg">{title}</h3>
    </div>
  );

  const InfoField = ({ label, value }: { label: string; value: any }) => (
    <div className="space-y-1 mb-4">
      <p className="text-xs font-semibold text-muted-foreground uppercase">{label}</p>
      <p className="text-sm leading-relaxed">{value || <span className="text-muted-foreground italic">Sem resposta</span>}</p>
    </div>
  );

  function cn(...inputs: any[]) {
    return inputs.filter(Boolean).join(" ");
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col p-0 overflow-hidden">
        <DialogHeader className="p-6 pb-2 border-b">
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-2xl font-bold">{resposta.colaborador_nome}</DialogTitle>
              <p className="text-muted-foreground">{resposta.funcao_atual} • Satisfação: {resposta.satisfacao_trabalho}/10</p>
            </div>
            <Button 
              onClick={handleAnalyze} 
              disabled={isAnalyzing}
              className="bg-primary/10 text-primary hover:bg-primary/20 border-primary/20 border"
            >
              {isAnalyzing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Brain className="w-4 h-4 mr-2" />}
              Analisar com IA
            </Button>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
          {/* Main Content */}
          <ScrollArea className="flex-1 p-6">
            <div className="space-y-2">
              <SectionHeader icon={Clock} title="Rotina & Foco" color="bg-blue-500" />
              <InfoField label="Rotina Diária" value={resposta.rotina_diaria} />
              <InfoField label="Expectativa da Empresa" value={resposta.expectativa_empresa} />
              <InfoField label="Definição de Sucesso" value={resposta.definicao_sucesso} />
              <InfoField label="Sentimento de Valorização" value={resposta.sentimento_valorizacao} />

              <SectionHeader icon={Zap} title="Gargalos & Ação" color="bg-amber-500" />
              <InfoField label="Top 5 Atividades" value={resposta.atividades_top5} />
              <InfoField label="Ladrão de Tempo" value={resposta.ladrao_tempo} />
              <InfoField label="Ferramentas" value={resposta.ferramentas_uso} />
              <InfoField label="Interdependências" value={resposta.interdependencias} />
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-3 bg-muted/30 rounded-lg">
                <InfoField label="START" value={resposta.start_action} />
                <InfoField label="STOP" value={resposta.stop_action} />
                <InfoField label="CONTINUE" value={resposta.continue_action} />
              </div>

              <SectionHeader icon={Star} title="Visão & Estratégia" color="bg-purple-500" />
              <InfoField label="Papel na Sismais 10K" value={resposta.visao_papel_10k} />
              <InfoField label="Sugestão para Plano 2026" value={resposta.falta_plano_2026} />
              <InfoField label="Feedback Metas 2025" value={resposta.falta_metas_2025} />

              <SectionHeader icon={TrendingUp} title="Liderança & Sonhos" color="bg-emerald-500" />
              <div className="flex gap-2 mb-4">
                <Badge variant={resposta.interesse_lideranca ? "default" : "secondary"}>
                  Interesse em Liderança: {resposta.interesse_lideranca ? "Sim" : "Não"}
                </Badge>
              </div>
              <InfoField label="Motivo Liderança" value={resposta.motivo_lideranca} />
              <InfoField label="Visão de Bom Líder" value={resposta.papel_bom_lider} />
              <div className="p-4 bg-primary/5 border border-primary/20 rounded-xl mt-4">
                <InfoField label="MAIOR SONHO" value={resposta.maior_sonho} />
              </div>
            </div>
          </ScrollArea>

          {/* AI Analysis Sidebar */}
          {analysis && (
            <div className="w-full md:w-80 bg-muted/30 border-l border-border p-6 overflow-y-auto">
              <div className="flex items-center gap-2 mb-4">
                <Brain className="w-5 h-5 text-primary" />
                <h4 className="font-bold">Insights da IA</h4>
              </div>
              <div className="prose prose-sm dark:prose-invert">
                {analysis.split('\n').map((line, i) => (
                  <p key={i} className="mb-2 leading-tight text-sm">{line}</p>
                ))}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
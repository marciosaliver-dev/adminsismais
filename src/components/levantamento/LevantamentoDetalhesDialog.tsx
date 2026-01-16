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
import { 
  Brain, 
  Loader2, 
  Clock, 
  Zap, 
  Star, 
  TrendingUp,
  FileText,
  Download
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import type { Tables } from "@/integrations/supabase/types";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

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

  const exportPDF = () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    
    // Header
    doc.setFillColor(16, 41, 63); // Sismais Dark
    doc.rect(0, 0, pageWidth, 40, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    doc.text("MAPEAMENTO OPERACIONAL - SISMAIS 10K", 14, 20);
    
    doc.setFontSize(12);
    doc.setFont("helvetica", "normal");
    doc.text(`Colaborador: ${resposta.colaborador_nome}`, 14, 30);
    doc.text(`Gerado em: ${new Date().toLocaleDateString('pt-BR')}`, pageWidth - 14, 30, { align: 'right' });

    let yPos = 50;

    const addSection = (title: string, content: Array<[string, string]>) => {
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(69, 229, 229); // Sismais Turquoise
      doc.text(title, 14, yPos);
      yPos += 8;

      autoTable(doc, {
        startY: yPos,
        head: [],
        body: content,
        theme: 'plain',
        styles: { fontSize: 10, cellPadding: 2 },
        columnStyles: {
          0: { fontStyle: 'bold', cellWidth: 60 },
          1: { cellWidth: 120 }
        },
        margin: { left: 14 },
      });

      yPos = (doc as any).lastAutoTable.finalY + 10;
      
      // Check for page break
      if (yPos > 250) {
        doc.addPage();
        yPos = 20;
      }
    };

    // 1. Info Geral
    addSection("INFORMAÇÕES GERAIS", [
      ["Função Atual:", resposta.funcao_atual || "-"],
      ["Satisfação (0-10):", `${resposta.satisfacao_trabalho}/10`],
      ["Motivo Nota:", resposta.motivo_satisfacao_baixa || "-"],
      ["Talento Oculto:", resposta.talento_oculto || "-"]
    ]);

    // 2. Rotina
    addSection("ROTINA & FOCO", [
      ["Dia a Dia:", resposta.rotina_diaria || "-"],
      ["Expectativa Empresa:", resposta.expectativa_empresa || "-"],
      ["Definição Sucesso:", resposta.definicao_sucesso || "-"],
      ["Sentimento Valorização:", resposta.sentimento_valorizacao || "-"]
    ]);

    // 3. Gargalos
    addSection("GARGALOS & AÇÃO", [
      ["Top 5 Atividades:", resposta.atividades_top5 || "-"],
      ["Ladrão de Tempo:", resposta.ladrao_tempo || "-"],
      ["Ferramentas:", resposta.ferramentas_uso || "-"],
      ["START:", resposta.start_action || "-"],
      ["STOP:", resposta.stop_action || "-"],
      ["CONTINUE:", resposta.continue_action || "-"]
    ]);

    // 4. Estratégia
    addSection("VISÃO & ESTRATÉGIA", [
      ["Papel na Sismais 10K:", resposta.visao_papel_10k || "-"],
      ["Sugestão Plano 2026:", resposta.falta_plano_2026 || "-"],
      ["Feedback Metas 2025:", resposta.falta_metas_2025 || "-"]
    ]);

    // 5. Scores (Matriz)
    addSection("SCORES DE ENGAJAMENTO (1-5)", [
      ["Autonomia:", `${resposta.score_autonomia}`],
      ["Maestria:", `${resposta.score_maestria}`],
      ["Propósito:", `${resposta.score_proposito}`],
      ["Financeiro:", `${resposta.score_financeiro}`],
      ["Ambiente:", `${resposta.score_ambiente}`]
    ]);

    // 6. Liderança e Sonhos
    addSection("LIDERANÇA & SONHOS", [
      ["Interesse Liderança:", resposta.interesse_lideranca ? "Sim" : "Não"],
      ["Motivo/Visão:", resposta.motivo_lideranca || "-"],
      ["Papel do Líder:", resposta.papel_bom_lider || "-"],
      ["MAIOR SONHO:", resposta.maior_sonho || "-"]
    ]);

    doc.save(`Mapeamento_${resposta.colaborador_nome.replace(/\s+/g, '_')}.pdf`);
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
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <DialogTitle className="text-2xl font-bold">{resposta.colaborador_nome}</DialogTitle>
              <p className="text-muted-foreground">{resposta.funcao_atual} • Satisfação: {resposta.satisfacao_trabalho}/10</p>
            </div>
            <div className="flex gap-2 w-full sm:w-auto">
              <Button 
                variant="outline"
                onClick={exportPDF}
                className="gap-2"
              >
                <Download className="w-4 h-4" />
                Exportar PDF
              </Button>
              <Button 
                onClick={handleAnalyze} 
                disabled={isAnalyzing}
                className="bg-primary/10 text-primary hover:bg-primary/20 border-primary/20 border"
              >
                {isAnalyzing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Brain className="w-4 h-4 mr-2" />}
                Analisar com IA
              </Button>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
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
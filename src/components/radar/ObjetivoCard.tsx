import { useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronUp, Star } from "lucide-react";
import { ProgressBar } from "./ProgressBar";
import { cn } from "@/lib/utils";
import type { Tables } from "@/integrations/supabase/types";

type Objetivo = Tables<"objetivos_okr">;
type KeyResult = Tables<"key_results">;
type KRStats = Tables<"calculos_kr_cache">;

interface ObjetivoCardProps {
  objetivo: Objetivo & { responsavel?: { nome: string; avatar_url: string | null } };
  keyResults: KeyResult[];
  stats: KRStats[];
  initialExpanded?: boolean;
}

const areaColors: Record<string, string> = {
  Comercial: "bg-blue-100 text-blue-700 border-blue-200",
  Produto: "bg-purple-100 text-purple-700 border-purple-200",
  Suporte: "bg-orange-100 text-orange-700 border-orange-200",
  Financeiro: "bg-emerald-100 text-emerald-700 border-emerald-200",
  Geral: "bg-slate-100 text-slate-700 border-slate-200",
};

export function ObjetivoCard({ objetivo, keyResults, stats, initialExpanded = false }: ObjetivoCardProps) {
  const [expanded, setExpanded] = useState(initialExpanded);

  // Calcula progresso médio do objetivo baseado nos stats dos seus KRs
  const krsDoObjetivo = keyResults.filter(kr => kr.objetivo_id === objetivo.id);
  const statsDoObjetivo = stats.filter(s => krsDoObjetivo.some(kr => kr.id === s.kr_id));
  
  const progressoMedio = statsDoObjetivo.length > 0
    ? statsDoObjetivo.reduce((acc, s) => acc + (s.progresso_percentual || 0), 0) / statsDoObjetivo.length
    : 0;

  // Determina status geral (se houver algum crítico, o objetivo está em risco)
  const statusGeral = statsDoObjetivo.some(s => s.status === "Crítico") ? "Crítico" : (
    progressoMedio >= 100 ? "Atingido" :
    progressoMedio >= 70 ? "Em dia" :
    progressoMedio >= 40 ? "Alerta" : "Crítico"
  );

  return (
    <Card className="overflow-hidden border-l-4" style={{ borderLeftColor: statusGeral === 'Crítico' ? '#ef4444' : statusGeral === 'Alerta' ? '#f59e0b' : statusGeral === 'Atingido' ? '#22c55e' : '#3b82f6' }}>
      <CardHeader className="p-4 sm:p-6 pb-2">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline" className={cn("font-bold uppercase tracking-wider text-[10px]", areaColors[objetivo.area] || areaColors.Geral)}>
                {objetivo.area}
              </Badge>
              <div className="flex items-center gap-0.5 text-amber-500">
                {Array.from({ length: objetivo.peso || 1 }).map((_, i) => (
                  <Star key={i} className="w-3 h-3 fill-current" />
                ))}
              </div>
            </div>
            <h4 className="text-lg font-bold leading-tight text-secondary">
              {objetivo.titulo}
            </h4>
          </div>

          <div className="flex items-center gap-3">
            <Avatar className="w-8 h-8 border">
              <AvatarImage src={objetivo.responsavel?.avatar_url || ""} />
              <AvatarFallback className="bg-primary/10 text-primary text-[10px] font-bold">
                {objetivo.responsavel?.nome?.substring(0, 2).toUpperCase() || "OK"}
              </AvatarFallback>
            </Avatar>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-full"
              onClick={() => setExpanded(!expanded)}
            >
              {expanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
            </Button>
          </div>
        </div>

        <div className="pt-2">
          <ProgressBar progresso={progressoMedio} status={statusGeral} height="md" />
        </div>
      </CardHeader>

      {expanded && (
        <CardContent className="p-4 sm:p-6 pt-0 bg-muted/20 border-t mt-4">
          <div className="space-y-4 pt-4">
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Key Results</p>
            {krsDoObjetivo.length === 0 ? (
              <p className="text-sm text-muted-foreground italic">Nenhum KR cadastrado.</p>
            ) : (
              <div className="grid gap-3">
                {krsDoObjetivo.map((kr) => {
                  const krStat = stats.find(s => s.kr_id === kr.id);
                  return (
                    <div key={kr.id} className="p-3 rounded-lg bg-card border shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold truncate">{kr.titulo}</p>
                        <p className="text-[10px] text-muted-foreground uppercase mt-0.5">
                          Meta: {kr.meta} {kr.unidade}
                        </p>
                      </div>
                      <div className="w-full sm:w-48 shrink-0">
                        <ProgressBar 
                          progresso={krStat?.progresso_percentual || 0} 
                          status={krStat?.status || "Crítico"} 
                          showLabel 
                          height="sm" 
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </CardContent>
      )}
    </Card>
  );
}
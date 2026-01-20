import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3 } from "lucide-react";
import { useRadar } from "@/contexts/RadarContext";
import { Loader2 } from "lucide-react";

export default function DashboardOKR() {
  const { cicloAtivo, loading } = useRadar();

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <BarChart3 className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-3xl font-bold">Dashboard OKR</h1>
          <p className="text-muted-foreground">Visão geral do ciclo ativo.</p>
        </div>
      </div>
      
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>
              {cicloAtivo ? `Ciclo Ativo: ${cicloAtivo.nome}` : "Nenhum Ciclo Ativo Selecionado"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p>Conteúdo do Dashboard OKR.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Zap } from "lucide-react";

export default function RadarLancamentos() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Zap className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-3xl font-bold">Lançar Dados</h1>
          <p className="text-muted-foreground">Registro de progresso dos Key Results.</p>
        </div>
      </div>
      <Card><CardHeader><CardTitle>Em Desenvolvimento</CardTitle></CardHeader><CardContent><p>Conteúdo da página de Lançamentos.</p></CardContent></Card>
    </div>
  );
}
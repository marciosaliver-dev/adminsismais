import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Target } from "lucide-react";

export default function RadarIndividual() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Target className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-3xl font-bold">Meu Radar</h1>
          <p className="text-muted-foreground">Acompanhe seus objetivos e KRs.</p>
        </div>
      </div>
      <Card><CardHeader><CardTitle>Em Desenvolvimento</CardTitle></CardHeader><CardContent><p>Conteúdo do Radar Individual.</p></CardContent></Card>
    </div>
  );
}
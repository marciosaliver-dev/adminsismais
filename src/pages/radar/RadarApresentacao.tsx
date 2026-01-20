import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Briefcase } from "lucide-react";

export default function RadarApresentacao() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Briefcase className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-3xl font-bold">Modo Apresentação</h1>
          <p className="text-muted-foreground">Visualização otimizada para reuniões.</p>
        </div>
      </div>
      <Card><CardHeader><CardTitle>Em Desenvolvimento</CardTitle></CardHeader><CardContent><p>Conteúdo do Modo Apresentação.</p></CardContent></Card>
    </div>
  );
}
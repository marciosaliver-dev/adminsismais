import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Settings } from "lucide-react";

export default function RadarGestao() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Settings className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-3xl font-bold">Gestão de OKRs</h1>
          <p className="text-muted-foreground">Criação e edição de ciclos, objetivos e KRs.</p>
        </div>
      </div>
      <Card><CardHeader><CardTitle>Em Desenvolvimento</CardTitle></CardHeader><CardContent><p>Conteúdo da Gestão de OKRs.</p></CardContent></Card>
    </div>
  );
}
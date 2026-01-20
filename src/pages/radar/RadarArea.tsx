import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LayoutGrid } from "lucide-react";

export default function RadarArea() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <LayoutGrid className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-3xl font-bold">Radar Por Área</h1>
          <p className="text-muted-foreground">Visão dos objetivos por departamento.</p>
        </div>
      </div>
      <Card><CardHeader><CardTitle>Em Desenvolvimento</CardTitle></CardHeader><CardContent><p>Conteúdo do Radar Por Área.</p></CardContent></Card>
    </div>
  );
}
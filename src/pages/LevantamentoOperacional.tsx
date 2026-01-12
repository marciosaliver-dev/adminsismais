import { LevantamentoForm } from "@/components/levantamento/LevantamentoForm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3 } from "lucide-react";

export default function LevantamentoOperacional() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <BarChart3 className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-3xl font-bold">Mapeamento Operacional</h1>
          <p className="text-muted-foreground">
            Sua contribuição para o plano Sismais 10K.
          </p>
        </div>
      </div>
      
      <LevantamentoForm />
    </div>
  );
}
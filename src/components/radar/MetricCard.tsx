import { Card, CardContent } from "@/components/ui/card";
import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface MetricCardProps {
  titulo: string;
  valor: string | number;
  icone: ReactNode;
  cor: "blue" | "green" | "yellow" | "red";
  subtexto?: string;
}

const colorVariants = {
  blue: "text-blue-600 bg-blue-50 border-blue-100",
  green: "text-emerald-600 bg-emerald-50 border-emerald-100",
  yellow: "text-amber-600 bg-amber-50 border-amber-100",
  red: "text-red-600 bg-red-50 border-red-100",
};

const iconVariants = {
  blue: "bg-blue-100 text-blue-600",
  green: "bg-emerald-100 text-emerald-600",
  yellow: "bg-amber-100 text-amber-600",
  red: "bg-red-100 text-red-600",
};

export function MetricCard({ titulo, valor, icone, cor, subtexto }: MetricCardProps) {
  return (
    <Card className={cn("border shadow-sm", colorVariants[cor])}>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-sm font-medium opacity-80">{titulo}</p>
            <h3 className="text-3xl font-bold tracking-tight">{valor}</h3>
            {subtexto && <p className="text-xs opacity-70">{subtexto}</p>}
          </div>
          <div className={cn("p-3 rounded-xl", iconVariants[cor])}>
            {icone}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
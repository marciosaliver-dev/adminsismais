import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";

interface ProgressBarProps {
  progresso: number;
  status?: string;
  showLabel?: boolean;
  height?: "sm" | "md" | "lg";
  className?: string;
}

const statusColors: Record<string, string> = {
  "Atingido": "bg-emerald-500",
  "Em dia": "bg-blue-500",
  "Alerta": "bg-amber-500",
  "Crítico": "bg-red-500",
};

const heights = {
  sm: "h-1.5",
  md: "h-2.5",
  lg: "h-4",
};

export function ProgressBar({ progresso, status, showLabel, height = "md", className }: ProgressBarProps) {
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const timer = setTimeout(() => {
      setWidth(Math.min(100, Math.max(0, progresso)));
    }, 100);
    return () => clearTimeout(timer);
  }, [progresso]);

  // Se o status não for passado, define com base no valor
  const activeStatus = status || (
    progresso >= 100 ? "Atingido" :
    progresso >= 70 ? "Em dia" :
    progresso >= 40 ? "Alerta" : "Crítico"
  );

  const colorClass = statusColors[activeStatus] || "bg-primary";

  return (
    <div className={cn("w-full space-y-1.5", className)}>
      <div className="flex justify-between items-center text-xs font-medium">
        {showLabel && <span className="text-muted-foreground">{activeStatus}</span>}
        {showLabel && <span className="text-foreground">{progresso.toFixed(1)}%</span>}
      </div>
      <div className={cn("w-full bg-muted rounded-full overflow-hidden", heights[height])}>
        <div
          className={cn("h-full transition-all duration-1000 ease-out rounded-full", colorClass)}
          style={{ width: `${width}%` }}
        />
      </div>
    </div>
  );
}
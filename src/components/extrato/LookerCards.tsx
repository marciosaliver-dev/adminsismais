import { Card, CardContent } from "@/components/ui/card";
import { formatCurrency, formatNumber } from "@/lib/extratoUtils";
import { Hash, DollarSign } from "lucide-react";

interface LookerCardsProps {
  recordCount: number;
  totalValue: number;
}

export function LookerCards({ recordCount, totalValue }: LookerCardsProps) {
  return (
    <div className="flex flex-col gap-4">
      {/* Record Count Card */}
      <Card className="bg-primary/10 border-primary/20 shadow-sm">
        <CardContent className="p-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-primary/20">
              <Hash className="w-5 h-5 text-primary" />
            </div>
            <span className="text-sm font-medium text-muted-foreground">
              Record Count
            </span>
          </div>
          <p className="text-3xl font-bold text-foreground tabular-nums">
            {formatNumber(recordCount)}
          </p>
        </CardContent>
      </Card>

      {/* Total Value Card */}
      <Card className="bg-primary/10 border-primary/20 shadow-sm">
        <CardContent className="p-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-primary/20">
              <DollarSign className="w-5 h-5 text-primary" />
            </div>
            <span className="text-sm font-medium text-muted-foreground">
              Valor
            </span>
          </div>
          <p className={`text-2xl font-bold tabular-nums ${
            totalValue >= 0 ? "text-emerald-600" : "text-red-500"
          }`}>
            {totalValue < 0 ? "-" : ""}{formatCurrency(Math.abs(totalValue))}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

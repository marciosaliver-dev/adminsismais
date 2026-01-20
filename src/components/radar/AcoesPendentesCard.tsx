import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertCircle, Clock, Zap, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";

interface AcaoPendente {
  id: string;
  krId: string;
  titulo: string;
  mensagem: string;
  tipo: 'atraso' | 'critico' | 'desvio';
  ritmo?: string;
}

interface Props {
  acoes: AcaoPendente[];
  onAction: (krId: string) => void;
}

export function AcoesPendentesCard({ acoes, onAction }: Props) {
  if (acoes.length === 0) return null;

  return (
    <Card className="border-2 border-amber-200 bg-amber-50/30 dark:bg-amber-950/10 dark:border-amber-900">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Zap className="w-5 h-5 text-amber-500 fill-amber-500" />
          Ações Pendentes
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {acoes.map((acao) => (
          <div 
            key={acao.id} 
            className={cn(
              "p-4 rounded-xl border-l-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all hover:translate-x-1",
              acao.tipo === 'atraso' ? "bg-amber-100/50 border-amber-500 text-amber-900 dark:bg-amber-900/20" : "bg-red-100/50 border-red-500 text-red-900 dark:bg-red-900/20"
            )}
          >
            <div className="space-y-1">
              <p className="font-bold flex items-center gap-2">
                {acao.tipo === 'atraso' ? <Clock className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                {acao.titulo}
              </p>
              <p className="text-sm opacity-80">{acao.mensagem}</p>
              {acao.ritmo && (
                <p className="text-xs font-medium opacity-60">Ritmo necessário: {acao.ritmo}</p>
              )}
            </div>
            <Button 
              size="sm" 
              onClick={() => onAction(acao.krId)}
              className={cn(
                "shadow-sm",
                acao.tipo === 'atraso' ? "bg-amber-600 hover:bg-amber-700 text-white" : "bg-red-600 hover:bg-red-700 text-white"
              )}
            >
              {acao.tipo === 'atraso' ? 'Lançar Agora' : 'Ver Detalhes'}
              <ExternalLink className="w-3.5 h-3.5 ml-2" />
            </Button>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { History, MessageSquare } from "lucide-react";
import { cn } from "@/lib/utils";

interface Lancamento {
  id: string;
  data: string;
  valor: number;
  observacao: string | null;
  kr: {
    titulo: string;
    unidade: string;
    meta: number;
  };
}

interface Props {
  lancamentos: Lancamento[];
}

export function TimelineRecente({ lancamentos }: Props) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <History className="w-5 h-5 text-primary" />
          Meu Histórico Recente
        </CardTitle>
      </CardHeader>
      <CardContent>
        {lancamentos.length === 0 ? (
          <p className="text-center py-8 text-muted-foreground italic">Nenhum lançamento recente encontrado.</p>
        ) : (
          <div className="space-y-6 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-muted-foreground/20 before:to-transparent">
            {lancamentos.map((l) => (
              <div key={l.id} className="relative flex items-start gap-6 group">
                <div className="absolute left-5 -translate-x-1/2 mt-1.5 w-3 h-3 rounded-full bg-primary ring-4 ring-background transition-transform group-hover:scale-125"></div>
                <div className="flex-1 pl-10">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <p className="text-sm font-bold">
                      {format(parseISO(l.data), "dd/MM", { locale: ptBR })} — {l.kr.titulo}
                    </p>
                    <BadgePill valor={`${l.valor} ${l.kr.unidade}`} meta={l.kr.meta} />
                  </div>
                  {l.observacao && (
                    <div className="mt-2 p-2 rounded-lg bg-muted/30 border border-dashed flex gap-2 items-start">
                      <MessageSquare className="w-3 h-3 text-muted-foreground mt-1 shrink-0" />
                      <p className="text-xs italic text-muted-foreground">{l.observacao}</p>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function BadgePill({ valor, meta }: { valor: string, meta: number }) {
  return (
    <div className="inline-flex items-center gap-2 px-2 py-0.5 rounded-full bg-muted text-[10px] font-bold uppercase tracking-tighter">
      <span>VALOR: {valor}</span>
      <span className="w-1 h-1 rounded-full bg-muted-foreground/30"></span>
      <span className="opacity-60">META: {meta}</span>
    </div>
  );
}
"use client";

import { useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge"; // Importação adicionada
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";
import { Loader2, Info } from "lucide-react";
import { useRadar } from "@/contexts/RadarContext.tsx";
import type { Tables, TablesInsert } from "@/integrations/supabase/types";

const schema = z.object({
  objetivo_id: z.string().uuid("Selecione um objetivo"),
  titulo: z.string().min(5, "O título deve ter pelo menos 5 caracteres"),
  meta: z.coerce.number().min(0.01, "A meta deve ser maior que zero"),
  unidade: z.string().min(1, "Informe a unidade (ex: %, R$, unidades)"),
  tipo_meta: z.enum(["Crescer", "Reduzir", "Manter"]),
  frequencia: z.enum(["Diário", "Semanal", "Mensal"]),
  responsavel_id: z.string().uuid("Selecione um responsável"),
  baseline: z.coerce.number().default(0),
  grupo_historico: z.string().max(100).optional().nullable(),
}).refine((data) => {
  if (data.tipo_meta === "Reduzir") return data.baseline > data.meta;
  return true;
}, {
  message: "Para metas de redução, o baseline deve ser maior que a meta final",
  path: ["baseline"],
});

type FormData = z.infer<typeof schema>;

interface Props {
  isOpen: boolean;
  onClose: () => void;
  objetivos: Tables<"objetivos_okr">[];
  editingKR?: Tables<"key_results"> | null;
}

export function KRModal({ isOpen, onClose, objetivos, editingKR }: Props) {
  const { membros } = useRadar();
  const queryClient = useQueryClient();
  
  const { register, handleSubmit, control, formState: { errors }, reset, setValue } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      tipo_meta: "Crescer",
      frequencia: "Semanal",
      baseline: 0
    }
  });

  useEffect(() => {
    if (editingKR) {
      reset({
        objetivo_id: editingKR.objetivo_id,
        titulo: editingKR.titulo,
        meta: editingKR.meta,
        unidade: editingKR.unidade,
        tipo_meta: editingKR.tipo_meta as any,
        frequencia: editingKR.frequencia as any,
        responsavel_id: editingKR.responsavel_id,
        baseline: editingKR.baseline || 0,
        grupo_historico: editingKR.grupo_historico,
      });
    } else {
      reset({
        tipo_meta: "Crescer",
        frequencia: "Semanal",
        baseline: 0,
        meta: 0,
        titulo: "",
        unidade: "%"
      });
      if (objetivos.length > 0) setValue("objetivo_id", objetivos[0].id);
    }
  }, [editingKR, objetivos, reset, isOpen, setValue]);

  const mutation = useMutation({
    mutationFn: async (data: FormData) => {
      const payload: TablesInsert<"key_results"> = {
        objetivo_id: data.objetivo_id,
        titulo: data.titulo,
        meta: data.meta,
        unidade: data.unidade,
        tipo_meta: data.tipo_meta,
        frequencia: data.frequencia,
        responsavel_id: data.responsavel_id,
        baseline: data.baseline,
        grupo_historico: data.grupo_historico || null,
      };

      let result;
      if (editingKR) {
        result = await supabase
          .from("key_results")
          .update(payload)
          .eq("id", editingKR.id)
          .select()
          .single();
      } else {
        result = await supabase
          .from("key_results")
          .insert(payload)
          .select()
          .single();
      }

      if (result.error) throw result.error;

      // Recalcular cache após salvar
      await supabase.rpc('recalcular_cache_kr', { kr_uuid: result.data.id });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["gestao_krs"] });
      toast({ title: "Sucesso", description: `Key Result salvo com sucesso!` });
      onClose();
    },
    onError: (err: any) => {
      toast({ variant: "destructive", title: "Erro", description: err.message });
    }
  });

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[650px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editingKR ? "Editar Key Result" : "Novo Key Result (KR)"}</DialogTitle>
          <DialogDescription>Defina métricas claras e mensuráveis para acompanhar o sucesso.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="space-y-5 py-4">
          <div className="space-y-2">
            <Label>Objetivo Estratégico</Label>
            <Controller
              name="objetivo_id"
              control={control}
              render={({ field }) => (
                <Select onValueChange={field.onChange} value={field.value}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o objetivo pai" />
                  </SelectTrigger>
                  <SelectContent>
                    {objetivos.map(obj => (
                      <SelectItem key={obj.id} value={obj.id}>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-[10px] py-0">{obj.area}</Badge>
                          <span className="truncate max-w-[300px]">{obj.titulo}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="kr-titulo">Título do KR *</Label>
            <Input id="kr-titulo" {...register("titulo")} placeholder="Ex: Alcançar faturamento de R$ 100k" />
            {errors.titulo && <p className="text-xs text-destructive">{errors.titulo.message}</p>}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="baseline">Baseline (Início)</Label>
              <Input id="baseline" type="number" step="any" {...register("baseline")} />
              {errors.baseline && <p className="text-xs text-destructive">{errors.baseline.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="meta">Meta Final *</Label>
              <Input id="meta" type="number" step="any" {...register("meta")} />
              {errors.meta && <p className="text-xs text-destructive">{errors.meta.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="unidade">Unidade *</Label>
              <Input id="unidade" {...register("unidade")} placeholder="Ex: %, R$, leads" />
              {errors.unidade && <p className="text-xs text-destructive">{errors.unidade.message}</p>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Tipo de Meta</Label>
              <Controller
                name="tipo_meta"
                control={control}
                render={({ field }) => (
                  <Select onValueChange={field.onChange} value={field.value}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Crescer">Crescer (Valor ↑)</SelectItem>
                      <SelectItem value="Reduzir">Reduzir (Valor ↓)</SelectItem>
                      <SelectItem value="Manter">Manter (Atingir exato)</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
            <div className="space-y-2">
              <Label>Frequência de Lançamento</Label>
              <Controller
                name="frequencia"
                control={control}
                render={({ field }) => (
                  <Select onValueChange={field.onChange} value={field.value}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Diário">Diário</SelectItem>
                      <SelectItem value="Semanal">Semanal</SelectItem>
                      <SelectItem value="Mensal">Mensal</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Responsável</Label>
              <Controller
                name="responsavel_id"
                control={control}
                render={({ field }) => (
                  <Select onValueChange={field.onChange} value={field.value}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione..." />
                    </SelectTrigger>
                    <SelectContent>
                      {membros.map(m => (
                        <SelectItem key={m.id} value={m.id}>
                          <div className="flex items-center gap-2">
                            <Avatar className="h-5 w-5">
                              <AvatarImage src={m.avatar_url || ""} />
                              <AvatarFallback>{m.nome.substring(0, 2)}</AvatarFallback>
                            </Avatar>
                            {m.nome}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="grupo_historico">Grupo Histórico (Opcional)</Label>
              <Input id="grupo_historico" {...register("grupo_historico")} placeholder="Ex: mrr_comercial" />
              <p className="text-[10px] text-muted-foreground mt-1">Use o mesmo código para KRs similares em ciclos diferentes para ver evolução histórica.</p>
            </div>
          </div>

          {editingKR && (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg flex gap-3 text-blue-800 text-xs italic">
              <Info className="w-4 h-4 shrink-0" />
              <p>Alterar a Meta ou Baseline recalculará automaticamente o progresso e o status deste KR em todos os dashboards.</p>
            </div>
          )}

          <DialogFooter className="pt-4">
            <Button type="button" variant="ghost" onClick={onClose}>Cancelar</Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {editingKR ? "Salvar Alterações" : "Criar KR"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
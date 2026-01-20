import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
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
import { supabase } from "@/integrations/supabase/client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";
import { useRadar } from "@/contexts/RadarContext.tsx";
import type { TablesInsert } from "@/integrations/supabase/types";

const schema = z.object({
  titulo: z.string().min(5, "Título muito curto"),
  meta: z.coerce.number().min(0.01),
  baseline: z.coerce.number().default(0),
  unidade: z.string(),
  tipo_meta: z.string(),
  responsavel_id: z.string().uuid(),
  objetivo_id: z.string().uuid(),
  frequencia: z.string(),
});

type FormData = z.infer<typeof schema>;

interface Props {
  isOpen: boolean;
  onClose: () => void;
  objetivoId: string;
  editingKR?: any;
}

export function KRFormModal({ isOpen, onClose, objetivoId, editingKR }: Props) {
  const { membros } = useRadar();
  const queryClient = useQueryClient();
  const { register, handleSubmit, control, reset } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: editingKR || { objetivo_id: objetivoId, tipo_meta: "Crescer", frequencia: "Semanal", baseline: 0 }
  });

  const mutation = useMutation({
    mutationFn: async (data: FormData) => {
      const payload: TablesInsert<"key_results"> = {
        titulo: data.titulo,
        meta: data.meta,
        baseline: data.baseline,
        unidade: data.unidade,
        tipo_meta: data.tipo_meta,
        responsavel_id: data.responsavel_id,
        objetivo_id: data.objetivo_id,
        frequencia: data.frequencia,
      };

      if (editingKR) {
        const { error } = await supabase.from("key_results").update(payload).eq("id", editingKR.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("key_results").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["radar-dashboard-data"] });
      toast({ title: "Sucesso", description: "Key Result salvo" });
      onClose();
      reset();
    }
  });

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>{editingKR ? "Editar KR" : "Novo KR"}</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="space-y-4">
          <div className="space-y-2">
            <Label>Título do KR</Label>
            <Input {...register("titulo")} placeholder="Como mediremos o sucesso?" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2"><Label>Baseline</Label><Input type="number" {...register("baseline")} /></div>
            <div className="space-y-2"><Label>Meta Final</Label><Input type="number" {...register("meta")} /></div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2"><Label>Unidade</Label><Input {...register("unidade")} placeholder="Ex: %, R$, Leads" /></div>
            <div className="space-y-2">
              <Label>Tipo de Meta</Label>
              <Controller name="tipo_meta" control={control} render={({ field }) => (
                <Select onValueChange={field.onChange} value={field.value}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Crescer">Crescer</SelectItem>
                    <SelectItem value="Reduzir">Reduzir</SelectItem>
                    <SelectItem value="Manter">Manter</SelectItem>
                  </SelectContent>
                </Select>
              )} />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Responsável</Label>
            <Controller name="responsavel_id" control={control} render={({ field }) => (
              <Select onValueChange={field.onChange} value={field.value}>
                <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>
                  {membros.map(m => <SelectItem key={m.id} value={m.id}>{m.nome}</SelectItem>)}
                </SelectContent>
              </Select>
            )} />
          </div>
          <DialogFooter><Button type="submit">Salvar KR</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
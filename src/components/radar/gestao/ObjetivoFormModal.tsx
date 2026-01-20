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
import { Loader2 } from "lucide-react";
import { useRadar } from "@/contexts/RadarContext.tsx";
import type { TablesInsert } from "@/integrations/supabase/types";

const schema = z.object({
  titulo: z.string().min(5, "Título muito curto"),
  area: z.string(),
  responsavel_id: z.string().uuid("Selecione um responsável"),
  peso: z.number().min(1).max(5),
  ciclo_id: z.string().uuid()
});

type FormData = z.infer<typeof schema>;

interface Props {
  isOpen: boolean;
  onClose: () => void;
  cicloId: string;
  editingObj?: any;
}

export function ObjetivoFormModal({ isOpen, onClose, cicloId, editingObj }: Props) {
  const { membros } = useRadar();
  const queryClient = useQueryClient();
  const { register, handleSubmit, control, formState: { errors }, reset } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: editingObj || { ciclo_id: cicloId, area: "Geral", peso: 3 }
  });

  const mutation = useMutation({
    mutationFn: async (data: FormData) => {
      const payload: TablesInsert<"objetivos_okr"> = {
        titulo: data.titulo,
        area: data.area,
        responsavel_id: data.responsavel_id,
        peso: data.peso,
        ciclo_id: data.ciclo_id,
      };

      if (editingObj) {
        const { error } = await supabase.from("objetivos_okr").update(payload).eq("id", editingObj.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("objetivos_okr").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["radar-dashboard-data"] });
      toast({ title: "Sucesso", description: "Objetivo salvo" });
      onClose();
      reset();
    },
    onError: (err: any) => {
      toast({ variant: "destructive", title: "Erro", description: err.message });
    }
  });

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader><DialogTitle>{editingObj ? "Editar Objetivo" : "Novo Objetivo"}</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="space-y-4">
          <div className="space-y-2">
            <Label>Título do Objetivo</Label>
            <Input {...register("titulo")} placeholder="O que queremos atingir?" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Área</Label>
              <Controller name="area" control={control} render={({ field }) => (
                <Select onValueChange={field.onChange} value={field.value}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["Comercial", "Produto", "Suporte", "Financeiro", "Geral"].map(a => (
                      <SelectItem key={a} value={a}>{a}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )} />
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
          </div>
          <DialogFooter>
            <Button type="submit" disabled={mutation.isPending}>Salvar</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
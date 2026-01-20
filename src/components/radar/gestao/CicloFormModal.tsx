import { useForm } from "react-hook-form";
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
import type { TablesInsert } from "@/integrations/supabase/types";

const schema = z.object({
  nome: z.string().min(3, "Nome muito curto"),
  tipo: z.string(),
  data_inicio: z.string(),
  data_fim: z.string(),
  status: z.string(),
});

type FormData = z.infer<typeof schema>;

interface Props {
  isOpen: boolean;
  onClose: () => void;
  editingCiclo?: any;
}

export function CicloFormModal({ isOpen, onClose, editingCiclo }: Props) {
  const queryClient = useQueryClient();
  const { register, handleSubmit, formState: { errors }, reset } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: editingCiclo || { status: "Planejamento", tipo: "Trimestral" }
  });

  const mutation = useMutation({
    mutationFn: async (data: FormData) => {
      const payload: TablesInsert<"ciclos_okr"> = {
        nome: data.nome,
        tipo: data.tipo,
        data_inicio: data.data_inicio,
        data_fim: data.data_fim,
        status: data.status,
      };

      if (editingCiclo) {
        const { error } = await supabase.from("ciclos_okr").update(payload).eq("id", editingCiclo.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("ciclos_okr").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ciclos_okr"] });
      toast({ title: "Sucesso", description: "Ciclo salvo com sucesso" });
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
        <DialogHeader>
          <DialogTitle>{editingCiclo ? "Editar Ciclo" : "Novo Ciclo"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="space-y-4">
          <div className="space-y-2">
            <Label>Nome do Ciclo</Label>
            <Input {...register("nome")} placeholder="Ex: Q1 2026" />
            {errors.nome && <p className="text-xs text-red-500">{errors.nome.message}</p>}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Data Início</Label>
              <Input type="date" {...register("data_inicio")} />
            </div>
            <div className="space-y-2">
              <Label>Data Fim</Label>
              <Input type="date" {...register("data_fim")} />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={onClose}>Cancelar</Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Salvar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
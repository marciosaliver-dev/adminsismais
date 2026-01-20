"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
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
import { supabase } from "@/integrations/supabase/client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";
import { Loader2, AlertTriangle } from "lucide-react";
import { addDays, format, parseISO } from "date-fns";
import type { Tables, TablesInsert } from "@/integrations/supabase/types";

const schema = z.object({
  nome: z.string().min(3, "O nome deve ter pelo menos 3 caracteres"),
  tipo: z.enum(["Trimestral", "Mensal"]),
  data_inicio: z.string().min(1, "Data de início é obrigatória"),
  data_fim: z.string().min(1, "Data de fim é obrigatória"),
  status: z.enum(["Planejamento", "Ativo", "Encerrado"]),
}).refine((data) => new Date(data.data_fim) > new Date(data.data_inicio), {
  message: "A data de fim deve ser posterior à data de início",
  path: ["data_fim"],
});

type FormData = z.infer<typeof schema>;

interface Props {
  isOpen: boolean;
  onClose: () => void;
  editingCiclo?: Tables<"ciclos_okr"> | null;
}

export function CicloModal({ isOpen, onClose, editingCiclo }: Props) {
  const queryClient = useQueryClient();
  const { register, handleSubmit, formState: { errors }, reset, watch, setValue } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      status: "Planejamento",
      tipo: "Trimestral",
    }
  });

  const tipo = watch("tipo");
  const dataInicio = watch("data_inicio");
  const status = watch("status");

  // Sugestão automática de data fim
  useEffect(() => {
    if (dataInicio && !editingCiclo) {
      const start = parseISO(dataInicio);
      const end = addDays(start, tipo === "Trimestral" ? 90 : 30);
      setValue("data_fim", format(end, "yyyy-MM-dd"));
    }
  }, [tipo, dataInicio, setValue, editingCiclo]);

  useEffect(() => {
    if (editingCiclo) {
      reset({
        nome: editingCiclo.nome,
        tipo: editingCiclo.tipo as any,
        data_inicio: editingCiclo.data_inicio,
        data_fim: editingCiclo.data_fim,
        status: editingCiclo.status as any,
      });
    } else {
      reset({
        status: "Planejamento",
        tipo: "Trimestral",
        data_inicio: format(new Date(), "yyyy-MM-dd")
      });
    }
  }, [editingCiclo, reset, isOpen]);

  const mutation = useMutation({
    mutationFn: async (data: FormData) => {
      // Payload explicitamente tipado para o Supabase
      const payload: TablesInsert<"ciclos_okr"> = {
        nome: data.nome,
        tipo: data.tipo,
        data_inicio: data.data_inicio,
        data_fim: data.data_fim,
        status: data.status,
      };

      // Se status = Ativo, desativar outros primeiro
      if (data.status === 'Ativo') {
        await supabase
          .from('ciclos_okr')
          .update({ status: 'Encerrado' })
          .eq('status', 'Ativo');
      }

      if (editingCiclo) {
        const { error } = await supabase
          .from("ciclos_okr")
          .update(payload)
          .eq("id", editingCiclo.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("ciclos_okr")
          .insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ciclos_okr"] });
      queryClient.invalidateQueries({ queryKey: ["ciclos_okr_all"] });
      toast({ title: "Sucesso", description: `Ciclo ${editingCiclo ? 'atualizado' : 'criado'} com sucesso!` });
      onClose();
    },
    onError: (err: any) => {
      toast({ variant: "destructive", title: "Erro ao salvar", description: err.message });
    }
  });

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{editingCiclo ? "Editar Ciclo" : "Novo Ciclo OKR"}</DialogTitle>
          <DialogDescription>
            Defina o período e o status do planejamento estratégico.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="nome">Nome do Ciclo *</Label>
            <Input id="nome" {...register("nome")} placeholder="Ex: Q1 2026" />
            {errors.nome && <p className="text-xs text-destructive">{errors.nome.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Tipo</Label>
              <Select 
                value={tipo} 
                onValueChange={(v) => setValue("tipo", v as any)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Trimestral">Trimestral</SelectItem>
                  <SelectItem value="Mensal">Mensal</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select 
                value={status} 
                onValueChange={(v) => setValue("status", v as any)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Planejamento">Planejamento</SelectItem>
                  <SelectItem value="Ativo">Ativo</SelectItem>
                  <SelectItem value="Encerrado">Encerrado</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="data_inicio">Data de Início *</Label>
              <Input id="data_inicio" type="date" {...register("data_inicio")} />
              {errors.data_inicio && <p className="text-xs text-destructive">{errors.data_inicio.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="data_fim">Data de Fim *</Label>
              <Input id="data_fim" type="date" {...register("data_fim")} />
              {errors.data_fim && <p className="text-xs text-destructive">{errors.data_fim.message}</p>}
            </div>
          </div>

          {status === "Ativo" && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg flex gap-3 text-amber-800 text-sm">
              <AlertTriangle className="w-5 h-5 shrink-0" />
              <p><strong>Atenção:</strong> Definir este ciclo como Ativo encerrará automaticamente qualquer outro ciclo que esteja ativo no momento.</p>
            </div>
          )}

          <DialogFooter className="pt-4">
            <Button type="button" variant="ghost" onClick={onClose}>Cancelar</Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {editingCiclo ? "Atualizar Ciclo" : "Criar Ciclo"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
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
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";
import { Loader2, Star } from "lucide-react";
import { useRadar } from "@/contexts/RadarContext.tsx";
import type { Tables, TablesInsert } from "@/integrations/supabase/types";

const schema = z.object({
  titulo: z.string().min(5, "O título deve ter pelo menos 5 caracteres").max(200),
  descricao: z.string().max(500).optional(),
  area: z.string().min(1, "Selecione uma área"),
  responsavel_id: z.string().uuid("Selecione um responsável"),
  peso: z.number().min(1).max(5),
  ciclo_id: z.string().uuid("Selecione um ciclo"),
});

type FormData = z.infer<typeof schema>;

interface Props {
  isOpen: boolean;
  onClose: () => void;
  cicloId: string;
  editingObj?: Tables<"objetivos_okr"> | null;
}

const AREAS = ["Comercial", "Produto", "Suporte", "Financeiro", "Geral"];

export function ObjetivoModal({ isOpen, onClose, cicloId, editingObj }: Props) {
  const { membros, ciclos } = useRadar();
  const queryClient = useQueryClient();
  
  const { register, handleSubmit, control, formState: { errors }, reset, watch } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      ciclo_id: cicloId,
      area: "Geral",
      peso: 3
    }
  });

  const currentPeso = watch("peso") || 3;

  useEffect(() => {
    if (editingObj) {
      reset({
        titulo: editingObj.titulo,
        descricao: editingObj.descricao || "",
        area: editingObj.area,
        responsavel_id: editingObj.responsavel_id,
        peso: editingObj.peso || 3,
        ciclo_id: editingObj.ciclo_id,
      });
    } else {
      reset({
        ciclo_id: cicloId,
        area: "Geral",
        peso: 3,
        titulo: "",
        descricao: ""
      });
    }
  }, [editingObj, cicloId, reset, isOpen]);

  const mutation = useMutation({
    mutationFn: async (data: FormData) => {
      const payload: TablesInsert<"objetivos_okr"> = {
        titulo: data.titulo,
        descricao: data.descricao || null,
        area: data.area,
        responsavel_id: data.responsavel_id,
        peso: data.peso,
        ciclo_id: data.ciclo_id,
      };

      if (editingObj) {
        const { error } = await supabase
          .from("objetivos_okr")
          .update(payload)
          .eq("id", editingObj.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("objetivos_okr")
          .insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["gestao_objetivos"] });
      toast({ title: "Sucesso", description: `Objetivo salvo com sucesso!` });
      onClose();
    },
    onError: (err: any) => {
      toast({ variant: "destructive", title: "Erro", description: err.message });
    }
  });

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>{editingObj ? "Editar Objetivo" : "Novo Objetivo Estratégico"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="space-y-5 py-4">
          <div className="space-y-2">
            <Label>Ciclo</Label>
            <Controller
              name="ciclo_id"
              control={control}
              render={({ field }) => (
                <Select onValueChange={field.onChange} value={field.value} disabled={!editingObj && !!cicloId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o ciclo" />
                  </SelectTrigger>
                  <SelectContent>
                    {ciclos.map(c => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="titulo">Título do Objetivo *</Label>
            <Input id="titulo" {...register("titulo")} placeholder="Ex: Expandir presença digital em 30%" />
            {errors.titulo && <p className="text-xs text-destructive">{errors.titulo.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="descricao">Descrição (Opcional)</Label>
            <Textarea id="descricao" {...register("descricao")} placeholder="Detalhe o que se espera deste objetivo..." rows={3} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Área Responsável</Label>
              <Controller
                name="area"
                control={control}
                render={({ field }) => (
                  <Select onValueChange={field.onChange} value={field.value}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {AREAS.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
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
              {errors.responsavel_id && <p className="text-xs text-destructive">{errors.responsavel_id.message}</p>}
            </div>
          </div>

          <div className="space-y-4 pt-2">
            <div className="flex justify-between items-center">
              <Label>Peso / Importância</Label>
              <div className="flex gap-1 text-amber-500">
                {Array.from({ length: currentPeso }).map((_, i) => <Star key={i} className="w-4 h-4 fill-current" />)}
              </div>
            </div>
            <Controller
              name="peso"
              control={control}
              render={({ field }) => (
                <Slider
                  min={1}
                  max={5}
                  step={1}
                  value={[field.value]}
                  onValueChange={([v]) => field.onChange(v)}
                />
              )}
            />
            <p className="text-[10px] text-muted-foreground uppercase text-center">Arraste para definir a prioridade (1 a 5 estrelas)</p>
          </div>

          <DialogFooter className="pt-4">
            <Button type="button" variant="ghost" onClick={onClose}>Cancelar</Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {editingObj ? "Salvar Alterações" : "Criar Objetivo"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
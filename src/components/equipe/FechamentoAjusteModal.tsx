import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Plus, Minus } from "lucide-react";
import { UseMutationResult } from "@tanstack/react-query";

interface Colaborador {
  id: string;
  nome: string;
}

interface NovoAjuste {
  colaborador_id: string;
  tipo: "credito" | "debito";
  valor: number;
  descricao: string;
}

interface FechamentoAjusteModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  novoAjuste: NovoAjuste;
  setNovoAjuste: React.Dispatch<React.SetStateAction<NovoAjuste>>;
  todosColaboradores: Colaborador[];
  addAjusteMutation: UseMutationResult<any, Error, void, unknown>;
}

export function FechamentoAjusteModal({
  open,
  onOpenChange,
  novoAjuste,
  setNovoAjuste,
  todosColaboradores,
  addAjusteMutation,
}: FechamentoAjusteModalProps) {
  const handleAddAjuste = () => {
    if (!novoAjuste.descricao || novoAjuste.valor <= 0) return;
    addAjusteMutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Novo Ajuste Manual</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <Label>Colaborador (opcional)</Label>
            <Select
              value={novoAjuste.colaborador_id || "_geral_"}
              onValueChange={(value) => setNovoAjuste({ ...novoAjuste, colaborador_id: value === "_geral_" ? "" : value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione ou deixe em branco para geral" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="_geral_">Geral (todos)</SelectItem>
                {todosColaboradores.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Tipo</Label>
            <Select
              value={novoAjuste.tipo}
              onValueChange={(value: "credito" | "debito") => setNovoAjuste({ ...novoAjuste, tipo: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="credito">
                  <div className="flex items-center gap-2 text-green-600">
                    <Plus className="w-4 h-4" /> Crédito (+)
                  </div>
                </SelectItem>
                <SelectItem value="debito">
                  <div className="flex items-center gap-2 text-red-600">
                    <Minus className="w-4 h-4" /> Débito (-)
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Valor</Label>
            <Input
              type="number"
              step="0.01"
              value={novoAjuste.valor}
              onChange={(e) => setNovoAjuste({ ...novoAjuste, valor: Number(e.target.value) })}
            />
          </div>

          <div className="space-y-2">
            <Label>Descrição</Label>
            <Textarea
              value={novoAjuste.descricao}
              onChange={(e) => setNovoAjuste({ ...novoAjuste, descricao: e.target.value })}
              placeholder="Descreva o motivo do ajuste..."
              rows={3}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button 
            onClick={handleAddAjuste}
            disabled={!novoAjuste.descricao || novoAjuste.valor <= 0 || addAjusteMutation.isPending}
          >
            {addAjusteMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Adicionar Ajuste
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
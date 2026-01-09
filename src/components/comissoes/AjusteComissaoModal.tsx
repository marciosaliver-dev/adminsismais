import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Plus, Minus } from "lucide-react";

interface Vendedor {
  nome: string;
}

interface AjusteComissaoModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vendedores: Vendedor[];
  onSubmit: (data: {
    vendedor: string;
    tipo: "credito" | "debito";
    valor: number;
    descricao: string;
  }) => Promise<void>;
  isLoading?: boolean;
}

export function AjusteComissaoModal({
  open,
  onOpenChange,
  vendedores,
  onSubmit,
  isLoading = false,
}: AjusteComissaoModalProps) {
  const [vendedor, setVendedor] = useState("");
  const [tipo, setTipo] = useState<"credito" | "debito">("credito");
  const [valor, setValor] = useState("");
  const [descricao, setDescricao] = useState("");

  useEffect(() => {
    if (open) {
      setVendedor("");
      setTipo("credito");
      setValor("");
      setDescricao("");
    }
  }, [open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!vendedor || !valor || !descricao) return;

    await onSubmit({
      vendedor,
      tipo,
      valor: parseFloat(valor),
      descricao,
    });
  };

  const isValid = vendedor && valor && parseFloat(valor) > 0 && descricao.trim();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="w-5 h-5 text-primary" />
            Adicionar Bônus Manual
          </DialogTitle>
          <DialogDescription>
            Adicione ajustes manuais à comissão do vendedor
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="vendedor">Vendedor *</Label>
            <Select value={vendedor} onValueChange={setVendedor}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o vendedor" />
              </SelectTrigger>
              <SelectContent>
                {vendedores.map((v) => (
                  <SelectItem key={v.nome} value={v.nome}>
                    {v.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="tipo">Tipo *</Label>
            <Select value={tipo} onValueChange={(v) => setTipo(v as "credito" | "debito")}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="credito">
                  <div className="flex items-center gap-2">
                    <Plus className="w-4 h-4 text-success" />
                    Bônus (Adicionar)
                  </div>
                </SelectItem>
                <SelectItem value="debito">
                  <div className="flex items-center gap-2">
                    <Minus className="w-4 h-4 text-destructive" />
                    Desconto (Subtrair)
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="valor">Valor *</Label>
            <Input
              id="valor"
              type="number"
              step="0.01"
              min="0"
              placeholder="0,00"
              value={valor}
              onChange={(e) => setValor(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="descricao">Descrição *</Label>
            <Textarea
              id="descricao"
              placeholder="Descreva o motivo do ajuste..."
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              rows={3}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={!isValid || isLoading}
              className="bg-success text-success-foreground hover:bg-success/90"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : null}
              Adicionar Bônus
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

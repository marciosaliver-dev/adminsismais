import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Loader2, CheckCircle, Receipt, ArrowLeft } from "lucide-react";
import { format, startOfMonth, parse } from "date-fns";
import { Link } from "react-router-dom";

interface Colaborador {
  id: string;
  nome: string;
  email: string | null;
  eh_vendedor_direto: boolean | null;
}

interface VendaForm {
  colaborador_id: string;
  cliente: string;
  descricao_servico: string;
  valor_servico: string;
  data_venda: string;
  observacoes: string;
  plataforma: string;
}

const SERVICOS_SUGERIDOS = [
  "Treinamento",
  "Implantação",
  "Consultoria",
  "Suporte Premium",
  "Migração de Dados",
  "Customização",
  "Integração",
];

const PLATAFORMAS = [
  "Guru Manager",
  "Banco Inter",
  "Eduzz",
  "GalaxyPay",
];

const initialFormState: VendaForm = {
  colaborador_id: "",
  cliente: "",
  descricao_servico: "",
  valor_servico: "",
  data_venda: format(new Date(), "yyyy-MM-dd"),
  observacoes: "",
  plataforma: "Guru Manager",
};

export default function LancarVendaPublica() {
  const { profile } = useAuth();
  const [formData, setFormData] = useState<VendaForm>(initialFormState);
  const [submitted, setSubmitted] = useState(false);

  const mesReferencia = format(new Date(), "yyyy-MM");
  const mesReferenciaDate = startOfMonth(parse(mesReferencia, "yyyy-MM", new Date()));

  const { data: colaboradores, isLoading: loadingColaboradores } = useQuery({
    queryKey: ["colaboradores-formulario"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("colaboradores")
        .select("id, nome, email, eh_vendedor_direto")
        .eq("ativo", true)
        .order("nome");

      if (error) throw error;
      return data as Colaborador[];
    },
  });

  // Auto-select based on logged-in profile email
  useEffect(() => {
    if (colaboradores && profile?.email && !formData.colaborador_id) {
      const match = colaboradores.find(c => c.email?.toLowerCase() === profile.email.toLowerCase());
      if (match) {
        setFormData(prev => ({ ...prev, colaborador_id: match.id }));
      }
    }
  }, [colaboradores, profile, formData.colaborador_id]);

  const createMutation = useMutation({
    mutationFn: async (data: VendaForm) => {
      const { error } = await supabase.from("vendas_servicos").insert({
        colaborador_id: data.colaborador_id,
        cliente: data.cliente,
        descricao_servico: data.descricao_servico,
        valor_servico: parseFloat(data.valor_servico),
        data_venda: data.data_venda,
        mes_referencia: format(mesReferenciaDate, "yyyy-MM-dd"),
        observacoes: data.observacoes || null,
        plataforma: data.plataforma,
        status: "pendente",
      });

      if (error) throw error;
    },
    onSuccess: () => {
      setSubmitted(true);
      toast.success("Venda registrada com sucesso! Aguarde aprovação.");
    },
    onError: (error) => {
      toast.error("Erro ao registrar venda: " + error.message);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.colaborador_id || !formData.cliente || !formData.descricao_servico || !formData.valor_servico) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }
    createMutation.mutate(formData);
  };

  const handleNovo = () => {
    // Keep the colaborador_id on reset for convenience
    setFormData({ ...initialFormState, colaborador_id: formData.colaborador_id });
    setSubmitted(false);
  };

  const formatCurrency = (value: string) => {
    const num = parseFloat(value);
    if (isNaN(num)) return "R$ 0,00";
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(num);
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-cyan-50 to-blue-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
        <Card className="w-full max-w-md text-center">
          <CardContent className="pt-8 pb-6 space-y-4">
            <div className="mx-auto w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-green-700">Venda Registrada!</h2>
            <p className="text-muted-foreground">
              Sua venda foi enviada para aprovação. Você receberá a confirmação em breve.
            </p>
            <div className="flex flex-col gap-2">
              <Button onClick={handleNovo} className="mt-4">
                Lançar Nova Venda
              </Button>
              <Button variant="ghost" asChild>
                <Link to="/">Voltar ao Dashboard</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-cyan-50 to-blue-100 dark:from-gray-900 dark:to-gray-800 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-lg mb-4 flex justify-start">
        <Button variant="ghost" asChild className="gap-2">
          <Link to="/"><ArrowLeft className="w-4 h-4" /> Voltar</Link>
        </Button>
      </div>
      
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center border-b pb-6">
          <div className="mx-auto w-14 h-14 rounded-full bg-cyan-100 flex items-center justify-center mb-4">
            <Receipt className="h-7 w-7 text-cyan-700" />
          </div>
          <CardTitle className="text-2xl">Lançar Venda de Serviço</CardTitle>
          <CardDescription>
            Registre suas vendas de serviços extras para aprovação
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="colaborador">Responsável pela Venda *</Label>
              <Select
                value={formData.colaborador_id}
                onValueChange={(value) => setFormData({ ...formData, colaborador_id: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o colaborador" />
                </SelectTrigger>
                <SelectContent>
                  {loadingColaboradores ? (
                    <div className="flex justify-center p-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                    </div>
                  ) : (
                    colaboradores?.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.nome} {c.eh_vendedor_direto && "(Vendedor)"}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="cliente">Cliente *</Label>
              <Input
                id="cliente"
                value={formData.cliente}
                onChange={(e) => setFormData({ ...formData, cliente: e.target.value })}
                placeholder="Nome do cliente"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="servico">Tipo de Serviço *</Label>
              <Select
                value={SERVICOS_SUGERIDOS.includes(formData.descricao_servico) ? formData.descricao_servico : ""}
                onValueChange={(value) => setFormData({ ...formData, descricao_servico: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o tipo de serviço" />
                </SelectTrigger>
                <SelectContent>
                  {SERVICOS_SUGERIDOS.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                placeholder="Ou digite um serviço personalizado"
                value={SERVICOS_SUGERIDOS.includes(formData.descricao_servico) ? "" : formData.descricao_servico}
                onChange={(e) => {
                  const value = e.target.value;
                  setFormData({ ...formData, descricao_servico: value });
                }}
                className="mt-2"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="plataforma">Plataforma de Recebimento *</Label>
              <Select
                value={formData.plataforma}
                onValueChange={(value) => setFormData({ ...formData, plataforma: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a plataforma" />
                </SelectTrigger>
                <SelectContent>
                  {PLATAFORMAS.map((p) => (
                    <SelectItem key={p} value={p}>
                      {p}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="valor">Valor do Serviço *</Label>
                <Input
                  id="valor"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.valor_servico}
                  onChange={(e) => setFormData({ ...formData, valor_servico: e.target.value })}
                  placeholder="0,00"
                />
                {formData.valor_servico && (
                  <p className="text-sm text-muted-foreground">
                    {formatCurrency(formData.valor_servico)}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="data">Data da Venda *</Label>
                <Input
                  id="data"
                  type="date"
                  value={formData.data_venda}
                  onChange={(e) => setFormData({ ...formData, data_venda: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="observacoes">Observações</Label>
              <Textarea
                id="observacoes"
                value={formData.observacoes}
                onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })}
                placeholder="Detalhes adicionais sobre a venda..."
                rows={3}
              />
            </div>

            <Button 
              type="submit" 
              className="w-full" 
              size="lg"
              disabled={createMutation.isPending}
            >
              {createMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Enviar para Aprovação
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
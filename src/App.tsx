import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./hooks/useAuth";
import { ProtectedRoute } from "./components/auth/ProtectedRoute";
import { Layout } from "./components/layout/Layout";
import Comissoes from "./pages/Comissoes";
import ConfiguracoesComissao from "./pages/ConfiguracoesComissao";
import ResultadoFechamento from "./pages/ResultadoFechamento";
import HistoricoComissoes from "./pages/HistoricoComissoes";
import RelatorioVendas from "./pages/RelatorioVendas";
import ExtratoAsaas from "./pages/ExtratoAsaas";
import ExtratoAsaasDetalhe from "./pages/ExtratoAsaasDetalhe";
import ExtratoEduzz from "./pages/ExtratoEduzz";
import ExtratoEduzzDetalhe from "./pages/ExtratoEduzzDetalhe";
import GerenciarUsuarios from "./pages/admin/GerenciarUsuarios";
import GerenciarPermissoes from "./pages/admin/GerenciarPermissoes";
import Colaboradores from "./pages/equipe/Colaboradores";
import VendasServicos from "./pages/equipe/VendasServicos";
import MetasIndividuais from "./pages/equipe/MetasIndividuais";
import FechamentoEquipe from "./pages/equipe/FechamentoEquipe";
import LancarVendaPublica from "./pages/LancarVendaPublica";
import SimuladorMeta from "./pages/SimuladorMeta";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            {/* Public routes */}
            <Route path="/auth" element={<Auth />} />
            <Route path="/lancar-venda" element={<LancarVendaPublica />} />
            
            {/* Redirect root to comissoes */}
            <Route path="/" element={<Navigate to="/comissoes" replace />} />
            
            {/* Protected routes - Comissões */}
            <Route
              path="/comissoes"
              element={
                <ProtectedRoute>
                  <Layout>
                    <Comissoes />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/comissoes/fechamento/:id"
              element={
                <ProtectedRoute>
                  <Layout>
                    <ResultadoFechamento />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/comissoes/historico"
              element={
                <ProtectedRoute>
                  <Layout>
                    <HistoricoComissoes />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/comissoes/configuracoes"
              element={
                <ProtectedRoute>
                  <Layout>
                    <ConfiguracoesComissao />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/comissoes/relatorio-vendas"
              element={
                <ProtectedRoute>
                  <Layout>
                    <RelatorioVendas />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/comissoes/simulador"
              element={
                <ProtectedRoute>
                  <Layout>
                    <SimuladorMeta />
                  </Layout>
                </ProtectedRoute>
              }
            />
            
            {/* Protected routes - Extrato Asaas */}
            <Route
              path="/extrato-asaas"
              element={
                <ProtectedRoute>
                  <Layout>
                    <ExtratoAsaas />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/extrato-asaas/:id"
              element={
                <ProtectedRoute>
                  <Layout>
                    <ExtratoAsaasDetalhe />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/extrato-eduzz"
              element={
                <ProtectedRoute>
                  <Layout>
                    <ExtratoEduzz />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/extrato-eduzz/:id"
              element={
                <ProtectedRoute>
                  <Layout>
                    <ExtratoEduzzDetalhe />
                  </Layout>
                </ProtectedRoute>
              }
            />
            
            {/* Protected routes - Equipe */}
            <Route
              path="/equipe/colaboradores"
              element={
                <ProtectedRoute>
                  <Layout>
                    <Colaboradores />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/equipe/vendas-servicos"
              element={
                <ProtectedRoute>
                  <Layout>
                    <VendasServicos />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/equipe/metas"
              element={
                <ProtectedRoute>
                  <Layout>
                    <MetasIndividuais />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/equipe/fechamento"
              element={
                <ProtectedRoute>
                  <Layout>
                    <FechamentoEquipe />
                  </Layout>
                </ProtectedRoute>
              }
            />
            
            {/* Protected routes - Admin */}
            <Route
              path="/admin/usuarios"
              element={
                <ProtectedRoute>
                  <Layout>
                    <GerenciarUsuarios />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/permissoes"
              element={
                <ProtectedRoute>
                  <Layout>
                    <GerenciarPermissoes />
                  </Layout>
                </ProtectedRoute>
              }
            />
            
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;

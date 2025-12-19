import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./hooks/useAuth";
import { ProtectedRoute } from "./components/auth/ProtectedRoute";
import { Layout } from "./components/layout/Layout";
import Dashboard from "./pages/Dashboard";
import Cohorts from "./pages/Cohorts";
import Financeiro from "./pages/Financeiro";
import Comissoes from "./pages/Comissoes";
import ConfiguracoesComissao from "./pages/ConfiguracoesComissao";
import ResultadoFechamento from "./pages/ResultadoFechamento";
import HistoricoComissoes from "./pages/HistoricoComissoes";
import RelatorioVendas from "./pages/RelatorioVendas";
import ExtratoAsaas from "./pages/ExtratoAsaas";
import ExtratoAsaasDetalhe from "./pages/ExtratoAsaasDetalhe";
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
            {/* Public route */}
            <Route path="/auth" element={<Auth />} />
            
            {/* Protected routes */}
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <Layout>
                    <Dashboard />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/cohorts"
              element={
                <ProtectedRoute>
                  <Layout>
                    <Cohorts />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/financeiro"
              element={
                <ProtectedRoute>
                  <Layout>
                    <Financeiro />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/conciliacao"
              element={
                <ProtectedRoute>
                  <Layout>
                    <Financeiro />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/orcamentos"
              element={
                <ProtectedRoute>
                  <Layout>
                    <Financeiro />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/despesas"
              element={
                <ProtectedRoute>
                  <Layout>
                    <Financeiro />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/despesas/aprovar"
              element={
                <ProtectedRoute>
                  <Layout>
                    <Financeiro />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/despesas/cartoes"
              element={
                <ProtectedRoute>
                  <Layout>
                    <Financeiro />
                  </Layout>
                </ProtectedRoute>
              }
            />
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
              path="/configuracoes"
              element={
                <ProtectedRoute>
                  <Layout>
                    <Financeiro />
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

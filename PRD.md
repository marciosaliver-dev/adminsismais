# Product Requirements Document (PRD)
## Sistema de Gestão de Comissões e Extrato Financeiro

---

## 1. Visão Geral do Produto

### 1.1 Propósito
Sistema web interno para gestão de comissões de vendas e controle financeiro de extratos bancários. A aplicação permite o fechamento mensal de comissões para equipe comercial, com cálculo automático de bonificações baseado em metas e faixas de desempenho.

### 1.2 Público-Alvo
- **Gestores Comerciais**: Realizam o fechamento mensal, definem metas e aprovam comissões
- **Equipe Financeira**: Acompanham extratos e fluxo de caixa
- **Administradores**: Gerenciam usuários, permissões e configurações do sistema
- **Vendedores**: Consultam suas comissões e desempenho (via relatórios)

### 1.3 Stack Tecnológico
- **Frontend**: React 18 + TypeScript + Vite
- **UI Framework**: Tailwind CSS + shadcn/ui
- **State Management**: TanStack React Query
- **Backend**: Lovable Cloud (Supabase)
- **Database**: PostgreSQL
- **Edge Functions**: Deno (Supabase Edge Functions)
- **Gráficos**: Recharts
- **Exportação**: XLSX, jsPDF

---

## 2. Arquitetura do Sistema

### 2.1 Diagrama de Módulos

```
┌─────────────────────────────────────────────────────────────────┐
│                        APLICAÇÃO PRINCIPAL                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐  │
│  │   MÓDULO     │  │   MÓDULO     │  │      MÓDULO          │  │
│  │  COMISSÕES   │  │EXTRATO ASAAS │  │   ADMINISTRAÇÃO      │  │
│  ├──────────────┤  ├──────────────┤  ├──────────────────────┤  │
│  │• Fechamento  │  │• Importação  │  │• Gerenciar Usuários  │  │
│  │• Resultado   │  │• Visão Geral │  │• Gerenciar Permissões│  │
│  │• Histórico   │  │• Filtros     │  │• Módulos/Funcional.  │  │
│  │• Relatórios  │  │• Gráficos    │  │                      │  │
│  │• Configuração│  │              │  │                      │  │
│  └──────────────┘  └──────────────┘  └──────────────────────┘  │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      LOVABLE CLOUD (BACKEND)                     │
├─────────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐  │
│  │  Auth Layer  │  │  Database    │  │   Edge Functions     │  │
│  │  (Supabase)  │  │  PostgreSQL  │  │   (Deno Runtime)     │  │
│  ├──────────────┤  ├──────────────┤  ├──────────────────────┤  │
│  │• Sign Up     │  │• profiles    │  │• calcular-comissoes  │  │
│  │• Sign In     │  │• fechamentos │  │                      │  │
│  │• Session     │  │• vendas      │  │                      │  │
│  │• RLS Policies│  │• comissões   │  │                      │  │
│  │              │  │• extratos    │  │                      │  │
│  └──────────────┘  └──────────────┘  └──────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

### 2.2 Modelo de Dados (ERD)

```
┌─────────────────────┐     ┌─────────────────────┐
│     auth.users      │     │      profiles       │
├─────────────────────┤     ├─────────────────────┤
│ id (PK)             │◄────│ user_id (FK)        │
│ email               │     │ nome                │
│ ...                 │     │ email               │
└─────────────────────┘     │ departamento        │
         │                  │ aprovado            │
         │                  └─────────────────────┘
         │
         ▼
┌─────────────────────┐     ┌─────────────────────┐
│     user_roles      │     │      modulos        │
├─────────────────────┤     ├─────────────────────┤
│ user_id (FK)        │     │ id (PK)             │
│ role (admin/user)   │     │ nome                │
└─────────────────────┘     │ rota                │
         │                  │ icone               │
         │                  │ ordem               │
         ▼                  └─────────────────────┘
┌─────────────────────┐              │
│ permissoes_usuario  │              ▼
├─────────────────────┤     ┌─────────────────────┐
│ user_id (FK)        │     │  funcionalidades    │
│ funcionalidade_id   │◄────│ modulo_id (FK)      │
│ permitido           │     │ codigo              │
└─────────────────────┘     │ nome                │
                            └─────────────────────┘

┌─────────────────────┐     ┌─────────────────────┐
│ fechamento_comissao │     │   venda_importada   │
├─────────────────────┤     ├─────────────────────┤
│ id (PK)             │◄────│ fechamento_id (FK)  │
│ mes_referencia      │     │ vendedor            │
│ total_vendas        │     │ cliente             │
│ total_mrr           │     │ valor_mrr           │
│ meta_batida         │     │ tipo_venda          │
│ status              │     │ conta_comissao      │
│ arquivo_nome        │     │ conta_faixa         │
└─────────────────────┘     │ conta_meta          │
         │                  └─────────────────────┘
         │
         ▼
┌─────────────────────┐     ┌─────────────────────┐
│  comissao_calculada │     │   faixa_comissao    │
├─────────────────────┤     ├─────────────────────┤
│ fechamento_id (FK)  │     │ nome                │
│ vendedor            │     │ mrr_min             │
│ mrr_total           │     │ mrr_max             │
│ faixa_nome          │     │ percentual          │
│ percentual          │     │ ordem               │
│ valor_comissao      │     │ ativo               │
│ bonus_anual         │     └─────────────────────┘
│ bonus_meta_equipe   │
│ bonus_empresa       │     ┌─────────────────────┐
│ total_receber       │     │     meta_mensal     │
└─────────────────────┘     ├─────────────────────┤
                            │ mes_referencia      │
┌─────────────────────┐     │ meta_mrr            │
│  importacoes_extrato│     │ meta_quantidade     │
├─────────────────────┤     │ bonus_meta_equipe   │
│ arquivo_nome        │     │ bonus_meta_empresa  │
│ periodo_inicio      │     │ num_colaboradores   │
│ periodo_fim         │     │ multiplicador_anual │
│ total_registros     │     │ comissao_venda_unica│
│ registros_novos     │     │ ltv_medio           │
│ total_creditos      │     └─────────────────────┘
│ total_debitos       │
└─────────────────────┘
         │
         ▼
┌─────────────────────┐
│    extrato_asaas    │
├─────────────────────┤
│ importacao_id (FK)  │
│ transacao_id        │
│ data                │
│ tipo_transacao      │
│ tipo_lancamento     │
│ valor               │
│ saldo               │
│ descricao           │
└─────────────────────┘
```

---

## 3. Especificação Funcional

### 3.1 Módulo: Autenticação e Autorização

#### 3.1.1 Fluxo de Cadastro
1. Usuário acessa a página de cadastro
2. Preenche: email, senha, nome, departamento (opcional)
3. Sistema cria conta no Supabase Auth
4. Trigger automático cria:
   - Registro em `profiles` (aprovado = false)
   - Registro em `user_roles` (role = 'user')
5. Usuário aguarda aprovação do administrador

#### 3.1.2 Fluxo de Aprovação (Admin)
1. Admin acessa "Gerenciar Usuários"
2. Visualiza lista de usuários pendentes
3. Pode aprovar ou rejeitar cada usuário
4. Aprovação: `profiles.aprovado = true`
5. Opcionalmente, define como Admin

#### 3.1.3 Sistema de Permissões
- **Roles**: `admin` e `user`
- **Módulos**: Grupos de funcionalidades (Comissões, Extrato, Admin)
- **Funcionalidades**: Ações específicas com código único
  - `comissoes.visualizar`
  - `comissoes.criar`
  - `comissoes.configurar`
  - `extrato.visualizar`
  - `extrato.importar`
  - `admin.usuarios`
  - `admin.permissoes`

#### 3.1.4 Funções de Segurança (Database Functions)
```sql
-- Verifica se usuário está aprovado
is_user_approved(user_id) → boolean

-- Verifica se usuário tem determinado role
has_role(user_id, role) → boolean

-- Verifica se é admin
is_admin(user_id) → boolean

-- Verifica permissão específica
has_permission(user_id, codigo) → boolean
```

---

### 3.2 Módulo: Comissões

#### 3.2.1 Novo Fechamento
**Rota**: `/comissoes`

**Funcionalidades**:
1. Seleção de mês/ano de referência
2. Upload de arquivo CSV com vendas
3. Validação de colunas obrigatórias:
   - Data Contrato
   - Cliente
   - Vendedor
   - Valor MRR
   - Tipo de Venda
4. Verificação de fechamento existente (com opção de substituir)
5. Processamento em lotes (100 registros por vez)
6. Cálculo automático de comissões via Edge Function

**Regras de Tipo de Venda**:
| Tipo de Venda          | conta_comissao | conta_faixa | conta_meta |
|------------------------|----------------|-------------|------------|
| Venda Direta           | ✅             | ✅          | ✅         |
| Upgrade                | ✅             | ✅          | ✅         |
| Indicação de Cliente   | ✅             | ✅          | ✅         |
| Recuperação de Cliente | ❌             | ✅          | ✅         |
| Afiliado               | ❌             | ❌          | ✅         |
| Migração               | ❌             | ❌          | ❌         |
| Troca de plataforma    | ❌             | ❌          | ❌         |

#### 3.2.2 Cálculo de Comissões (Edge Function)
**Endpoint**: `calcular-comissoes`

**Algoritmo**:
1. Buscar fechamento e mês de referência
2. Buscar meta mensal (ou usar configuração padrão)
3. Agrupar vendas por vendedor
4. Para cada vendedor:
   - Somar MRR das vendas com `conta_faixa = true`
   - Identificar faixa de comissão baseada no MRR total
   - Calcular comissão base: `mrr_comissao × percentual_faixa`
   - Calcular bônus anual: `mrr_vendas_anuais × percentual_faixa`
   - Calcular comissão venda única: `total_adesao × percentual_venda_unica`
5. Verificar meta da empresa:
   - Total MRR (conta_meta) >= Meta MRR
   - Total Quantidade >= Meta Quantidade
6. Se meta batida:
   - Bônus meta equipe: `total_mrr × bonus_equipe% × proporção_vendedor`
   - Bônus empresa: `(total_mrr × bonus_empresa%) / num_colaboradores`
7. Total a receber = soma de todos os componentes

#### 3.2.3 Resultado do Fechamento
**Rota**: `/comissoes/fechamento/:id`

**Informações Exibidas**:
- Cards de resumo: Total Vendas, MRR Total, Meta, Status
- Tabela de comissões por vendedor:
  - Vendedor
  - Qtd Vendas
  - MRR Faixa
  - Faixa
  - Percentual
  - Comissão Base
  - Bônus Total
  - Total a Receber

**Ações Disponíveis**:
- Recalcular comissões
- Editar vendas
- Exportar para Excel
- Fechar mês (muda status para "fechado")
- Ver detalhes do vendedor (modal)

#### 3.2.4 Relatório de Vendas
**Rota**: `/comissoes/relatorio-vendas`

**Funcionalidades**:
- Filtros: Fechamento, Vendedor, Tipo de Venda, Busca
- Ordenação por qualquer coluna
- CRUD de vendas (em fechamentos rascunho)
- Cards de totais: Quantidade, MRR, Faturamento, Ticket Médio
- Geração de PDF individual por vendedor
- Compartilhamento via WhatsApp (link HTML)

#### 3.2.5 Histórico de Fechamentos
**Rota**: `/comissoes/historico`

**Funcionalidades**:
- Filtros: Ano, Status
- Paginação (10 itens por página)
- Visualização rápida: Mês, Data Import, Vendas, MRR, Meta, Status
- Ações: Ver detalhes, Exportar Excel, Excluir

#### 3.2.6 Configurações de Comissão
**Rota**: `/comissoes/configuracoes`

**Seções**:
1. **Faixas de Comissão**
   - Nome, MRR Mín, MRR Máx, Percentual, Ordem
   - CRUD completo
   
2. **Metas Mensais**
   - Mês de referência
   - Meta MRR e Quantidade
   - LTV Médio
   - Bônus Meta Equipe (%)
   - Bônus Meta Empresa (%)
   - Número de Colaboradores
   - Multiplicador Anual
   - Comissão Venda Única (%)
   - Observação

---

### 3.3 Módulo: Extrato Asaas

#### 3.3.1 Importação de Extrato
**Rota**: `/extrato-asaas` (aba "Importar")

**Funcionalidades**:
- Upload de arquivo CSV/XLSX (drag & drop)
- Detecção automática de período
- Identificação de registros duplicados (por transacao_id)
- Barra de progresso durante processamento
- Modal de resultado: novos, duplicados, IDs duplicados
- Histórico de importações com paginação

**Campos Importados**:
- Data, Valor, Saldo
- Transação ID
- Tipo de Transação
- Descrição
- Fatura/Parcelamento
- Fatura/Cobrança
- Nota Fiscal
- Tipo de Lançamento (Crédito/Débito)

#### 3.3.2 Visão Geral do Extrato
**Rota**: `/extrato-asaas` (aba "Visão Geral")

**Filtros**:
- Período pré-definido: Este mês, Último mês, Últimos 3 meses, Este ano
- Período customizado: Mês início, Mês fim
- Tipos de transação (multi-select)
- Tipo de lançamento: Todos, Crédito, Débito
- Busca textual

**Métricas (Cards)**:
- Total de Transações
- Total Créditos
- Total Débitos
- Resultado (Créditos - Débitos)

**Gráficos**:
1. **Evolução Mensal** (LineChart): Créditos vs Débitos
2. **Top 5 Tipos** (BarChart): Volume por tipo de transação
3. **Proporção** (PieChart): Créditos vs Débitos

**Tabelas**:
1. **Resumo por Período** (1-10, 11-20, 21-31):
   - Qtd e valor de créditos
   - Qtd e valor de débitos
   - Resultado do período
2. **Transações Detalhadas**:
   - Data, Tipo, Descrição, Valor, Saldo
   - Ordenação por qualquer coluna
   - Paginação (100 itens)

---

### 3.4 Módulo: Administração

#### 3.4.1 Gerenciar Usuários
**Rota**: `/admin/usuarios`

**Seções**:
1. **Usuários Pendentes**
   - Lista de usuários com `aprovado = false`
   - Botões: Aprovar, Rejeitar
   
2. **Usuários Ativos**
   - Lista de usuários aprovados
   - Colunas: Nome, Email, Departamento, Role, Ações
   - Toggle para promover/remover Admin
   - Proteção: não pode remover próprio admin

#### 3.4.2 Gerenciar Permissões
**Rota**: `/admin/permissoes`

**Funcionalidades**:
- Dropdown para selecionar usuário
- Lista de módulos com funcionalidades
- Toggle para cada permissão
- Salvar alterações por funcionalidade
- Admins têm todas as permissões por padrão

---

### 3.5 Dashboard
**Rota**: `/` (Dashboard)

**Métricas (Cards)**:
- MRR (Receita Mensal)
- Churn Rate
- LTV Médio
- Clientes Ativos

**Gráficos**:
- Evolução MRR & Churn (LineChart)
- Retenção por Cohort (BarChart)
- Receita por Categoria de Plano (AreaChart)
- Métricas Rápidas: ARPU, CAC, Payback, Taxa Conversão

---

## 4. Requisitos Não-Funcionais

### 4.1 Segurança
- Row Level Security (RLS) em todas as tabelas
- Funções de verificação com SECURITY DEFINER
- Aprovação obrigatória para novos usuários
- Proteção contra auto-remoção de admin
- Secrets encriptados no backend

### 4.2 Performance
- Paginação em listas extensas
- Lazy loading de dados por aba
- Processamento em lotes para grandes volumes
- Memoização de cálculos pesados (useMemo)

### 4.3 Usabilidade
- Design responsivo (mobile-first)
- Feedback visual para ações (toasts)
- Skeleton loading durante carregamento
- Drag & drop para upload de arquivos
- Exportação para Excel e PDF

### 4.4 Manutenibilidade
- TypeScript para tipagem estática
- Componentes reutilizáveis (shadcn/ui)
- Hooks customizados para lógica compartilhada
- Separação de concerns (pages, components, hooks)

---

## 5. Rotas da Aplicação

| Rota | Componente | Descrição | Permissão |
|------|------------|-----------|-----------|
| `/auth` | Auth | Login/Cadastro | Pública |
| `/` | Dashboard | Dashboard principal | Aprovado |
| `/comissoes` | Comissoes | Novo fechamento | comissoes.criar |
| `/comissoes/fechamento/:id` | ResultadoFechamento | Detalhes do fechamento | comissoes.visualizar |
| `/comissoes/relatorio-vendas` | RelatorioVendas | Relatório de vendas | comissoes.visualizar |
| `/comissoes/historico` | HistoricoComissoes | Histórico de fechamentos | comissoes.visualizar |
| `/comissoes/configuracoes` | ConfiguracoesComissao | Faixas e metas | comissoes.configurar |
| `/extrato-asaas` | ExtratoAsaas | Importação e visualização | extrato.visualizar |
| `/extrato-asaas/:id` | ExtratoAsaasDetalhe | Detalhes da importação | extrato.visualizar |
| `/admin/usuarios` | GerenciarUsuarios | Gerenciar usuários | admin.usuarios |
| `/admin/permissoes` | GerenciarPermissoes | Gerenciar permissões | admin.permissoes |

---

## 6. Componentes Principais

### 6.1 Layout
- `Layout`: Container principal com Sidebar e Header
- `Sidebar`: Navegação lateral com itens dinâmicos por permissão
- `Header`: Barra superior com info do usuário e logout

### 6.2 Autenticação
- `ProtectedRoute`: Wrapper que verifica autenticação e aprovação
- `PermissionGate`: Renderização condicional por permissão
- `AuthProvider`: Context provider para estado de autenticação

### 6.3 UI Compartilhados
- `MetricCard`: Card de métrica com ícone e variação
- `TableSkeleton`: Skeleton loading para tabelas
- `TransactionSummaryGrid`: Grid de resumo de transações
- `PeriodSummaryGrid`: Resumo por período do mês
- `LookerCards`: Cards estilo Looker para métricas
- `ActiveFiltersBar`: Barra de filtros ativos

### 6.4 Comissões
- `VendedorDetalhesModal`: Modal com detalhes do vendedor

---

## 7. Edge Functions

### 7.1 calcular-comissoes
**Localização**: `supabase/functions/calcular-comissoes/index.ts`

**Input**:
```json
{
  "fechamento_id": "uuid"
}
```

**Output**:
```json
{
  "success": true,
  "message": "Comissões calculadas com sucesso",
  "data": {
    "total_vendedores": 5,
    "total_vendas": 130,
    "total_mrr": 85000,
    "meta_batida": true
  }
}
```

---

## 8. Políticas de RLS

### 8.1 Padrão para Tabelas de Dados
```sql
-- SELECT: Usuários aprovados
USING (is_user_approved(auth.uid()))

-- INSERT: Usuários aprovados
WITH CHECK (is_user_approved(auth.uid()))

-- UPDATE: Usuários aprovados
USING (is_user_approved(auth.uid()))

-- DELETE: Usuários aprovados
USING (is_user_approved(auth.uid()))
```

### 8.2 Tabelas de Usuário
```sql
-- profiles: Usuário vê apenas próprio perfil
USING (auth.uid() = user_id)

-- user_roles: Admin vê todos, usuário vê próprio
USING (is_admin(auth.uid()) OR auth.uid() = user_id)

-- permissoes_usuario: Admin vê todos, usuário vê próprio
USING (is_admin(auth.uid()) OR auth.uid() = user_id)
```

### 8.3 Tabelas de Configuração
```sql
-- modulos, funcionalidades: Aprovados leem, admins gerenciam
SELECT: is_user_approved(auth.uid())
ALL: is_admin(auth.uid())
```

---

## 9. Glossário

| Termo | Definição |
|-------|-----------|
| **MRR** | Monthly Recurring Revenue - Receita Mensal Recorrente |
| **LTV** | Lifetime Value - Valor do tempo de vida do cliente |
| **Faixa de Comissão** | Range de MRR que determina o percentual de comissão |
| **Fechamento** | Processamento mensal das vendas para cálculo de comissões |
| **Bônus Meta Equipe** | Bônus distribuído proporcionalmente quando meta é batida |
| **Bônus Meta Empresa** | Bônus fixo por colaborador quando meta é batida |
| **conta_comissao** | Flag que indica se a venda gera comissão direta |
| **conta_faixa** | Flag que indica se a venda conta para definir a faixa |
| **conta_meta** | Flag que indica se a venda conta para a meta mensal |
| **Asaas** | Gateway de pagamentos integrado via extrato |

---

## 10. Roadmap Futuro

### Fase 2 (Sugestões)
- [ ] Notificações por email para novos cadastros
- [ ] Dashboard com dados reais do banco
- [ ] Log de auditoria para ações administrativas
- [ ] Integração direta com API do Asaas
- [ ] Relatórios comparativos (YoY, MoM)
- [ ] Metas individuais por vendedor
- [ ] Gamificação com ranking de vendedores

---

## 11. Contatos

**Desenvolvido com**: Lovable AI  
**Backend**: Lovable Cloud  
**Última atualização**: Janeiro 2026

---

*Este documento é confidencial e destinado apenas para uso interno.*

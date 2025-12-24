# Regras de IA — SISMAIS (Vite + React + Supabase)

Este documento define o **stack** e **regras claras de implementação** para trabalhar neste codebase com consistência.

## Stack do projeto (resumo)
- **Vite** para servidor de desenvolvimento e build.
- **React 18 + TypeScript** para UI e lógica de aplicação.
- **React Router DOM v6** para roteamento (rotas ficam em `src/App.tsx`).
- **Tailwind CSS** para estilos (utility-first; tokens em HSL no `src/index.css`).
- **shadcn/ui + Radix UI** para componentes de UI (wrappers em `src/components/ui/*`).
- **TanStack React Query** para cache/estado de servidor (queries e mutations).
- **Supabase** (`@supabase/supabase-js`) para auth, banco e Edge Functions.
- **Zod** para validação de inputs/formulários quando necessário.
- **Recharts** para gráficos e dashboards.
- **XLSX + jsPDF (+ jspdf-autotable)** para exportações (Excel e PDF).

---

## Regras (qual biblioteca usar para quê)

### 1) Componentes de UI (obrigatório)
- Use **shadcn/ui** (em `src/components/ui/*`) como primeira opção: `Button`, `Card`, `Dialog`, `Table`, `Select`, `Tabs`, etc.
- Use o comportamento do **Radix** sempre via wrappers do shadcn (evite importar Radix direto quando já houver wrapper).
- Use **lucide-react** para ícones.

✅ Preferir: shadcn/ui + lucide-react  
🚫 Evitar: adicionar novas bibliotecas de UI (Material UI, Ant, Chakra, Bootstrap, etc.).

### 2) Estilo e design system
- Use **Tailwind CSS** para layout, espaçamento, tipografia e estados.
- Respeite os tokens do tema (HSL) no `src/index.css`:
  - cores: `bg-background`, `text-foreground`, `border-border`, `text-muted-foreground`, etc.
- Garanta responsividade com breakpoints Tailwind (`sm:`, `md:`, `lg:`).

🚫 Evite criar CSS custom grande; prefira utilitários do Tailwind.

### 3) Rotas e navegação
- Todas as rotas devem ficar em **`src/App.tsx`**.
- Use os padrões do React Router v6: `<Routes>`, `<Route>`, `<Navigate>`.
- Páginas protegidas devem usar **`<ProtectedRoute>`** e, quando aplicável, serem renderizadas dentro de **`<Layout>`**.
- A rota pública de autenticação é **`/auth`**.

✅ Use `useNavigate`, `useParams`, `useSearchParams`  
🚫 Não introduza um segundo roteador nem mova as rotas para outro lugar.

### 4) Leitura/escrita de dados (server state)
- Use **React Query** (`useQuery`, `useMutation`) para tudo que lê/grava no servidor.
- Use **query keys** descritivas (incluindo ids e filtros) e chame `invalidateQueries` após mutations.
- Mantenha queryFns pequenas e previsíveis (se possível, selecione apenas as colunas necessárias).

✅ Use: `@tanstack/react-query`  
🚫 Evite: estados globais ad-hoc para dados remotos ou misturar com outra lib de cache.

### 5) Supabase (banco, auth e functions)
- Use o cliente compartilhado:
  - `import { supabase } from "@/integrations/supabase/client";`
- Use Supabase para:
  - Auth: `supabase.auth.*`
  - CRUD: `supabase.from(...).select/insert/update/delete`
  - Edge Functions: `supabase.functions.invoke(...)`
- Tipos: prefira `Tables`, `TablesInsert`, `TablesUpdate` de `src/integrations/supabase/types.ts`.

🚫 Não crie novos clientes Supabase e não duplique o uso de envs.

### 6) Autenticação e controle de acesso
- O estado de auth é fornecido por `AuthProvider` em `src/hooks/useAuth.tsx`.
- Use `useAuth()` para obter `user/session/profile` e `isApproved`.
- Qualquer página que exige login deve passar por `ProtectedRoute`.

✅ O bloqueio de usuário não aprovado já é aplicado em `ProtectedRoute`.  
🚫 Não implemente “auth paralelo” em componentes.

### 7) Formulários e validação
- Use inputs do shadcn/ui: `Input`, `Label`, `Select`, `Checkbox`, etc.
- Use **Zod** para validar entradas do usuário.
- **react-hook-form** está disponível e deve ser usado quando o formulário for mais complexo; para casos simples, estado controlado é OK.

✅ Use: `zod` (+ opcionalmente `react-hook-form` + `@hookform/resolvers`)  
🚫 Não adicione Yup ou outras libs de validação.

### 8) Notificações (toasts)
- Use o sistema de toast existente em `src/hooks/use-toast.ts` (e os toasters já estão no `src/App.tsx`).
- Faça:
  - toast de sucesso para ações do usuário (importar/exportar/salvar)
  - toast destrutivo para erros/validação

✅ Use: `toast({ title, description, variant })`  
🚫 Não introduza outra lib de toast.

### 9) Datas, números e formatação
- Use **date-fns** para formatação e parsing.
- Atenção a timezone: neste projeto é comum usar `"T12:00:00"` ao criar `Date` a partir de `YYYY-MM-DD`.
- Para Extrato, prefira as funções em `src/lib/extratoUtils.ts` (`parseDateBR`, `formatDateBR`, `datePickerToString`).

✅ Use: `date-fns` + utilitários existentes  
🚫 Evite: Moment.js ou novas libs de datas.

### 10) Exportações e relatórios
- Use **XLSX** para exportar Excel.
- Use **jsPDF + jspdf-autotable** para exportar PDF.
- Mantenha exportações determinísticas e formatadas para pt-BR quando aplicável.

---

## Regras de estrutura do projeto
- Páginas em: `src/pages/*`
- Componentes reutilizáveis em: `src/components/*`
- Utilitários compartilhados em: `src/lib/*`
- Nomes de pastas sempre em minúsculas.

---

## Lista do que não fazer (consistência)
- Não adicionar novas libs de UI/CSS/estado/cache.
- Não mover as rotas para fora de `src/App.tsx`.
- Não bypassar React Query para leitura/escrita do Supabase na UI.
- Não criar instâncias adicionais do cliente Supabase.
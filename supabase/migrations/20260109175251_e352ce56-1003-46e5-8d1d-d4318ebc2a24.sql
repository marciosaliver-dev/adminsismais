-- Adicionar campo para armazenar IDs de colaboradores que participam do bônus de meta de equipe
ALTER TABLE public.meta_mensal 
ADD COLUMN IF NOT EXISTS colaboradores_bonus_meta uuid[] DEFAULT NULL;

-- Comentário explicativo
COMMENT ON COLUMN public.meta_mensal.colaboradores_bonus_meta IS 'Array de IDs de colaboradores que participam do bônus de meta de equipe. Se NULL, todos os colaboradores ativos participam.';
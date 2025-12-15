-- Create table for monthly goals
CREATE TABLE public.meta_mensal (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  mes_referencia DATE NOT NULL UNIQUE,
  meta_mrr NUMERIC NOT NULL DEFAULT 0,
  meta_quantidade INTEGER NOT NULL DEFAULT 0,
  observacao TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.meta_mensal ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for public access (same pattern as other tables)
CREATE POLICY "Allow public select on meta_mensal" 
ON public.meta_mensal 
FOR SELECT 
USING (true);

CREATE POLICY "Allow public insert on meta_mensal" 
ON public.meta_mensal 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Allow public update on meta_mensal" 
ON public.meta_mensal 
FOR UPDATE 
USING (true);

CREATE POLICY "Allow public delete on meta_mensal" 
ON public.meta_mensal 
FOR DELETE 
USING (true);

-- Add trigger for automatic timestamp updates
CREATE TRIGGER update_meta_mensal_updated_at
BEFORE UPDATE ON public.meta_mensal
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add comment to table
COMMENT ON TABLE public.meta_mensal IS 'Metas mensais de MRR e quantidade de vendas';
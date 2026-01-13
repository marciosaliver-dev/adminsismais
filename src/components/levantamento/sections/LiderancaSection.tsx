"use client";

import { Controller } from "react-hook-form";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Rocket, ImagePlus, X, Image as ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { QuestionField } from "../FormComponents";

interface LiderancaSectionProps {
  control: any;
  errors: any;
  watch: any;
  setValue: any;
  fileInputRef: React.RefObject<HTMLInputElement>;
  isUploading: boolean;
  handleFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => Promise<void>;
}

export function LiderancaSection({ 
  control, 
  errors, 
  watch, 
  setValue, 
  fileInputRef, 
  isUploading, 
  handleFileSelect 
}: LiderancaSectionProps) {
  const interesseLideranca = watch("interesse_lideranca");
  const satisfacaoTrabalho = watch("satisfacao_trabalho");
  const fotosSonhos = watch("fotos_sonhos") || [];

  const removeFoto = (indexToRemove: number) => {
    const newUrls = fotosSonhos.filter((_: any, index: number) => index !== indexToRemove);
    setValue("fotos_sonhos", newUrls, { shouldValidate: true });
  };

  return (
    <div className="space-y-8 mt-0 focus-visible:outline-none">
      <div className="space-y-6 p-6 border rounded-xl bg-muted/20">
        <div className="space-y-2">
          <Label className="text-lg font-bold">14. Você tem interesse em ser Líder na empresa? *</Label>
          <p className="text-xs text-muted-foreground italic mb-4">💡 Líder não é só cargo, é inspirar pessoas e cuidar do time.</p>
          <Controller name="interesse_lideranca" control={control} render={({ field }) => (
            <RadioGroup onValueChange={field.onChange} value={field.value} className="flex gap-10">
              <div className="flex items-center space-x-2"><RadioGroupItem value="sim" id="l-sim" className="w-5 h-5" /><Label htmlFor="l-sim" className="text-base">Sim</Label></div>
              <div className="flex items-center space-x-2"><RadioGroupItem value="nao" id="l-nao" className="w-5 h-5" /><Label htmlFor="l-nao" className="text-base">Não</Label></div>
            </RadioGroup>
          )} />
          {errors.interesse_lideranca && <p className="text-xs text-destructive">{errors.interesse_lideranca.message}</p>}
        </div>
        
        {interesseLideranca && (
          <QuestionField 
            label={interesseLideranca === "sim" ? "15. Por que você tem interesse em liderança?" : "15. Por que você NÃO tem interesse em liderança?"} 
            hint={interesseLideranca === "sim" ? "Fale sobre suas vontades ou o que te motiva nessa função." : "Conte pra gente o que te faz não querer ou o que te dá medo nessa função."}
            name="motivo_lideranca" 
            control={control} 
            error={errors.motivo_lideranca} 
          />
        )}

        {interesseLideranca === "sim" && (
          <QuestionField 
            label="16. O que é ser um bom líder para você?" 
            hint="Quais atitudes você admira nos seus gestores?" 
            name="papel_bom_lider" 
            control={control} 
            error={errors.papel_bom_lider} 
          />
        )}
      </div>

      <div className="grid sm:grid-cols-2 gap-6 border-t pt-8">
        <div className="space-y-2">
          <Label className="font-bold text-base">Seu Nome *</Label>
          <Controller name="colaborador_nome" control={control} render={({ field }) => <Input {...field} placeholder="Digite seu nome completo" className={cn(errors.colaborador_nome && "border-destructive")} />} />
          {errors.colaborador_nome && <p className="text-xs text-destructive">{errors.colaborador_nome.message}</p>}
        </div>
        <div className="space-y-2">
          <Label className="font-bold text-base">Sua Função Atual *</Label>
          <Controller name="funcao_atual" control={control} render={({ field }) => <Input {...field} placeholder="Ex: Analista de Suporte" className={cn(errors.funcao_atual && "border-destructive")} />} />
          {errors.funcao_atual && <p className="text-xs text-destructive">{errors.funcao_atual.message}</p>}
        </div>
      </div>

      <div className="space-y-4">
        <Label className="font-bold text-base">17. De 0 a 10, o quanto você está feliz no trabalho hoje? *</Label>
        <Controller name="satisfacao_trabalho" control={control} render={({ field }) => (
          <Select onValueChange={(v) => field.onChange(parseInt(v))} value={field.value?.toString() || ""}>
            <SelectTrigger className={cn("w-full h-12", errors.satisfacao_trabalho && "border-destructive")}><SelectValue placeholder="Selecione de 0 a 10" /></SelectTrigger>
            <SelectContent>{Array.from({ length: 11 }, (_, i) => <SelectItem key={i} value={i.toString()}>{i}</SelectItem>)}</SelectContent>
          </Select>
        )} />
        {errors.satisfacao_trabalho && <p className="text-xs text-destructive">{errors.satisfacao_trabalho.message}</p>}
        
        {satisfacaoTrabalho !== undefined && satisfacaoTrabalho < 8 && (
           <div className="mt-4 p-4 border-2 border-amber-200 bg-amber-50 rounded-xl space-y-4">
             <QuestionField 
                label="O que falta para essa nota chegar a 10?"
                hint="Sua opinião sincera nos ajuda a melhorar seu dia a dia de verdade."
                name="motivo_satisfacao_baixa"
                control={control}
                error={errors.motivo_satisfacao_baixa}
                placeholder="Conte pra gente o que está incomodando e como podemos ajudar..."
                rows={4}
             />
           </div>
        )}
      </div>

      <div className="space-y-2">
        <Label className="font-bold text-base">18. Você tem algum talento que a gente ainda não usa?</Label>
        <p className="text-xs text-muted-foreground italic mb-2">💡 Ex: 'Sou muito bom em planilhas', 'Faço design', 'Gosto de gravar vídeos'...</p>
        <Controller name="talento_oculto" control={control} render={({ field }) => <Input {...field} placeholder="Ex: Programação, Oratória, Organização..." />} />
      </div>

      <div className="mt-12 p-8 border-2 border-primary/30 rounded-3xl bg-primary/5 shadow-inner space-y-6">
        <div className="flex items-center gap-3">
           <div className="p-2 bg-primary rounded-xl text-primary-foreground shadow-lg"><Rocket className="w-6 h-6" /></div>
           <h3 className="text-2xl font-heading font-bold text-primary">O Combustível 🚀</h3>
        </div>
        
        <div className="prose prose-slate dark:prose-invert max-w-none text-muted-foreground leading-relaxed">
          <p className="text-lg">Aqui na Sismais, nós trabalhamos por sonhos.</p>
          <p>Acreditamos que a Sismais é o veículo para te levar onde você quer chegar. Para que a gente cresça junto, eu preciso saber o que faz seu olho brilhar.</p>
        </div>

        <div className="space-y-6 pt-6 border-t border-primary/20">
          <div className="flex items-start gap-2">
            <span className="text-3xl mt-1">🌟</span>
            <div className="space-y-1">
              <Label className="text-xl font-bold text-foreground leading-tight">Qual é o seu MAIOR SONHO para os próximos 5 anos? *</Label>
              <p className="text-sm text-muted-foreground italic">Pode ser qualquer coisa: casa própria, viagem, estudo, independência...</p>
            </div>
          </div>
          <Controller
            name="maior_sonho"
            control={control}
            render={({ field }) => (
              <Textarea 
                {...field} 
                rows={6} 
                placeholder="Escreva aqui sobre seus planos e sonhos pessoais..." 
                className={cn("bg-background text-lg p-5 border-primary/20 focus:border-primary rounded-xl shadow-sm min-h-[150px]", errors.maior_sonho && "border-destructive")}
              />
            )}
          />
          {errors.maior_sonho && <p className="text-xs text-destructive font-medium">{errors.maior_sonho.message}</p>}

          <div className="space-y-4 pt-4">
            <div className="flex items-center gap-2">
              <ImageIcon className="w-5 h-5 text-primary" />
              <Label className="text-lg font-bold">Mural dos Sonhos (Fotos)</Label>
            </div>
            <p className="text-sm text-muted-foreground italic">Coloque fotos que te inspirem! Pode ser o destino de uma viagem, uma casa, um carro ou sua família.</p>
            
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {fotosSonhos.map((url: string, index: number) => (
                <div key={index} className="relative group aspect-square rounded-xl overflow-hidden border bg-muted shadow-sm">
                  <img src={url} alt={`Sonho ${index + 1}`} className="w-full h-full object-cover transition-transform group-hover:scale-110" />
                  <button
                    type="button"
                    onClick={() => removeFoto(index)}
                    className="absolute top-1 right-1 p-1 bg-destructive text-destructive-foreground rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
              
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="flex flex-col items-center justify-center aspect-square rounded-xl border-2 border-dashed border-primary/30 bg-primary/5 hover:bg-primary/10 hover:border-primary transition-all gap-2"
              >
                {isUploading ? (
                  <Loader2 className="w-6 h-6 animate-spin text-primary" />
                ) : (
                  <>
                    <ImagePlus className="w-6 h-6 text-primary" />
                    <span className="text-[10px] sm:text-xs font-medium text-primary">Adicionar Foto</span>
                  </>
                )}
              </button>
            </div>
            <input
              type="file"
              ref={fileInputRef}
              className="hidden"
              accept="image/*"
              multiple
              onChange={handleFileSelect}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
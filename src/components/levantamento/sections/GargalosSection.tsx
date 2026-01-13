"use client";

import { Controller } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { QuestionField } from "../FormComponents";

export function GargalosSection({ control, errors }: { control: any; errors: any }) {
  return (
    <div className="space-y-8 mt-0 focus-visible:outline-none">
      <QuestionField 
        label="5. Liste suas 5 principais atividades (as mais importantes)"
        hint="O que é the 'coração' do seu trabalho hoje?"
        name="atividades_top5"
        control={control}
        error={errors.atividades_top5}
      />
      <QuestionField 
        label="6. O que mais 'rouba seu tempo' hoje?"
        hint="Tarefas chatas ou manuais que te impedem de focar no que dá resultado."
        name="ladrao_tempo"
        control={control}
        error={errors.ladrao_tempo}
      />
      <div className="space-y-2">
        <Label className="text-base font-semibold">7. Quais ferramentas você usa todo dia?</Label>
        <p className="text-xs text-muted-foreground italic mb-2">💡 Ex: Excel, Sistemas, WhatsApp, Planilhas específicas...</p>
        <Controller 
          name="ferramentas_uso" 
          control={control} 
          render={({ field }) => <Input {...field} className={cn(errors.ferramentas_uso && "border-destructive")} />} 
        />
        {errors.ferramentas_uso && <p className="text-xs text-destructive">{errors.ferramentas_uso.message}</p>}
      </div>
      <QuestionField 
        label="8. Quem depende do seu trabalho e de quem você depende?"
        hint="Como sua entrega chega em outras pessoas (ou vice-versa)?"
        name="interdependencias"
        control={control}
        error={errors.interdependencias}
      />
      <div className="grid sm:grid-cols-3 gap-6 p-4 bg-muted/30 rounded-xl border">
        <QuestionField label="START (Começar)" hint="O que deveríamos começar a fazer para melhorar?" name="start_action" control={control} error={errors.start_action} rows={2} />
        <QuestionField label="STOP (Parar)" hint="O que deveríamos parar de fazer por ser ineficiente?" name="stop_action" control={control} error={errors.stop_action} rows={2} />
        <QuestionField label="CONTINUE (Manter)" hint="O que está funcionando muito bem e deve continuar?" name="continue_action" control={control} error={errors.continue_action} rows={2} />
      </div>
      <QuestionField 
        label="9. Qual a maior reclamação que você ouve dos clientes?"
        hint="O que o cliente mais 'chora' ou pede no dia a dia?"
        name="reclamacao_cliente"
        control={control}
        error={errors.reclamacao_cliente}
      />
      <QuestionField 
        label="10. Se você mandasse, quais seriam as 5 prioridades do seu setor?"
        hint="O que você atacaria primeiro para a Sismais crescer rápido?"
        name="prioridades_setor"
        control={control}
        error={errors.prioridades_setor}
      />
    </div>
  );
}
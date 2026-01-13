"use client";

import { QuestionField } from "../FormComponents";

export function RotinaSection({ control, errors }: { control: any; errors: any }) {
  return (
    <div className="space-y-8 mt-0 focus-visible:outline-none">
      <QuestionField 
        label="1. Como é o seu dia a dia na Sismais (desde quando chega até ir embora)?"
        hint="Conte o que você faz: horários, reuniões e as tarefas que mais se repetem."
        name="rotina_diaria"
        control={control}
        error={errors.rotina_diaria}
        placeholder="Ex: Chego às 8h, verifico o dashboard, respondo tickets de urgência, faço reunião com time..."
      />
      <QuestionField 
        label="2. Na sua visão, o que a empresa espera do seu trabalho?"
        hint="Quais resultados você acha que a gestão mais valoriza na sua função?"
        name="expectativa_empresa"
        control={control}
        error={errors.expectativa_empresa}
      />
      <QuestionField 
        label="3. Para você, o que define se você fez um bom trabalho no final do dia?"
        hint="O que te dá aquela sensação de 'dever cumprido'?"
        name="definicao_sucesso"
        control={control}
        error={errors.definicao_sucesso}
      />
      <QuestionField 
        label="4. Você se sente valorizado? Por quê?"
        hint="Fale sobre o ambiente, reconhecimento e o apoio que você recebe."
        name="sentimento_valorizacao"
        control={control}
        error={errors.sentimento_valorizacao}
      />
    </div>
  );
}
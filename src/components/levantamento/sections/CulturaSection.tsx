"use client";

import { QuestionField, RatingInput } from "../FormComponents";

export function CulturaSection({ control, errors }: { control: any; errors: any }) {
  return (
    <div className="space-y-8 mt-0 focus-visible:outline-none">
      <QuestionField 
        label="11. O que não pode faltar no plano da Sismais para 2026?"
        hint="Dê sugestões sobre tecnologia, pessoas, espaço ou novos produtos."
        name="falta_plano_2026"
        control={control}
        error={errors.falta_plano_2026}
      />
      <QuestionField 
        label="12. O que você acha que faltou para batermos as metas de 2025?"
        hint="Seja sincero sobre os obstáculos que atrapalharam o time."
        name="falta_metas_2025"
        control={control}
        error={errors.falta_metas_2025}
      />
      <QuestionField 
        label="13. Como você se vê quando a empresa tiver 10.000 clientes?"
        hint="Imagine a gente grande: onde e como você quer estar?"
        name="visao_papel_10k"
        control={control}
        error={errors.visao_papel_10k}
      />
      <div className="grid sm:grid-cols-2 gap-8 p-6 border rounded-2xl bg-primary/5">
        <RatingInput 
          label="Autonomia" 
          hint="Liberdade para decidir como fazer suas tarefas (1 = Mandado, 5 = Decido sozinho)"
          name="score_autonomia" 
          control={control} 
          error={errors.score_autonomia?.message} 
        />
        <RatingInput 
          label="Maestria" 
          hint="O quanto você sente que está evoluindo e aprendendo (1 = Estagnado, 5 = Referência)"
          name="score_maestria" 
          control={control} 
          error={errors.score_maestria?.message} 
        />
        <RatingInput 
          label="Propósito" 
          hint="O quanto seu trabalho faz diferença na missão da empresa (1 = Só um número, 5 = Faço parte do sonho)"
          name="score_proposito" 
          control={control} 
          error={errors.score_proposito?.message} 
        />
        <RatingInput 
          label="Financeiro" 
          hint="Justiça da sua remuneração e bônus (1 = Desvalorizado, 5 = Valor justo)"
          name="score_financeiro" 
          control={control} 
          error={errors.score_financeiro?.message} 
        />
        <RatingInput 
          label="Ambiente" 
          hint="Clima com os colegas e infraestrutura (1 = Tenso/Ruim, 5 = Leve/Excelente)"
          name="score_ambiente" 
          control={control} 
          error={errors.score_ambiente?.message} 
        />
      </div>
    </div>
  );
}
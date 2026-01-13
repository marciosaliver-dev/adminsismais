"use client";

import { Controller } from "react-hook-form";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { FormData } from "./form-schema";

export const RatingInput = ({ label, hint, name, control, error }: { label: string; hint: string; name: keyof FormData; control: any; error: string | undefined }) => (
  <div className="space-y-2">
    <Label className="flex flex-col font-medium">
      <span className="text-base font-semibold">{label}</span>
      <span className="text-xs text-muted-foreground font-normal italic">💡 {hint}</span>
    </Label>
    <Controller
      name={name}
      control={control}
      render={({ field }) => (
        <RadioGroup 
          onValueChange={(v) => field.onChange(parseInt(v))} 
          value={field.value?.toString() || ""} 
          className="flex justify-between p-3 border rounded-xl bg-muted/30 mt-2"
        >
          {[1, 2, 3, 4, 5].map((s) => (
            <div key={s} className="flex flex-col items-center space-y-1">
              <Label htmlFor={`${name}-${s}`} className="text-xs text-muted-foreground">{s}</Label>
              <RadioGroupItem value={s.toString()} id={`${name}-${s}`} className="w-6 h-6" />
            </div>
          ))}
        </RadioGroup>
      )}
    />
    {error && <p className="text-xs text-destructive">{error}</p>}
  </div>
);

export const QuestionField = ({ label, hint, name, control, error, placeholder, rows = 3 }: { label: string; hint: string; name: keyof FormData; control: any; error: any; placeholder?: string; rows?: number }) => (
  <div className="space-y-2">
    <Label className="text-base font-semibold">{label}</Label>
    <p className="text-xs text-muted-foreground italic mb-2">💡 {hint}</p>
    <Controller
      name={name}
      control={control}
      render={({ field }) => (
        <Textarea {...field} rows={rows} placeholder={placeholder} className={cn(error && "border-destructive")} />
      )}
    />
    {error && <p className="text-xs text-destructive">{error.message}</p>}
  </div>
);
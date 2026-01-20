import { Badge } from "@/components/ui/badge";
import { Trophy, Flame, Star, Target } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface Props {
  metasAtingidas: number;
  streak: number;
  mvp?: boolean;
}

export function AchievementBadges({ metasAtingidas, streak, mvp }: Props) {
  return (
    <TooltipProvider>
      <div className="flex flex-wrap gap-3 mb-6">
        {metasAtingidas > 0 && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Badge className="bg-amber-100 text-amber-700 border-amber-200 hover:bg-amber-100 cursor-help py-1.5 px-3 gap-2 rounded-xl">
                <Trophy className="w-4 h-4 fill-amber-500" />
                <span className="font-bold">{metasAtingidas} metas atingidas</span>
              </Badge>
            </TooltipTrigger>
            <TooltipContent>Parabéns! Você alcançou 100% ou mais em {metasAtingidas} KRs.</TooltipContent>
          </Tooltip>
        )}

        {streak > 0 && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Badge className="bg-orange-100 text-orange-700 border-orange-200 hover:bg-orange-100 cursor-help py-1.5 px-3 gap-2 rounded-xl">
                <Flame className="w-4 h-4 fill-orange-500" />
                <span className="font-bold">{streak} dias de consistência</span>
              </Badge>
            </TooltipTrigger>
            <TooltipContent>Você realizou lançamentos em {streak} dias nos últimos 30 dias.</TooltipContent>
          </Tooltip>
        )}

        {mvp && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Badge className="bg-purple-100 text-purple-700 border-purple-200 hover:bg-purple-100 cursor-help py-1.5 px-3 gap-2 rounded-xl">
                <Star className="w-4 h-4 fill-purple-500" />
                <span className="font-bold">Destaque do Mês</span>
              </Badge>
            </TooltipTrigger>
            <TooltipContent>Seu progresso médio é o maior da sua área!</TooltipContent>
          </Tooltip>
        )}
      </div>
    </TooltipProvider>
  );
}
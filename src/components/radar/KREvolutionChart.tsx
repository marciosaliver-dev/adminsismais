import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Area,
  AreaChart,
} from "recharts";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

interface ChartData {
  data: string;
  valor: number;
}

interface KREvolutionChartProps {
  data: ChartData[];
  meta: number;
  unidade: string;
}

export function KREvolutionChart({ data, meta, unidade }: KREvolutionChartProps) {
  // Ordenar dados por data para o gráfico
  const sortedData = [...data].sort((a, b) => a.data.localeCompare(b.data))
    .map(d => ({
      ...d,
      formattedDate: format(parseISO(d.data), "dd/MM", { locale: ptBR }),
    }));

  if (sortedData.length === 0) return null;

  return (
    <div className="h-64 w-full mt-4">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={sortedData}>
          <defs>
            <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#45E5E5" stopOpacity={0.3}/>
              <stop offset="95%" stopColor="#45E5E5" stopOpacity={0}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
          <XAxis 
            dataKey="formattedDate" 
            fontSize={12} 
            tickLine={false} 
            axisLine={false} 
          />
          <YAxis 
            fontSize={12} 
            tickLine={false} 
            axisLine={false} 
            tickFormatter={(value) => `${value}`}
          />
          <Tooltip 
            contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
            formatter={(value) => [`${value} ${unidade}`, 'Valor']}
            labelFormatter={(label) => `Data: ${label}`}
          />
          <ReferenceLine y={meta} stroke="#FFB800" strokeDasharray="5 5" label={{ value: 'Meta', position: 'insideRight', fill: '#FFB800', fontSize: 10 }} />
          <Area 
            type="monotone" 
            dataKey="valor" 
            stroke="#45E5E5" 
            strokeWidth={3} 
            fillOpacity={1} 
            fill="url(#colorValue)" 
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
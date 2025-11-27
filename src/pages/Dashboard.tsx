import { MetricCard } from "@/components/dashboard/MetricCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DollarSign,
  TrendingUp,
  Users,
  TrendingDown,
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

const mrrData = [
  { month: "Jan", mrr: 45000, churn: 2.5 },
  { month: "Fev", mrr: 52000, churn: 2.1 },
  { month: "Mar", mrr: 58000, churn: 1.8 },
  { month: "Abr", mrr: 62000, churn: 2.3 },
  { month: "Mai", mrr: 68000, churn: 1.9 },
  { month: "Jun", mrr: 75000, churn: 1.6 },
];

const cohortData = [
  { cohort: "Jan 24", retention: 100 },
  { cohort: "Fev 24", retention: 92 },
  { cohort: "Mar 24", retention: 88 },
  { cohort: "Abr 24", retention: 85 },
  { cohort: "Mai 24", retention: 90 },
  { cohort: "Jun 24", retention: 95 },
];

const revenueByCategory = [
  { category: "Plano Basic", value: 25000 },
  { category: "Plano Pro", value: 35000 },
  { category: "Plano Enterprise", value: 15000 },
];

export default function Dashboard() {
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-heading font-bold text-foreground mb-2">
          Dashboard
        </h1>
        <p className="text-muted-foreground">
          Visão geral das métricas do seu negócio
        </p>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          title="MRR (Receita Mensal)"
          value="R$ 75.000"
          change="+10.3% vs mês anterior"
          changeType="increase"
          icon={DollarSign}
          iconBgColor="bg-primary/10"
        />
        <MetricCard
          title="Churn Rate"
          value="1.6%"
          change="-0.3% vs mês anterior"
          changeType="increase"
          icon={TrendingDown}
          iconBgColor="bg-destructive/10"
        />
        <MetricCard
          title="LTV Médio"
          value="R$ 12.500"
          change="+5.2% vs mês anterior"
          changeType="increase"
          icon={TrendingUp}
          iconBgColor="bg-success/10"
        />
        <MetricCard
          title="Clientes Ativos"
          value="342"
          change="+23 novos este mês"
          changeType="increase"
          icon={Users}
          iconBgColor="bg-info/10"
        />
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* MRR Trend */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-primary" />
              Evolução MRR & Churn
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={mrrData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis
                  dataKey="month"
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={12}
                />
                <YAxis
                  yAxisId="left"
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={12}
                />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={12}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                  }}
                />
                <Legend />
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="mrr"
                  stroke="hsl(var(--primary))"
                  strokeWidth={3}
                  name="MRR (R$)"
                  dot={{ fill: "hsl(var(--primary))", r: 4 }}
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="churn"
                  stroke="hsl(var(--destructive))"
                  strokeWidth={3}
                  name="Churn (%)"
                  dot={{ fill: "hsl(var(--destructive))", r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Cohort Retention */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5 text-primary" />
              Retenção por Cohort (6 meses)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={cohortData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis
                  dataKey="cohort"
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={12}
                />
                <YAxis
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={12}
                  domain={[0, 100]}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                  }}
                  formatter={(value) => [`${value}%`, "Retenção"]}
                />
                <Bar
                  dataKey="retention"
                  fill="hsl(var(--primary))"
                  radius={[8, 8, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Revenue by Category */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-primary" />
              Receita por Categoria de Plano
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={revenueByCategory}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis
                  dataKey="category"
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={12}
                />
                <YAxis
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={12}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                  }}
                  formatter={(value) => [`R$ ${value}`, "Receita"]}
                />
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke="hsl(var(--primary))"
                  fill="hsl(var(--primary))"
                  fillOpacity={0.6}
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Quick Stats */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-primary" />
              Métricas Rápidas
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">ARPU</p>
                <p className="text-xl font-heading font-bold">R$ 219</p>
              </div>
              <ArrowUpRight className="w-5 h-5 text-success" />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">CAC</p>
                <p className="text-xl font-heading font-bold">R$ 850</p>
              </div>
              <ArrowDownRight className="w-5 h-5 text-destructive" />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Payback</p>
                <p className="text-xl font-heading font-bold">3.9 meses</p>
              </div>
              <ArrowDownRight className="w-5 h-5 text-success" />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Taxa Conversão</p>
                <p className="text-xl font-heading font-bold">24.5%</p>
              </div>
              <ArrowUpRight className="w-5 h-5 text-success" />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

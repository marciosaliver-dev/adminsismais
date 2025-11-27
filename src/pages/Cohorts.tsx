import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Upload, Download, TrendingUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const cohortMatrix = [
  { cohort: "Jan 24", m0: 100, m1: 92, m2: 88, m3: 85, m4: 83, m5: 81, customers: 45 },
  { cohort: "Fev 24", m0: 100, m1: 94, m2: 89, m3: 87, m4: 85, m5: null, customers: 52 },
  { cohort: "Mar 24", m0: 100, m1: 95, m2: 91, m3: 88, m4: null, m5: null, customers: 58 },
  { cohort: "Abr 24", m0: 100, m1: 93, m2: 90, m3: null, m4: null, m5: null, customers: 48 },
  { cohort: "Mai 24", m0: 100, m1: 96, m2: null, m3: null, m4: null, m5: null, customers: 61 },
  { cohort: "Jun 24", m0: 100, m1: null, m2: null, m3: null, m4: null, m5: null, customers: 67 },
];

const getColorIntensity = (value: number | null) => {
  if (value === null) return "bg-muted";
  if (value >= 95) return "bg-success text-success-foreground";
  if (value >= 90) return "bg-success/70 text-success-foreground";
  if (value >= 85) return "bg-primary/50 text-foreground";
  if (value >= 80) return "bg-warning/50 text-foreground";
  return "bg-destructive/50 text-foreground";
};

export default function Cohorts() {
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-heading font-bold text-foreground mb-2">
            Análise de Cohorts
          </h1>
          <p className="text-muted-foreground">
            Acompanhe a retenção de clientes ao longo do tempo
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="gap-2">
            <Upload className="w-4 h-4" />
            Importar Dados
          </Button>
          <Button className="gap-2">
            <Download className="w-4 h-4" />
            Exportar
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Retenção Média (M1)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-heading font-bold">94.2%</span>
              <Badge variant="outline" className="text-success border-success">
                +2.1%
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Retenção Média (M3)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-heading font-bold">87.8%</span>
              <Badge variant="outline" className="text-success border-success">
                +1.5%
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total de Clientes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-heading font-bold">331</span>
              <span className="text-sm text-muted-foreground">ativos</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Cohort Matrix */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-primary" />
              Matriz de Retenção
            </CardTitle>
            <div className="text-sm text-muted-foreground">
              Valores em % de retenção
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left p-3 text-sm font-semibold text-foreground">
                    Cohort
                  </th>
                  <th className="text-right p-3 text-sm font-semibold text-foreground">
                    Clientes
                  </th>
                  <th className="text-center p-3 text-sm font-semibold text-foreground">
                    M0
                  </th>
                  <th className="text-center p-3 text-sm font-semibold text-foreground">
                    M1
                  </th>
                  <th className="text-center p-3 text-sm font-semibold text-foreground">
                    M2
                  </th>
                  <th className="text-center p-3 text-sm font-semibold text-foreground">
                    M3
                  </th>
                  <th className="text-center p-3 text-sm font-semibold text-foreground">
                    M4
                  </th>
                  <th className="text-center p-3 text-sm font-semibold text-foreground">
                    M5
                  </th>
                </tr>
              </thead>
              <tbody>
                {cohortMatrix.map((row) => (
                  <tr key={row.cohort} className="border-b border-border hover:bg-muted/50">
                    <td className="p-3 font-medium">{row.cohort}</td>
                    <td className="p-3 text-right text-muted-foreground">
                      {row.customers}
                    </td>
                    <td className="p-2">
                      <div
                        className={`text-center py-2 px-3 rounded font-semibold ${getColorIntensity(
                          row.m0
                        )}`}
                      >
                        {row.m0}%
                      </div>
                    </td>
                    <td className="p-2">
                      {row.m1 && (
                        <div
                          className={`text-center py-2 px-3 rounded font-semibold ${getColorIntensity(
                            row.m1
                          )}`}
                        >
                          {row.m1}%
                        </div>
                      )}
                    </td>
                    <td className="p-2">
                      {row.m2 && (
                        <div
                          className={`text-center py-2 px-3 rounded font-semibold ${getColorIntensity(
                            row.m2
                          )}`}
                        >
                          {row.m2}%
                        </div>
                      )}
                    </td>
                    <td className="p-2">
                      {row.m3 && (
                        <div
                          className={`text-center py-2 px-3 rounded font-semibold ${getColorIntensity(
                            row.m3
                          )}`}
                        >
                          {row.m3}%
                        </div>
                      )}
                    </td>
                    <td className="p-2">
                      {row.m4 && (
                        <div
                          className={`text-center py-2 px-3 rounded font-semibold ${getColorIntensity(
                            row.m4
                          )}`}
                        >
                          {row.m4}%
                        </div>
                      )}
                    </td>
                    <td className="p-2">
                      {row.m5 && (
                        <div
                          className={`text-center py-2 px-3 rounded font-semibold ${getColorIntensity(
                            row.m5
                          )}`}
                        >
                          {row.m5}%
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Legend */}
          <div className="flex flex-wrap items-center gap-4 mt-6 pt-4 border-t border-border">
            <div className="text-sm font-medium text-muted-foreground">Legenda:</div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-6 rounded bg-success"></div>
              <span className="text-sm">≥95%</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-6 rounded bg-success/70"></div>
              <span className="text-sm">90-94%</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-6 rounded bg-primary/50"></div>
              <span className="text-sm">85-89%</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-6 rounded bg-warning/50"></div>
              <span className="text-sm">80-84%</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-6 rounded bg-destructive/50"></div>
              <span className="text-sm">&lt;80%</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Insights Card */}
      <Card className="border-l-4 border-l-primary">
        <CardHeader>
          <CardTitle className="text-lg">💡 Insights Principais</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="text-sm">
            • A retenção no primeiro mês (M1) está excelente, com média de{" "}
            <strong>94.2%</strong>
          </p>
          <p className="text-sm">
            • O cohort de <strong>Mai 24</strong> apresenta a melhor retenção M1:{" "}
            <strong>96%</strong>
          </p>
          <p className="text-sm">
            • Observa-se uma queda média de <strong>6-8%</strong> entre M1 e M3
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

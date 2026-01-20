import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function DashboardSkeleton() {
  return (
    <div className="space-y-8 animate-pulse">
      {/* KPI Skeletons */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map(i => (
          <Card key={i}><CardContent className="p-6 flex items-center justify-between">
            <div className="space-y-2"><Skeleton className="h-4 w-24" /><Skeleton className="h-8 w-16" /></div>
            <Skeleton className="h-12 w-12 rounded-xl" />
          </CardContent></Card>
        ))}
      </div>

      {/* Content Skeletons */}
      <div className="space-y-6">
        {[1, 2].map(section => (
          <div key={section} className="space-y-4">
            <Skeleton className="h-6 w-32" />
            <div className="grid gap-4">
              {[1, 2].map(card => (
                <Card key={card}><CardHeader className="p-6 space-y-4">
                  <div className="flex justify-between"><Skeleton className="h-5 w-2/3" /><Skeleton className="h-8 w-8 rounded-full" /></div>
                  <Skeleton className="h-3 w-full rounded-full" />
                </CardHeader></Card>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LucideIcon } from "lucide-react";

interface ScoreCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  trend?: string;
  description?: string;
}

export function ScoreCard({ title, value, icon: Icon, trend, description }: ScoreCardProps) {
  return (
    <Card className="hover:shadow-lg transition-all duration-200 hover:-translate-y-0.5 h-full">
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground leading-tight">
              {title}
            </p>
          </div>
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary-soft">
            <Icon className="h-4 w-4 text-primary" />
          </div>
        </div>
        
        <div className="text-3xl font-bold text-foreground mb-2 tracking-tight break-words">
          {value}
        </div>
        
        {trend && (
          <p className="text-xs text-muted-foreground leading-relaxed">
            {trend}
          </p>
        )}
        
        {description && (
          <p className="text-xs text-muted-foreground leading-relaxed mt-1">
            {description}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

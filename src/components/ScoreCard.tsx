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
    <Card className="hover:shadow-lg transition-all duration-200 hover:-translate-y-0.5 overflow-hidden">
      <CardContent className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
              {title}
            </p>
          </div>
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-soft">
            <Icon className="h-5 w-5 text-primary" />
          </div>
        </div>
        
        <div className="text-4xl font-bold text-foreground mb-3 tracking-tight">
          {value}
        </div>
        
        {trend && (
          <p className="text-sm text-muted-foreground">
            {trend}
          </p>
        )}
        
        {description && (
          <p className="text-sm text-muted-foreground leading-relaxed">
            {description}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

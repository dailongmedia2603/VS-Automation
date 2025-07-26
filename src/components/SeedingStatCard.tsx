import { Card, CardContent } from "@/components/ui/card";
import { LucideIcon } from "lucide-react";

interface SeedingStatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  color: string;
}

export const SeedingStatCard = ({ title, value, icon: Icon, color }: SeedingStatCardProps) => {
  return (
    <Card className="shadow-sm rounded-2xl bg-white">
      <CardContent className="p-5 flex items-center gap-4">
        <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${color}`}>
          <Icon className="h-6 w-6 text-white" />
        </div>
        <div>
          <p className="text-sm text-muted-foreground">{title}</p>
          <p className="text-2xl font-bold">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
};
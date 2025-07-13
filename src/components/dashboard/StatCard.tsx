import { Card, CardContent } from "@/components/ui/card";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";

interface StatCardProps {
  title: string;
  value: string;
  total?: number;
  progress: number;
  color: string;
}

export const StatCard = ({ title, value, total, progress, color }: StatCardProps) => {
  const data = [
    { name: "Progress", value: progress },
    { name: "Remaining", value: 100 - progress },
  ];

  return (
    <Card className="p-4 flex items-center space-x-4 bg-gray-100/80 rounded-xl border-none shadow-none">
      <div className="w-12 h-12">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={18}
              outerRadius={24}
              startAngle={90}
              endAngle={450}
              paddingAngle={0}
              dataKey="value"
              stroke="none"
            >
              <Cell fill={color} />
              <Cell fill="#E5E7EB" />
            </Pie>
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div>
        <p className="text-sm text-muted-foreground">{title}</p>
        <p className="text-lg font-bold">
          {value}
          {total && <span className="text-sm text-muted-foreground font-normal">/{total}</span>}
        </p>
      </div>
    </Card>
  );
};
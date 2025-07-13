import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Bar,
  BarChart as RechartsBarChart,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts";

const data = [
  { time: "12:00", value: 12000 },
  { time: "13:00", value: 21230 },
  { time: "14:00", value: 8000 },
  { time: "15:00", value: 16000 },
  { time: "16:00", value: 14000 },
  { time: "17:00", value: 23000 },
];

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-gray-900 text-white p-2 rounded-md shadow-lg">
        <p className="font-bold">{`$${payload[0].value.toLocaleString()}`}</p>
      </div>
    );
  }
  return null;
};

export const AnalyticsChart = () => {
  return (
    <Card className="shadow-sm rounded-2xl bg-white">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Analytic</CardTitle>
        <Button variant="link" className="text-blue-600">View All</Button>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <RechartsBarChart data={data} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
            <XAxis
              dataKey="time"
              stroke="#888888"
              fontSize={12}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              stroke="#888888"
              fontSize={12}
              tickLine={false}
              axisLine={false}
              tickFormatter={(value) => `$${value / 1000}k`}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(59, 130, 246, 0.1)', radius: 10 }} />
            <Bar dataKey="value" fill="#3B82F6" radius={[10, 10, 10, 10]} />
          </RechartsBarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};
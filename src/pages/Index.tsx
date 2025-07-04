import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { BarChart, FileText, Users, Zap } from "lucide-react";
import {
  Bar,
  BarChart as RechartsBarChart,
  CartesianGrid,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  Pie,
  PieChart,
  Cell,
} from "recharts";

// Dữ liệu mẫu
const stats = [
  { title: "Tổng số dự án", value: "128", icon: FileText, change: "+12.5%" },
  {
    title: "Từ đã tạo (Tháng này)",
    value: "1.2M",
    icon: Zap,
    change: "+20.1%",
  },
  {
    title: "Người dùng hoạt động",
    value: "86",
    icon: Users,
    change: "-2.4%",
  },
  {
    title: "Tỷ lệ hoàn thành",
    value: "92.8%",
    icon: BarChart,
    change: "+5.2%",
  },
];

const chartData = [
  { month: "Tháng 1", words: 45000 },
  { month: "Tháng 2", words: 62000 },
  { month: "Tháng 3", words: 81000 },
  { month: "Tháng 4", words: 74000 },
  { month: "Tháng 5", words: 98000 },
  { month: "Tháng 6", words: 112000 },
];

const pieData = [
  { name: "Bài đăng Blog", value: 400 },
  { name: "Mạng xã hội", value: 300 },
  { name: "Email Marketing", value: 300 },
  { name: "Mô tả sản phẩm", value: 200 },
];
const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042"];

const recentProjects = [
  {
    id: "PROJ-001",
    name: "Chiến dịch Marketing Mùa Hè",
    status: "Hoàn thành",
    words: "15,200",
  },
  {
    id: "PROJ-002",
    name: "Bài viết Blog hàng tuần",
    status: "Đang tiến hành",
    words: "8,500",
  },
  {
    id: "PROJ-003",
    name: "Nội dung cho Website mới",
    status: "Hoàn thành",
    words: "25,000",
  },
  {
    id: "PROJ-004",
    name: "Kịch bản Video Giới thiệu",
    status: "Đang xét duyệt",
    words: "3,100",
  },
  {
    id: "PROJ-005",
    name: "Email cho Khách hàng mới",
    status: "Đang tiến hành",
    words: "1,800",
  },
];

const Index = () => {
  return (
    <main className="flex-1 space-y-4 p-4 sm:p-6 md:p-8 bg-zinc-100 dark:bg-background">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat, index) => (
          <Card key={index}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {stat.title}
              </CardTitle>
              <stat.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <p className="text-xs text-muted-foreground">
                {stat.change} so với tháng trước
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4">
          <CardHeader>
            <CardTitle>Tổng quan số từ đã tạo</CardTitle>
          </CardHeader>
          <CardContent className="pl-2">
            <ResponsiveContainer width="100%" height={350}>
              <RechartsBarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="month"
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
                  tickFormatter={(value) => `${Number(value) / 1000}k`}
                />
                <Tooltip />
                <Legend />
                <Bar
                  dataKey="words"
                  fill="hsl(var(--primary))"
                  name="Số từ"
                  radius={[4, 4, 0, 0]}
                />
              </RechartsBarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card className="col-span-4 lg:col-span-3">
          <CardHeader>
            <CardTitle>Phân loại nội dung</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={350}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  outerRadius={120}
                  fill="#8884d8"
                  dataKey="value"
                  label={({ name, percent }) =>
                    `${name} ${(percent * 100).toFixed(0)}%`
                  }
                >
                  {pieData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={COLORS[index % COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Dự án gần đây</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Mã dự án</TableHead>
                <TableHead>Tên dự án</TableHead>
                <TableHead>Trạng thái</TableHead>
                <TableHead className="text-right">Số từ</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recentProjects.map((project) => (
                <TableRow key={project.id}>
                  <TableCell className="font-medium">{project.id}</TableCell>
                  <TableCell>{project.name}</TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        project.status === "Hoàn thành"
                          ? "default"
                          : project.status === "Đang tiến hành"
                          ? "secondary"
                          : "outline"
                      }
                    >
                      {project.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">{project.words}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </main>
  );
};

export default Index;
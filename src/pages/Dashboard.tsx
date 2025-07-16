import { AnalyticsChart } from "@/components/dashboard/AnalyticsChart";
import { ClientReviewCard } from "@/components/dashboard/ClientReviewCard";
import { StatCard } from "@/components/dashboard/StatCard";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Heart, ShoppingBag, Volume2 } from "lucide-react";

const Dashboard = () => {
  return (
    <main className="flex-1 space-y-6 p-6 sm:p-8">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Welcome Card */}
          <Card className="shadow-sm rounded-2xl bg-white">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Hello, Mr. Dough</p>
                <CardTitle className="text-2xl md:text-3xl font-bold">Store your data safe and fast</CardTitle>
              </div>
              <div className="flex items-center space-x-2">
                  <Button variant="outline" size="icon" className="rounded-full border-gray-200 bg-white hover:bg-gray-100">
                      <Heart className="h-5 w-5 text-gray-500" />
                  </Button>
                  <Button variant="outline" size="icon" className="rounded-full border-gray-200 bg-white hover:bg-gray-100">
                      <ShoppingBag className="h-5 w-5 text-gray-500" />
                  </Button>
                  <Button variant="outline" size="icon" className="rounded-full border-gray-200 bg-white hover:bg-gray-100">
                      <Volume2 className="h-5 w-5 text-gray-500" />
                  </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex space-x-2">
                <Button className="bg-blue-100 text-blue-700 hover:bg-blue-200 font-semibold rounded-lg">General</Button>
                <Button variant="ghost" className="text-muted-foreground hover:bg-gray-100 rounded-lg">My File</Button>
                <Button variant="ghost" className="text-muted-foreground hover:bg-gray-100 rounded-lg">Shared with me</Button>
              </div>
            </CardContent>
          </Card>

          {/* Analytics Card */}
          <AnalyticsChart />
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          {/* Today Task Card */}
          <Card className="shadow-sm rounded-2xl bg-white">
            <CardHeader>
              <CardTitle>Today Task</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-4">
              <StatCard title="Make Sales" value="12" total={24} progress={50} color="#34D399" />
              <StatCard title="Revenue" value="$21,200" progress={75} color="#60A5FA" />
              <StatCard title="New" value="6" total={15} progress={40} color="#FBBF24" />
              <StatCard title="Data" value="24,231" progress={60} color="#F87171" />
            </CardContent>
          </Card>

          {/* Client Review Card */}
          <ClientReviewCard />
        </div>
      </div>
    </main>
  );
};

export default Dashboard;
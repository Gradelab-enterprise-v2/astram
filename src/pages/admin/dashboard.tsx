import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Users,
  CreditCard,
  FileText,
  CheckCircle,
  DollarSign,
} from "lucide-react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

interface DashboardStats {
  totalUsers: number;
  activePlans: number;
  questionsGenerated: number;
  papersGraded: number;
  monthlyRevenue: number;
}

interface UsageData {
  date: string;
  questions: number;
  grades: number;
}

export function AdminDashboard() {
  const { data: stats, isLoading: isStatsLoading } = useQuery({
    queryKey: ["admin", "dashboard", "stats"],
    queryFn: async (): Promise<DashboardStats> => {
      const [
        { count: totalUsers },
        { count: activePlans },
        { data: questionsData },
        { data: papersData },
        { data: revenueData },
      ] = await Promise.all([
        supabase.from("users").select("*", { count: "exact" }),
        supabase
          .from("users")
          .select("*", { count: "exact" })
          .not("current_plan_id", "is", null),
        supabase.from("users").select("questions_generated"),
        supabase.from("users").select("papers_graded"),
        supabase
          .from("billing_logs")
          .select("amount")
          .gte(
            "created_at",
            new Date(new Date().setMonth(new Date().getMonth() - 1)).toISOString()
          ),
      ]);

      const questionsGenerated = questionsData?.reduce(
        (sum, user) => sum + (user.questions_generated || 0),
        0
      ) || 0;

      const papersGraded = papersData?.reduce(
        (sum, user) => sum + (user.papers_graded || 0),
        0
      ) || 0;

      const monthlyRevenue = revenueData?.reduce(
        (sum, log) => sum + (log.amount || 0),
        0
      ) || 0;

      return {
        totalUsers: totalUsers || 0,
        activePlans: activePlans || 0,
        questionsGenerated,
        papersGraded,
        monthlyRevenue,
      };
    },
  });

  const { data: usageData } = useQuery({
    queryKey: ["admin", "dashboard", "usage"],
    queryFn: async (): Promise<UsageData[]> => {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { data: logs } = await supabase
        .from("activity_logs")
        .select("*")
        .gte("created_at", thirtyDaysAgo.toISOString())
        .order("created_at");

      // Process logs to get daily usage
      const dailyUsage: { [key: string]: UsageData } = {};
      
      logs?.forEach((log) => {
        const date = new Date(log.created_at).toISOString().split("T")[0];
        if (!dailyUsage[date]) {
          dailyUsage[date] = { date, questions: 0, grades: 0 };
        }
        
        if (log.action === "question_generated") {
          dailyUsage[date].questions++;
        } else if (log.action === "paper_graded") {
          dailyUsage[date].grades++;
        }
      });

      return Object.values(dailyUsage);
    },
  });

  const stats_cards = [
    {
      title: "Total Users",
      value: stats?.totalUsers || 0,
      description: "Registered users",
      icon: Users,
    },
    {
      title: "Questions Generated",
      value: stats?.questionsGenerated || 0,
      description: "Total AI generations",
      icon: FileText,
    },
    {
      title: "Papers Graded",
      value: stats?.papersGraded || 0,
      description: "Total papers graded",
      icon: CheckCircle,
    },
    {
      title: "Monthly Revenue",
      value: `$${(stats?.monthlyRevenue || 0).toFixed(2)}`,
      description: "Last 30 days",
      icon: DollarSign,
    },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-white">Dashboard Overview</h1>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {stats_cards.map((card) => (
          <Card key={card.title} className="bg-gray-800 border-gray-700">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-200">
                {card.title}
              </CardTitle>
              <card.icon className="h-4 w-4 text-gray-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">{card.value}</div>
              <p className="text-xs text-gray-400">
                {card.description}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="bg-gray-800 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white">Usage Trends</CardTitle>
          <CardDescription className="text-gray-400">
            Questions generated and papers graded over time
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={usageData}>
                <XAxis 
                  dataKey="date" 
                  stroke="#6B7280"
                  tick={{ fill: '#9CA3AF' }}
                />
                <YAxis 
                  stroke="#6B7280"
                  tick={{ fill: '#9CA3AF' }}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#1F2937',
                    border: '1px solid #374151',
                    borderRadius: '0.375rem',
                    color: '#E5E7EB'
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="questions"
                  name="Questions Generated"
                  stroke="#8B5CF6"
                  strokeWidth={2}
                />
                <Line
                  type="monotone"
                  dataKey="grades"
                  name="Papers Graded"
                  stroke="#10B981"
                  strokeWidth={2}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 
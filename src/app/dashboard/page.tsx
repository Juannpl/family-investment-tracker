"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useSession } from "@/lib/useSession";
import DashboardLayout from "@/components/DashboardLayout";
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
} from "chart.js";
import { Pie, Bar } from "react-chartjs-2";
import { Target, TrendingUp, Users, Calendar } from "lucide-react";

// Register Chart.js components
ChartJS.register(
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
);

const supabase = createClient();

const GOAL_AMOUNT = 50000;

const COLORS = [
  "#3B82F6",
  "#10B981",
  "#F59E0B",
  "#EF4444",
  "#8B5CF6",
  "#EC4899",
  "#06B6D4",
  "#84CC16",
];

interface ContributorData {
  name: string;
  total: number;
  percentage: number;
}

interface MonthlyData {
  month: string;
  amount: number;
  count: number;
}

export default function DashboardPage() {
  const { session, loading: sessionLoading } = useSession();
  const [totalContributions, setTotalContributions] = useState(0);
  const [contributorData, setContributorData] = useState<ContributorData[]>([]);
  const [monthlyData, setMonthlyData] = useState<MonthlyData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!session) return;

    const fetchData = async () => {
      setLoading(true);

      const { data: contributions, error } = await supabase
        .from("contributions")
        .select(
          `
          id,
          amount,
          date,
          user_id,
          profiles!inner(name)
        `,
        )
        .order("date", { ascending: true });

      if (error || !contributions) {
        setLoading(false);
        return;
      }

      const total = contributions.reduce((sum, c) => sum + c.amount, 0);
      setTotalContributions(total);

      const byContributor: Record<string, number> = {};
      contributions.forEach((c: any) => {
        const name = c.profiles?.name || "Inconnu";
        byContributor[name] = (byContributor[name] || 0) + c.amount;
      });

      const contributorStats = Object.entries(byContributor).map(
        ([name, amount]) => ({
          name,
          total: amount,
          percentage: Math.round((amount / total) * 100),
        }),
      );
      setContributorData(contributorStats);

      const monthNames = [
        "Jan",
        "Fév",
        "Mar",
        "Avr",
        "Mai",
        "Juin",
        "Juil",
        "Août",
        "Sep",
        "Oct",
        "Nov",
        "Déc",
      ];
      const monthlyStats: Record<string, { amount: number; count: number }> =
        {};

      for (let i = 5; i >= 0; i--) {
        const d = new Date();
        d.setMonth(d.getMonth() - i);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        monthlyStats[key] = { amount: 0, count: 0 };
      }

      contributions.forEach((c) => {
        const date = new Date(c.date);
        const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
        if (monthlyStats[key]) {
          monthlyStats[key].amount += c.amount;
          monthlyStats[key].count += 1;
        }
      });

      const monthly = Object.entries(monthlyStats).map(([key, data]) => {
        const [year, month] = key.split("-");
        return {
          month: `${monthNames[parseInt(month) - 1]} ${year.slice(2)}`,
          amount: data.amount,
          count: data.count,
        };
      });
      setMonthlyData(monthly);

      setLoading(false);
    };

    fetchData();
  }, [session]);

  if (sessionLoading || loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full" />
        </div>
      </DashboardLayout>
    );
  }

  if (!session) return null;

  const progressPercentage = Math.min(
    (totalContributions / GOAL_AMOUNT) * 100,
    100,
  );
  const remaining = Math.max(GOAL_AMOUNT - totalContributions, 0);

  const formatAmount = (amount: number) =>
    new Intl.NumberFormat("fr-FR", {
      style: "currency",
      currency: "EUR",
      maximumFractionDigits: 0,
    }).format(amount);

  // Chart.js data for Pie chart
  const pieChartData = {
    labels: contributorData.map((c) => c.name),
    datasets: [
      {
        data: contributorData.map((c) => c.total),
        backgroundColor: COLORS.slice(0, contributorData.length),
        borderColor: COLORS.slice(0, contributorData.length),
        borderWidth: 1,
      },
    ],
  };

  const pieChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        callbacks: {
          label: (context: any) => {
            const value = context.raw as number;
            const percentage = contributorData[context.dataIndex]?.percentage;
            return `${formatAmount(value)} (${percentage}%)`;
          },
        },
      },
    },
    cutout: "60%",
  };

  // Chart.js data for Bar chart
  const barChartData = {
    labels: monthlyData.map((d) => d.month),
    datasets: [
      {
        label: "Montant",
        data: monthlyData.map((d) => d.amount),
        backgroundColor: "#3B82F6",
        borderRadius: 4,
      },
    ],
  };

  const barChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: true,
        position: "bottom" as const,
      },
      tooltip: {
        callbacks: {
          label: (context: any) => formatAmount(context.raw as number),
        },
      },
    },
    scales: {
      x: {
        grid: { display: false },
      },
      y: {
        grid: { color: "#e5e7eb" },
        ticks: {
          callback: (value: any) => `${value / 1000}k`,
        },
      },
    },
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Tableau de bord
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Vue d'ensemble de vos investissements familiaux
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                <Target className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Objectif
                </p>
                <p className="text-xl font-bold text-gray-900 dark:text-white">
                  {formatAmount(GOAL_AMOUNT)}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                <TrendingUp className="w-5 h-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Collecté
                </p>
                <p className="text-xl font-bold text-gray-900 dark:text-white">
                  {formatAmount(totalContributions)}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-lg">
                <Calendar className="w-5 h-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Restant
                </p>
                <p className="text-xl font-bold text-gray-900 dark:text-white">
                  {formatAmount(remaining)}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                <Users className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Contributeurs
                </p>
                <p className="text-xl font-bold text-gray-900 dark:text-white">
                  {contributorData.length}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-gray-900 dark:text-white">
              Progression vers l'objectif
            </h3>
            <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              {progressPercentage.toFixed(1)}%
            </span>
          </div>
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-blue-500 to-blue-600 rounded-full transition-all duration-500"
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
            {formatAmount(totalContributions)} sur {formatAmount(GOAL_AMOUNT)}
          </p>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Pie Chart */}
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-4">
              Répartition par contributeur
            </h3>
            {contributorData.length > 0 ? (
              <div className="h-64">
                <Pie data={pieChartData} options={pieChartOptions} />
              </div>
            ) : (
              <div className="h-64 flex items-center justify-center text-gray-500 dark:text-gray-400">
                Aucune donnée disponible
              </div>
            )}

            <div className="mt-4 grid grid-cols-2 gap-2">
              {contributorData.map((item, index) => (
                <div key={item.name} className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: COLORS[index % COLORS.length] }}
                  />
                  <span className="text-sm text-gray-600 dark:text-gray-300 truncate">
                    {item.name}: {formatAmount(item.total)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Bar Chart */}
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-4">
              Évolution mensuelle
            </h3>
            {monthlyData.some((d) => d.amount > 0) ? (
              <div className="h-64">
                <Bar data={barChartData} options={barChartOptions} />
              </div>
            ) : (
              <div className="h-64 flex items-center justify-center text-gray-500 dark:text-gray-400">
                Aucune donnée disponible
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

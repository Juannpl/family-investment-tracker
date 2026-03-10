// app/contributions/page.tsx
"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useSession } from "@/lib/useSession";
import DashboardLayout from "@/components/DashboardLayout";
import AddContributionForm from "@/components/AddContributionForm";
import { Wallet, Clock, TrendingUp } from "lucide-react";

const supabase = createClient();

interface Contribution {
  id: string;
  amount: number;
  date: string;
  comment: string | null;
  profiles: { name: string };
}

export default function ContributionsPage() {
  const { session, loading: sessionLoading } = useSession();
  const [recentContributions, setRecentContributions] = useState<
    Contribution[]
  >([]);
  const [totalAmount, setTotalAmount] = useState(0);
  const [monthlyAmount, setMonthlyAmount] = useState(0);
  const [refreshKey, setRefreshKey] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!session) return;

    const fetchData = async () => {
      setLoading(true);

      // Contributions récentes (5 dernières)
      const { data: recent } = await supabase
        .from("contributions")
        .select(
          `
          id,
          amount,
          date,
          comment,
          profiles!inner(name)
        `,
        )
        .order("created_at", { ascending: false })
        .limit(5);

      if (recent) {
        setRecentContributions(
          recent.map((c: any) => ({
            ...c,
            profiles: c.profiles ?? { name: "Inconnu" },
          })),
        );
      }

      // Total des contributions
      const { data: allContributions } = await supabase
        .from("contributions")
        .select("amount, date");

      if (allContributions) {
        const total = allContributions.reduce((sum, c) => sum + c.amount, 0);
        setTotalAmount(total);

        // Total du mois en cours
        const now = new Date();
        const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
        const monthly = allContributions
          .filter((c) => c.date.startsWith(currentMonth))
          .reduce((sum, c) => sum + c.amount, 0);
        setMonthlyAmount(monthly);
      }

      setLoading(false);
    };

    fetchData();
  }, [session, refreshKey]);

  const handleSuccess = () => {
    setRefreshKey((k) => k + 1);
  };

  const formatAmount = (amount: number) =>
    new Intl.NumberFormat("fr-FR", {
      style: "currency",
      currency: "EUR",
    }).format(amount);

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });

  if (sessionLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full" />
        </div>
      </DashboardLayout>
    );
  }

  if (!session) return null;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Contributions
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Ajoutez et suivez vos versements
          </p>
        </div>

        {/* Stats rapides */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                <Wallet className="w-5 h-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Total des contributions
                </p>
                <p className="text-xl font-bold text-gray-900 dark:text-white">
                  {formatAmount(totalAmount)}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                <TrendingUp className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Ce mois-ci
                </p>
                <p className="text-xl font-bold text-gray-900 dark:text-white">
                  {formatAmount(monthlyAmount)}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Main content */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Formulaire */}
          <AddContributionForm onSuccess={handleSuccess} />

          {/* Contributions récentes */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-lg">
                <Clock className="w-6 h-6 text-amber-600 dark:text-amber-400" />
              </div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Versements récents
              </h2>
            </div>

            {loading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin h-6 w-6 border-2 border-blue-500 border-t-transparent rounded-full" />
              </div>
            ) : recentContributions.length === 0 ? (
              <div className="text-gray-500 dark:text-gray-400 text-sm text-center py-8">
                Aucun versement pour le moment
              </div>
            ) : (
              <div className="space-y-3">
                {recentContributions.map((c) => (
                  <div
                    key={c.id}
                    className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {c.profiles?.name} • {formatDate(c.date)}
                      </p>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        {formatAmount(c.amount)}
                      </p>
                      {c.comment && (
                        <p className="text-xs text-gray-400 dark:text-gray-500 truncate mt-1">
                          {c.comment}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

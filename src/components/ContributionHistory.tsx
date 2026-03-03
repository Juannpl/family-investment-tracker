"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

const supabase = createClient();

interface Contribution {
  id: string;
  amount: number;
  date: string;
  comment: string | null;
  created_at: string;
  profiles: {
    name: string;
  };
}

interface Props {
  refreshKey: number;
}

export default function ContributionHistory({ refreshKey }: Props) {
  const [contributions, setContributions] = useState<Contribution[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchContributions = async () => {
      setLoading(true);
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("contributions")
        .select(
          `
    id,
    amount,
    date,
    comment,
    created_at,
    profiles!inner(
      name
    )
  `,
        )
        .order("date", { ascending: false });
      if (!error && data) {
        const transformed = data.map((item: any) => ({
          ...item,
          profiles: item.profiles ?? { name: "Utilisateur inconnu" },
        }));
        setContributions(transformed);
      }
      setLoading(false);
    };

    fetchContributions();
  }, [refreshKey]);

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat("fr-FR", {
      style: "currency",
      currency: "EUR",
    }).format(amount);
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 transition-colors">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
          <svg
            className="w-6 h-6 text-green-600 dark:text-green-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
            />
          </svg>
        </div>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
          Historique des versements
        </h2>
      </div>

      {loading ? (
        <div className="flex justify-center py-8">
          <div className="animate-spin h-6 w-6 border-2 border-blue-500 border-t-transparent rounded-full" />
        </div>
      ) : contributions.length === 0 ? (
        <div className="text-gray-500 dark:text-gray-400 text-sm text-center py-8">
          <svg
            className="w-12 h-12 mx-auto mb-3 text-gray-300 dark:text-gray-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
            />
          </svg>
          Aucun versement pour le moment
        </div>
      ) : (
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {contributions.map((c) => (
            <div
              key={c.id}
              className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg"
            >
              <div className="flex-1 min-w-0">
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {c.profiles?.name ?? "Utilisateur inconnu"} •{" "}
                  {formatDate(c.date)}
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
  );
}

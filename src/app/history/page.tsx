"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useSession } from "@/lib/useSession";
import DashboardLayout from "@/components/DashboardLayout";
import { History, Search, Filter, Download } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const supabase = createClient();

interface Contribution {
  id: string;
  amount: number;
  date: string;
  comment: string | null;
  created_at: string;
  profiles: { name: string };
}

export default function HistoryPage() {
  const { session, loading: sessionLoading } = useSession();
  const [contributions, setContributions] = useState<Contribution[]>([]);
  const [filteredContributions, setFilteredContributions] = useState<
    Contribution[]
  >([]);
  const [contributors, setContributors] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  // Filtres
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedContributor, setSelectedContributor] = useState<string>("all");
  const [sortOrder, setSortOrder] = useState<"desc" | "asc">("desc");

  useEffect(() => {
    if (!session) return;

    const fetchData = async () => {
      setLoading(true);

      const { data, error } = await supabase
        .from("contributions")
        .select(
          `
          id,
          amount,
          date,
          comment,
          created_at,
          profiles!inner(name)
        `,
        )
        .order("date", { ascending: false });

      if (!error && data) {
        const transformed = data.map((c: any) => ({
          ...c,
          profiles: c.profiles ?? { name: "Inconnu" },
        }));
        setContributions(transformed);
        setFilteredContributions(transformed);

        // Extraire les contributeurs uniques
        const uniqueContributors = [
          ...new Set(transformed.map((c) => c.profiles.name)),
        ];
        setContributors(uniqueContributors);
      }

      setLoading(false);
    };

    fetchData();
  }, [session]);

  // Appliquer les filtres
  useEffect(() => {
    let result = [...contributions];

    // Filtre par recherche
    if (searchTerm) {
      result = result.filter(
        (c) =>
          c.profiles.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          c.comment?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          c.amount.toString().includes(searchTerm),
      );
    }

    // Filtre par contributeur
    if (selectedContributor !== "all") {
      result = result.filter((c) => c.profiles.name === selectedContributor);
    }

    // Tri
    result.sort((a, b) => {
      const dateA = new Date(a.date).getTime();
      const dateB = new Date(b.date).getTime();
      return sortOrder === "desc" ? dateB - dateA : dateA - dateB;
    });

    setFilteredContributions(result);
  }, [searchTerm, selectedContributor, sortOrder, contributions]);

  const formatAmount = (amount: number) =>
    new Intl.NumberFormat("fr-FR", {
      style: "currency",
      currency: "EUR",
    }).format(amount);

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString("fr-FR", {
      weekday: "short",
      day: "numeric",
      month: "long",
      year: "numeric",
    });

  const exportToCSV = () => {
    const headers = ["Date", "Contributeur", "Montant", "Commentaire"];
    const rows = filteredContributions.map((c) => [
      c.date,
      c.profiles.name,
      c.amount,
      c.comment || "",
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map((r) => r.map((v) => `"${v}"`).join(",")),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `contributions_${new Date().toISOString().split("T")[0]}.csv`;
    link.click();
  };

  const totalFiltered = filteredContributions.reduce(
    (sum, c) => sum + c.amount,
    0,
  );

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
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Historique
            </h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">
              Tous les versements ({filteredContributions.length} résultats)
            </p>
          </div>
          <Button
            variant="outline"
            onClick={exportToCSV}
            className="flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            Exporter CSV
          </Button>
        </div>

        {/* Filtres */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Recherche */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Rechercher..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Filtre contributeur */}
            <Select
              value={selectedContributor}
              onValueChange={setSelectedContributor}
            >
              <SelectTrigger className="w-full sm:w-48">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue placeholder="Contributeur" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous</SelectItem>
                {contributors.map((name) => (
                  <SelectItem key={name} value={name}>
                    {name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Tri */}
            <Select
              value={sortOrder}
              onValueChange={(v) => setSortOrder(v as "desc" | "asc")}
            >
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="desc">Plus récent</SelectItem>
                <SelectItem value="asc">Plus ancien</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Total filtré */}
        <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl p-4 text-white">
          <p className="text-sm opacity-90">Total des versements filtrés</p>
          <p className="text-2xl font-bold">{formatAmount(totalFiltered)}</p>
        </div>

        {/* Liste */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full" />
            </div>
          ) : filteredContributions.length === 0 ? (
            <div className="text-center py-12">
              <History className="w-12 h-12 mx-auto text-gray-300 dark:text-gray-600 mb-3" />
              <p className="text-gray-500 dark:text-gray-400">
                Aucun versement trouvé
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200 dark:divide-gray-700">
              {filteredContributions.map((c) => (
                <div
                  key={c.id}
                  className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300">
                          {c.profiles.name}
                        </span>
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {formatDate(c.date)}
                        </span>
                      </div>
                      {c.comment && (
                        <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                          {c.comment}
                        </p>
                      )}
                    </div>
                    <div className="text-right ml-4">
                      <p className="text-lg font-semibold text-gray-900 dark:text-white">
                        {formatAmount(c.amount)}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}

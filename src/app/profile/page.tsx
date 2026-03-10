"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useSession } from "@/lib/useSession";
import { useSettings } from "@/lib/SettingsContext";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  User,
  Mail,
  Calendar,
  TrendingUp,
  Target,
  PiggyBank,
  Percent,
  Save,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";

const supabase = createClient();

interface UserStats {
  totalContributed: number;
  contributionCount: number;
  percentageOfGoal: number;
  percentageOfTotal: number;
  firstContribution: string | null;
  lastContribution: string | null;
  averageContribution: number;
}

interface Profile {
  id: string;
  name: string;
  email: string;
  created_at: string;
}

export default function ProfilePage() {
  const router = useRouter();
  const { session, loading: sessionLoading } = useSession();
  const { goalAmount, loading: settingsLoading } = useSettings();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [totalAllContributions, setTotalAllContributions] = useState(0);
  const [dataLoading, setDataLoading] = useState(true);

  const [editName, setEditName] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);


  useEffect(() => {
    if (!session) return;

    const fetchData = async () => {
      setDataLoading(true);

      const { data: profileData } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", session.user.id)
        .single();

      if (profileData) {
        setProfile({
          ...profileData,
          email: session.user.email || "",
        });
        setEditName(profileData.name || "");
      }

      const { data: userContributions } = await supabase
        .from("contributions")
        .select("amount, date")
        .eq("user_id", session.user.id)
        .order("date", { ascending: true });

      const { data: allContributions } = await supabase
        .from("contributions")
        .select("amount");

      if (userContributions && allContributions) {
        const userTotal = userContributions.reduce(
          (sum, c) => sum + c.amount,
          0,
        );
        const globalTotal = allContributions.reduce(
          (sum, c) => sum + c.amount,
          0,
        );
        setTotalAllContributions(globalTotal);

        setStats({
          totalContributed: userTotal,
          contributionCount: userContributions.length,
          percentageOfGoal: (userTotal / goalAmount) * 100,
          percentageOfTotal:
            globalTotal > 0 ? (userTotal / globalTotal) * 100 : 0,
          firstContribution:
            userContributions.length > 0 ? userContributions[0].date : null,
          lastContribution:
            userContributions.length > 0
              ? userContributions[userContributions.length - 1].date
              : null,
          averageContribution:
            userContributions.length > 0
              ? userTotal / userContributions.length
              : 0,
        });
      }

      setDataLoading(false);
    };

    fetchData();
  }, [session]);

  const handleSaveProfile = async () => {
    if (!session || !editName.trim()) return;

    setSaving(true);
    setSaveError(null);
    setSaveSuccess(false);

    const { error } = await supabase
      .from("profiles")
      .update({ name: editName.trim() })
      .eq("id", session.user.id);

    setSaving(false);

    if (error) {
      setSaveError("Erreur lors de la sauvegarde");
    } else {
      setSaveSuccess(true);
      setProfile((prev) => (prev ? { ...prev, name: editName.trim() } : null));
      setTimeout(() => setSaveSuccess(false), 3000);
    }
  };

  const formatAmount = (amount: number) =>
    new Intl.NumberFormat("fr-FR", {
      style: "currency",
      currency: "EUR",
    }).format(amount);

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });

  if (sessionLoading || settingsLoading || dataLoading) {
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
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Mon Profil
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Gérez vos informations et consultez vos statistiques
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Colonne gauche - Infos profil */}
          <div className="lg:col-span-1 space-y-6">
            {/* Card Profil */}
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
              {/* Avatar */}
              <div className="flex flex-col items-center mb-6">
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center mb-3">
                  <span className="text-3xl font-bold text-white">
                    {profile?.name?.charAt(0).toUpperCase() ||
                      session.user.email?.charAt(0).toUpperCase()}
                  </span>
                </div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {profile?.name || "Utilisateur"}
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Membre de la famille
                </p>
              </div>

              {/* Infos */}
              <div className="space-y-4">
                <div className="flex items-center gap-3 text-sm">
                  <Mail className="w-4 h-4 text-gray-400" />
                  <span className="text-gray-600 dark:text-gray-300 truncate">
                    {session.user.email}
                  </span>
                </div>
                {profile?.created_at && (
                  <div className="flex items-center gap-3 text-sm">
                    <Calendar className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-600 dark:text-gray-300">
                      Membre depuis {formatDate(profile.created_at)}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Modifier le nom */}
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <User className="w-5 h-5" />
                Modifier mon profil
              </h3>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nom d'affichage</Label>
                  <Input
                    id="name"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    placeholder="Votre nom"
                  />
                </div>

                {saveError && (
                  <div className="flex items-center gap-2 text-red-600 text-sm">
                    <AlertCircle className="w-4 h-4" />
                    {saveError}
                  </div>
                )}

                {saveSuccess && (
                  <div className="flex items-center gap-2 text-green-600 text-sm">
                    <CheckCircle2 className="w-4 h-4" />
                    Profil mis à jour !
                  </div>
                )}

                <Button
                  onClick={handleSaveProfile}
                  disabled={saving || !editName.trim()}
                  className="w-full"
                >
                  {saving ? (
                    "Sauvegarde..."
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      Sauvegarder
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>

          {/* Colonne droite - Statistiques */}
          <div className="lg:col-span-2 space-y-6">
            {/* Stats principales */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm border border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                    <PiggyBank className="w-5 h-5 text-green-600 dark:text-green-400" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Total versé
                    </p>
                    <p className="text-xl font-bold text-gray-900 dark:text-white">
                      {formatAmount(stats?.totalContributed || 0)}
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
                      Versements
                    </p>
                    <p className="text-xl font-bold text-gray-900 dark:text-white">
                      {stats?.contributionCount || 0}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm border border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                    <Target className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Part de l'objectif
                    </p>
                    <p className="text-xl font-bold text-gray-900 dark:text-white">
                      {(stats?.percentageOfGoal || 0).toFixed(1)}%
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm border border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-lg">
                    <Percent className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Part du total
                    </p>
                    <p className="text-xl font-bold text-gray-900 dark:text-white">
                      {(stats?.percentageOfTotal || 0).toFixed(1)}%
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Progression personnelle */}
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-4">
                Ma contribution à l'objectif
              </h3>

              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500 dark:text-gray-400">
                    Objectif global
                  </span>
                  <span className="font-medium text-gray-900 dark:text-white">
                    {formatAmount(goalAmount)}
                  </span>
                </div>

                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-blue-500 to-green-500 rounded-full transition-all duration-500"
                    style={{
                      width: `${Math.min(stats?.percentageOfGoal || 0, 100)}%`,
                    }}
                  />
                </div>

                <div className="flex justify-between text-sm">
                  <span className="text-gray-500 dark:text-gray-400">
                    Ma contribution
                  </span>
                  <span className="font-medium text-green-600 dark:text-green-400">
                    {formatAmount(stats?.totalContributed || 0)}
                  </span>
                </div>
              </div>
            </div>

            {/* Détails supplémentaires */}
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-4">
                Détails de mes contributions
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Versement moyen
                  </p>
                  <p className="text-lg font-semibold text-gray-900 dark:text-white">
                    {formatAmount(stats?.averageContribution || 0)}
                  </p>
                </div>

                <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Total collecté (tous)
                  </p>
                  <p className="text-lg font-semibold text-gray-900 dark:text-white">
                    {formatAmount(totalAllContributions)}
                  </p>
                </div>

                {stats?.firstContribution && (
                  <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Premier versement
                    </p>
                    <p className="text-lg font-semibold text-gray-900 dark:text-white">
                      {formatDate(stats.firstContribution)}
                    </p>
                  </div>
                )}

                {stats?.lastContribution && (
                  <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Dernier versement
                    </p>
                    <p className="text-lg font-semibold text-gray-900 dark:text-white">
                      {formatDate(stats.lastContribution)}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

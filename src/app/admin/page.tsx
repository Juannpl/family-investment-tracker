"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useSettings } from "@/lib/SettingsContext";

const supabase = createClient();

type Tab = "requests" | "users" | "settings";

interface Request {
  id: string;
  email: string;
  status: string;
  created_at: string;
}

interface User {
  id: string;
  email: string;
  created_at: string;
  last_sign_in_at: string | null;
}

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState<Tab>("requests");
  const [requests, setRequests] = useState<Request[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  const { goalAmount, updateGoalAmount } = useSettings();
  const [newGoal, setNewGoal] = useState(goalAmount);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setNewGoal(goalAmount);
  }, [goalAmount]);

  const fetchRequests = async () => {
    const { data } = await supabase
      .from("access_requests")
      .select("*")
      .eq("status", "pending")
      .order("created_at", { ascending: false });
    setRequests(data || []);
  };

  const fetchUsers = async () => {
    const res = await fetch("/api/admin/users");
    if (res.ok) {
      const data = await res.json();
      setUsers(data.users || []);
    }
  };

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      await Promise.all([fetchRequests(), fetchUsers()]);
      setLoading(false);
    };
    load();
  }, []);

  const approve = async (req: Request) => {
    await fetch("/api/admin/invite", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: req.email, requestId: req.id }),
    });
    fetchRequests();
    fetchUsers();
  };

  const reject = async (id: string) => {
    await supabase
      .from("access_requests")
      .update({ status: "rejected" })
      .eq("id", id);
    fetchRequests();
  };

  const deleteUser = async (userId: string) => {
    if (!confirm("Supprimer cet utilisateur ?")) return;

    const res = await fetch("/api/admin/users", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId }),
    });

    if (res.ok) fetchUsers();
  };

  const handleSaveGoal = async () => {
    setSaving(true);
    await updateGoalAmount(newGoal);
    setSaving(false);
  };

  const tabs: { key: Tab; label: string }[] = [
    { key: "requests", label: "Demandes" },
    { key: "users", label: "Utilisateurs" },
    { key: "settings", label: "Paramètres" },
  ];

  if (loading) {
    return (
      <div className="flex justify-center p-12">
        <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-bold">Administration</h1>

      {/* Tabs */}
      <div className="flex border-b">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 -mb-px border-b-2 transition-colors ${
              activeTab === tab.key
                ? "border-blue-500 text-blue-600"
                : "border-transparent hover:text-gray-600"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Demandes d'accès */}
      {activeTab === "requests" && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Demandes en attente</h2>
          {requests.length === 0 ? (
            <p className="text-gray-500">Aucune demande en attente</p>
          ) : (
            requests.map((r) => (
              <div
                key={r.id}
                className="flex justify-between items-center border p-4 rounded dark:border-gray-700"
              >
                <div>
                  <p className="font-medium">{r.email}</p>
                  <p className="text-xs text-gray-500">
                    {new Date(r.created_at).toLocaleString("fr-FR")}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => approve(r)}
                    className="bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700"
                  >
                    Approuver
                  </button>
                  <button
                    onClick={() => reject(r.id)}
                    className="bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700"
                  >
                    Refuser
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Utilisateurs */}
      {activeTab === "users" && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">
            Utilisateurs ({users.length})
          </h2>
          {users.map((user) => (
            <div
              key={user.id}
              className="flex justify-between items-center border p-4 rounded dark:border-gray-700"
            >
              <div>
                <p className="font-medium">{user.email}</p>
                <p className="text-xs text-gray-500">
                  Inscrit le{" "}
                  {new Date(user.created_at).toLocaleDateString("fr-FR")}
                  {user.last_sign_in_at && (
                    <>
                      {" "}
                      · Dernière connexion :{" "}
                      {new Date(user.last_sign_in_at).toLocaleDateString(
                        "fr-FR",
                      )}
                    </>
                  )}
                </p>
              </div>
              <button
                onClick={() => deleteUser(user.id)}
                className="text-red-600 hover:text-red-700 px-3 py-1"
              >
                Supprimer
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Paramètres */}
      {activeTab === "settings" && (
        <div className="space-y-6">
          <h2 className="text-lg font-semibold">Paramètres</h2>

          <div className="border p-4 rounded dark:border-gray-700 space-y-4">
            <label className="block">
              <span className="text-sm font-medium">
                Objectif d'investissement (€)
              </span>
              <input
                type="number"
                value={newGoal}
                onChange={(e) => setNewGoal(Number(e.target.value))}
                className="mt-1 block w-full px-3 py-2 border rounded dark:bg-gray-800 dark:border-gray-600"
              />
            </label>
            <button
              onClick={handleSaveGoal}
              disabled={saving || newGoal === goalAmount}
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? "Enregistrement..." : "Enregistrer"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

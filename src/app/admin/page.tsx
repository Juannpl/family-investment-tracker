"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

const supabase = createClient();

interface Request {
  id: string;
  email: string;
  status: string;
  created_at: string;
}

export default function AdminPage() {
  const [requests, setRequests] = useState<Request[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRequests = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("access_requests")
      .select("*")
      .eq("status", "pending")
      .order("created_at", { ascending: false });

    setRequests(data || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const approve = async (req: Request) => {
    await fetch("/api/admin/invite", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: req.email,
        requestId: req.id,
      }),
    });

    fetchRequests();
  };

  const reject = async (id: string) => {
    await supabase
      .from("access_requests")
      .update({ status: "rejected" })
      .eq("id", id);

    fetchRequests();
  };

  if (loading) return <p>Chargement…</p>;

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-4">
      <h1 className="text-2xl font-bold">Demandes d’accès</h1>

      {requests.length === 0 && (
        <p className="text-gray-500">Aucune demande en attente</p>
      )}

      {requests.map((r) => (
        <div
          key={r.id}
          className="flex justify-between items-center border p-4 rounded"
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
              className="bg-green-600 text-white px-3 py-1 rounded"
            >
              Approuver
            </button>
            <button
              onClick={() => reject(r.id)}
              className="bg-red-600 text-white px-3 py-1 rounded"
            >
              Refuser
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

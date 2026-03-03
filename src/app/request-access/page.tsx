"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

const supabase = createClient();

export default function RequestAccessPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  const submit: React.SubmitEventHandler<HTMLFormElement> = async (e) => {
    e.preventDefault();
    setError("");

    const { error } = await supabase.from("access_requests").insert({ email });

    if (error) {
      setError(error.message);
      return;
    }

    setSent(true);
  };

  if (sent) {
    return <p>Demande envoyée. Vous serez contacté par email.</p>;
  }

  return (
    <form onSubmit={submit} className="space-y-4 max-w-sm mx-auto">
      <input
        type="email"
        required
        placeholder="email@exemple.com"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="w-full border p-2 rounded"
      />

      {error && <p className="text-red-600 text-sm">{error}</p>}

      <button className="w-full bg-blue-600 text-white p-2 rounded">
        Demander l'accès
      </button>
    </form>
  );
}

// lib/SettingsContext.tsx
"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import { createClient } from "@/lib/supabase/client";

interface Settings {
  goalAmount: number;
  loading: boolean;
  updateGoalAmount: (amount: number) => Promise<boolean>;
}

const DEFAULT_GOAL = 50000;

const SettingsContext = createContext<Settings>({
  goalAmount: DEFAULT_GOAL,
  loading: true,
  updateGoalAmount: async () => false,
});

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [goalAmount, setGoalAmount] = useState(DEFAULT_GOAL);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();

    const fetchSettings = async () => {
      const { data } = await supabase
        .from("settings")
        .select("key, value")
        .eq("key", "goal_amount")
        .single();

      if (data) {
        setGoalAmount(Number(data.value));
      }
      setLoading(false);
    };

    fetchSettings();

    const channel = supabase
      .channel("settings-changes")
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "settings" },
        (payload) => {
          if (payload.new.key === "goal_amount") {
            setGoalAmount(Number(payload.new.value));
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const updateGoalAmount = async (amount: number): Promise<boolean> => {
    const supabase = createClient();

    const { error } = await supabase
      .from("settings")
      .update({ value: amount, updated_at: new Date().toISOString() })
      .eq("key", "goal_amount");

    if (!error) {
      setGoalAmount(amount);
      return true;
    }
    return false;
  };

  return (
    <SettingsContext.Provider value={{ goalAmount, loading, updateGoalAmount }}>
      {children}
    </SettingsContext.Provider>
  );
}

export const useSettings = () => useContext(SettingsContext);

"use client";

import { useState } from "react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import {
  CalendarIcon,
  Loader2,
  Plus,
  CheckCircle2,
  XCircle,
} from "lucide-react";

import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

const supabase = createClient();

interface Props {
  onSuccess?: () => void;
}

export default function AddContributionForm({ onSuccess }: Props) {
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState<Date | undefined>(undefined);
  const [comment, setComment] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit: React.SubmitEventHandler<HTMLFormElement> = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    setIsLoading(true);

    const numericAmount = parseFloat(amount);
    if (isNaN(numericAmount) || numericAmount <= 0) {
      setError("Montant invalide");
      setIsLoading(false);
      return;
    }

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (!user || userError) {
      setError("Impossible de récupérer l'utilisateur");
      setIsLoading(false);
      return;
    }

    const { error } = await supabase.from("contributions").insert([
      {
        amount: numericAmount,
        date: date
          ? format(date, "yyyy-MM-dd")
          : new Date().toISOString().slice(0, 10),
        comment: comment || null,
        user_id: user.id,
      },
    ]);

    setIsLoading(false);

    if (error) {
      setError(error.message);
    } else {
      setSuccess(true);
      setAmount("");
      setDate(undefined);
      setComment("");
      onSuccess?.();
      setTimeout(() => setSuccess(false), 3000);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 transition-colors">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
          <Plus className="w-6 h-6 text-blue-600 dark:text-blue-400" />
        </div>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
          Ajouter un versement
        </h2>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Montant */}
        <div className="space-y-2">
          <Label htmlFor="amount">
            Montant (€) <span className="text-red-500">*</span>
          </Label>
          <div className="relative">
            <Input
              id="amount"
              type="number"
              step="0.01"
              min="0"
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
              className="pr-10"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
              €
            </span>
          </div>
        </div>

        {/* Date */}
        <div className="space-y-2">
          <Label>Date</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-full justify-start text-left font-normal",
                  !date && "text-muted-foreground",
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {date ? format(date, "PPP", { locale: fr }) : "Aujourd'hui"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={date}
                onSelect={setDate}
                locale={fr}
                autoFocus
              />
            </PopoverContent>
          </Popover>
          <p className="text-xs text-muted-foreground">
            Par défaut : aujourd'hui
          </p>
        </div>

        {/* Commentaire */}
        <div className="space-y-2">
          <Label htmlFor="comment">Commentaire</Label>
          <Textarea
            id="comment"
            placeholder="Note optionnelle..."
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows={3}
            className="resize-none"
          />
        </div>

        {/* Messages d'erreur/succès */}
        {error && (
          <div className="flex items-center gap-2 bg-destructive/10 text-destructive px-4 py-3 rounded-lg text-sm">
            <XCircle className="w-5 h-5 flex-shrink-0" />
            {error}
          </div>
        )}

        {success && (
          <div className="flex items-center gap-2 bg-green-500/10 text-green-600 dark:text-green-400 px-4 py-3 rounded-lg text-sm">
            <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
            Versement ajouté avec succès !
          </div>
        )}

        {/* Submit */}
        <Button type="submit" disabled={isLoading} className="w-full">
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Ajout en cours...
            </>
          ) : (
            <>
              <Plus className="mr-2 h-4 w-4" />
              Ajouter le versement
            </>
          )}
        </Button>
      </form>
    </div>
  );
}

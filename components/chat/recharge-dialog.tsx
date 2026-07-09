"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Coins, Loader2, Sparkles, ShieldCheck } from "lucide-react";
import { toast } from "./toast";

type RechargeDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

const PACKS = [
  {
    credits: 500,
    price: 500,
    popular: false,
    color: "from-amber-500/20 to-amber-700/20 border-amber-500/30",
    textColor: "text-amber-500",
  },
  {
    credits: 1000,
    price: 1000,
    popular: true,
    color: "from-blue-500/20 to-indigo-600/20 border-blue-500/50",
    textColor: "text-blue-500",
  },
  {
    credits: 5000,
    price: 5000,
    popular: false,
    color: "from-emerald-500/20 to-teal-700/20 border-emerald-500/30",
    textColor: "text-emerald-500",
  },
];

export function RechargeDialog({ open, onOpenChange }: RechargeDialogProps) {
  const [loadingPack, setLoadingPack] = useState<number | null>(null);

  const handleBuy = async (amount: number, index: number) => {
    try {
      setLoadingPack(index);
      const res = await fetch("/api/payment/recharge", {
        body: JSON.stringify({ amount }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to initiate payment");
      }

      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error("No checkout URL returned");
      }
    } catch (err: any) {
      console.error(err);
      toast({
        description: err.message || "Erreur de connexion avec Fapshi.",
        type: "error",
      });
    } finally {
      setLoadingPack(null);
    }
  };

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent className="max-w-md rounded-2xl border border-border/60 bg-card/95 backdrop-blur-xl shadow-2xl p-6">
        <DialogHeader className="flex flex-col items-center text-center space-y-2">
          <div className="flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Coins className="size-6 animate-pulse" />
          </div>
          <DialogTitle className="text-xl font-bold tracking-tight">
            Recharger vos Crédits
          </DialogTitle>
          <DialogDescription className="text-muted-foreground text-sm">
            Choisissez la formule qui vous convient. Payez en toute sécurité
            avec Fapshi Mobile Money (Orange Money, MTN MoMo).
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 mt-6">
          {PACKS.map((pack, idx) => (
            <div
              className={`relative flex items-center justify-between p-4 rounded-xl border bg-gradient-to-r ${pack.color} transition-all duration-200 hover:scale-[1.01]`}
              key={pack.credits}
            >
              {pack.popular && (
                <span className="absolute -top-2.5 right-4 flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-blue-600 text-white shadow-lg">
                  <Sparkles className="size-3" /> Populaire
                </span>
              )}
              <div className="flex flex-col space-y-1">
                <span className="text-lg font-bold flex items-center gap-1.5">
                  {pack.credits.toLocaleString()} crédits
                </span>
                <span className="text-xs text-muted-foreground">
                  Soit {pack.credits} jetons de requêtes
                </span>
              </div>
              <Button
                className="font-bold relative"
                disabled={loadingPack !== null}
                onClick={() => handleBuy(pack.price, idx)}
                size="sm"
                variant={pack.popular ? "default" : "outline"}
              >
                {loadingPack === idx ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  `${pack.price} FCFA`
                )}
              </Button>
            </div>
          ))}
        </div>

        <div className="flex items-center justify-center gap-2 mt-6 pt-4 border-t border-border/40 text-[11px] text-muted-foreground">
          <ShieldCheck className="size-4 text-emerald-500" />
          Paiements sécurisés cryptés SSL via Fapshi
        </div>
      </DialogContent>
    </Dialog>
  );
}

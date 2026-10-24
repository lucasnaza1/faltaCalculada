"use client";

/** Toggle "Eu | Nome dela" + status de sync. Fica fixo no topo. */

import { CloudOff, Eye, RefreshCw } from "lucide-react";
import { useSync } from "@/lib/sync";

export function PartnerSwitch() {
  const { partner, partnerData, viewingPartner, setViewingPartner, status, refreshPartner } =
    useSync();

  if (!partner || !partnerData) return null;

  return (
    <div className="mb-4 flex items-center justify-between gap-2">
      <div
        role="group"
        aria-label="Selecionar dados exibidos"
        className="flex rounded-full border border-white/10 bg-surface p-1"
      >
        <button
          type="button"
          onClick={() => setViewingPartner(false)}
          aria-pressed={!viewingPartner}
          className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors ${
            !viewingPartner
              ? "bg-primary text-white"
              : "text-muted hover:text-foreground"
          }`}
        >
          Eu
        </button>
        <button
          type="button"
          onClick={() => {
            refreshPartner();
            setViewingPartner(true);
          }}
          aria-pressed={viewingPartner}
          className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors ${
            viewingPartner
              ? "bg-primary text-white"
              : "text-muted hover:text-foreground"
          }`}
        >
          {partner.displayName}
        </button>
      </div>

      {viewingPartner ? (
        <span className="flex items-center gap-1 text-[11px] text-muted">
          <Eye className="h-3.5 w-3.5" aria-hidden /> somente leitura
        </span>
      ) : status === "syncing" ? (
        <span className="flex items-center gap-1 text-[11px] text-muted">
          <RefreshCw className="h-3.5 w-3.5 animate-spin" aria-hidden /> sincronizando
        </span>
      ) : status === "error" ? (
        <span className="flex items-center gap-1 text-[11px] text-warning">
          <CloudOff className="h-3.5 w-3.5" aria-hidden /> sync falhou
        </span>
      ) : (
        <span className="flex items-center gap-1 text-[11px] text-muted">
          <span className="h-1.5 w-1.5 rounded-full bg-success" aria-hidden /> sincronizado
        </span>
      )}
    </div>
  );
}

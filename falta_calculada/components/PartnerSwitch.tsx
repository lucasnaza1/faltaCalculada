"use client";

/** Seletor "Eu | Nome do parceiro" — seção de Ajustes.
 * Fallback: se o usuário não tem matérias, os dados do parceiro são
 * exibidos automaticamente (somente leitura) e "Eu" fica desabilitado. */

import { CloudOff, Eye, RefreshCw } from "lucide-react";
import { useSync } from "@/lib/sync";

function hasSubjects(d: { semesters?: Array<{ subjects: Array<unknown> }> } | null): boolean {
  return !!d?.semesters?.some((s) => s.subjects.length > 0);
}

export function PartnerSwitch() {
  const { partner, partnerData, viewingPartner, setViewingPartner, status, refreshPartner, sessionData } =
    useSync();

  if (!partner || !partnerData) return null;

  const selfEmpty = !hasSubjects(sessionData);
  const partnerEmpty = !hasSubjects(partnerData);
  // sem matérias em nenhum dos lados: nada para alternar
  if (selfEmpty && partnerEmpty) return null;

  return (
    <section
      aria-labelledby="visualizacao"
      className="flex flex-col gap-3 rounded-2xl border border-soft bg-surface p-4"
    >
      <h2 id="visualizacao" className="font-semibold">
        Visualização de dados
      </h2>

      <div
        role="group"
        aria-label="Selecionar dados exibidos"
        className="flex rounded-full border border-soft bg-surface-raised p-1"
      >
        <button
          type="button"
          onClick={() => setViewingPartner(false)}
          disabled={selfEmpty}
          aria-pressed={!viewingPartner}
          title={selfEmpty ? "Você ainda não tem matérias cadastradas" : undefined}
          className={`flex-1 rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors ${
            !viewingPartner
              ? "bg-primary text-white"
              : selfEmpty
                ? "cursor-not-allowed text-muted/50"
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
          disabled={partnerEmpty}
          aria-pressed={viewingPartner}
          title={partnerEmpty ? "Parceiro(a) sem matérias cadastradas" : undefined}
          className={`flex-1 rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors ${
            viewingPartner
              ? "bg-primary text-white"
              : partnerEmpty
                ? "cursor-not-allowed text-muted/50"
                : "text-muted hover:text-foreground"
          }`}
        >
          {partner.displayName}
        </button>
      </div>

      <p className="flex items-center gap-1.5 text-xs text-muted">
        {viewingPartner ? (
          <>
            <Eye className="h-3.5 w-3.5" aria-hidden /> exibindo os dados de{" "}
            {partner.displayName} (somente leitura)
          </>
        ) : status === "syncing" ? (
          <>
            <RefreshCw className="h-3.5 w-3.5 animate-spin" aria-hidden /> sincronizando
          </>
        ) : status === "error" ? (
          <>
            <CloudOff className="h-3.5 w-3.5 text-warning" aria-hidden />
            <span className="text-warning">sync falhou</span>
          </>
        ) : (
          <>
            <span className="h-1.5 w-1.5 rounded-full bg-success" aria-hidden /> sincronizado
          </>
        )}
      </p>
    </section>
  );
}

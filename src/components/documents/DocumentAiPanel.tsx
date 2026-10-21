"use client";

import { useFormState, useFormStatus } from "react-dom";
import { Sparkles, AlertTriangle, CheckCircle2, HelpCircle } from "lucide-react";
import { applyAnalysisToClient, runDocumentAnalysis, type AiActionState } from "@/app/(dashboard)/documents/ai-actions";
import {
  APPLICABLE_CLIENT_FIELDS,
  CLIENT_FIELD_LABEL,
  DOCUMENT_TYPE_LABEL,
  type ClientMatch,
  type DocumentType,
  type ExtractedFields
} from "@/lib/ai/documentFields";
import type { AiAnalysisView, ClientCurrentValues } from "@/lib/ai/analysisView";

const initial: AiActionState = {};

function Pending({ children, className }: { children: React.ReactNode; className: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className={className + " disabled:opacity-60"}>
      {pending ? "Memproses..." : children}
    </button>
  );
}

const FIELD_LABEL: Record<keyof ExtractedFields, string> = {
  nik: "NIK",
  fullName: "Nama",
  birthPlace: "Tempat lahir",
  birthDate: "Tanggal lahir",
  address: "Alamat",
  rt: "RT",
  rw: "RW",
  kelurahan: "Kelurahan/Desa",
  kecamatan: "Kecamatan",
  occupation: "Pekerjaan",
  gender: "Jenis kelamin",
  nationality: "Kewarganegaraan",
  city: "Kota",
  npwp: "NPWP",
  companyName: "Perusahaan",
  certificateNumber: "No. sertifikat",
  landArea: "Luas",
  ownerName: "Pemegang hak",
  documentNumber: "No. dokumen",
  documentDate: "Tanggal dokumen",
  notes: "Catatan"
};

function MatchBadge({ verdict }: { verdict: "match" | "mismatch" | "unknown" }) {
  if (verdict === "match")
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-status-on-track/10 px-2 py-0.5 text-[11px] font-medium text-status-on-track">
        <CheckCircle2 className="h-3 w-3" /> cocok
      </span>
    );
  if (verdict === "mismatch")
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-status-overdue/10 px-2 py-0.5 text-[11px] font-medium text-status-overdue">
        <AlertTriangle className="h-3 w-3" /> berbeda
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">
      <HelpCircle className="h-3 w-3" /> belum ada data klien
    </span>
  );
}

/**
 * Panel "Analisis AI" untuk satu dokumen: tombol jalankan, hasil terakhir
 * (jenis, keterbacaan, masalah, data terbaca, kecocokan dengan klien), dan
 * form "Terapkan ke data klien" untuk kolom yang dipilih staff.
 */
export function DocumentAiPanel({
  documentId,
  expectedLabel,
  returnPath,
  analysis,
  canAnalyze,
  canApply,
  clientValues,
  compact
}: {
  documentId: string;
  expectedLabel?: string | null;
  returnPath: string;
  analysis: AiAnalysisView | null;
  canAnalyze: boolean;
  canApply: boolean;
  clientValues: ClientCurrentValues | null;
  compact?: boolean;
}) {
  const [runState, runAction] = useFormState(runDocumentAnalysis.bind(null, documentId, expectedLabel ?? null, returnPath), initial);
  const [applyState, applyAction] = useFormState(
    applyAnalysisToClient.bind(null, analysis?.id ?? "", returnPath),
    initial
  );

  const score = analysis?.qualityScore ?? null;
  const scoreTone =
    score === null ? "text-muted-foreground" : score >= 75 ? "text-status-on-track" : score >= 50 ? "text-status-due-soon" : "text-status-overdue";

  const applicable = analysis
    ? APPLICABLE_CLIENT_FIELDS.filter((f) => analysis.extractedFields[f])
    : [];

  return (
    <div className={`rounded-md border border-dashed border-primary/40 bg-primary/5 ${compact ? "mt-2 px-3 py-2" : "p-4"} text-xs`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="inline-flex items-center gap-1.5 font-medium text-foreground">
          <Sparkles className="h-3.5 w-3.5 text-primary" />
          Analisis AI
          {analysis && (
            <span className="font-normal text-muted-foreground">
              · {new Date(analysis.createdAt).toLocaleString("id-ID")}
            </span>
          )}
        </div>
        {canAnalyze && (
          <form action={runAction}>
            <Pending className="rounded-md border border-primary px-2.5 py-1 text-xs font-medium text-primary hover:bg-primary/10">
              {analysis ? "Analisis ulang" : "Analisis dengan AI"}
            </Pending>
          </form>
        )}
      </div>
      {runState.error && <p className="mt-1 text-status-overdue">{runState.error}</p>}

      {!analysis && !runState.error && (
        <p className="mt-1 text-muted-foreground">
          Belum dianalisis. AI akan membaca dokumen, menilai keterbacaan, dan mengusulkan data; keputusan tetap di tangan staf.
        </p>
      )}

      {analysis && (
        <div className="mt-2 space-y-2">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
            <span>
              Jenis: <strong className="text-foreground">{DOCUMENT_TYPE_LABEL[(analysis.documentType ?? "LAINNYA") as DocumentType] ?? analysis.documentType}</strong>
            </span>
            <span>
              Keterbacaan: <strong className={scoreTone}>{score === null ? "-" : `${score}/100`}</strong>
              {!analysis.legible && <span className="ml-1 text-status-overdue">(sulit dibaca)</span>}
            </span>
          </div>
          {analysis.summary && <p className="text-foreground">{analysis.summary}</p>}
          {analysis.issues.length > 0 && (
            <ul className="list-disc space-y-0.5 pl-4 text-status-overdue">
              {analysis.issues.map((i, idx) => (
                <li key={idx}>{i}</li>
              ))}
            </ul>
          )}

          {Object.keys(analysis.extractedFields).length > 0 && (
            <dl className="grid grid-cols-1 gap-x-4 gap-y-1 sm:grid-cols-2">
              {(Object.keys(analysis.extractedFields) as (keyof ExtractedFields)[]).map((k) => (
                <div key={k} className="flex gap-2">
                  <dt className="w-24 shrink-0 text-muted-foreground">{FIELD_LABEL[k] ?? k}</dt>
                  <dd className="text-foreground">
                    {analysis.extractedFields[k]}
                    {analysis.clientMatch && k in analysis.clientMatch && (
                      <span className="ml-2">
                        <MatchBadge verdict={analysis.clientMatch[k as keyof ClientMatch]!.verdict} />
                      </span>
                    )}
                  </dd>
                </div>
              ))}
            </dl>
          )}

          {canApply && clientValues && applicable.length > 0 && (
            <form action={applyAction} className="mt-2 rounded-md border border-border bg-background p-2">
              <p className="mb-1 font-medium text-foreground">Terapkan ke data klien (pilih kolom):</p>
              <div className="space-y-1">
                {applicable.map((f) => {
                  const current = clientValues[f];
                  const proposed = analysis.extractedFields[f];
                  const same = (current ?? "").trim() === (proposed ?? "").trim();
                  return (
                    <label key={f} className="flex items-start gap-2">
                      <input type="checkbox" name="field" value={f} defaultChecked={!current} disabled={same} className="mt-0.5" />
                      <span>
                        <span className="text-foreground">{CLIENT_FIELD_LABEL[f]}:</span> {proposed}
                        {same ? (
                          <span className="ml-1 text-muted-foreground">(sudah sama)</span>
                        ) : current ? (
                          <span className="ml-1 text-status-due-soon">(akan menggantikan: {current})</span>
                        ) : (
                          <span className="ml-1 text-muted-foreground">(saat ini kosong)</span>
                        )}
                      </span>
                    </label>
                  );
                })}
              </div>
              <div className="mt-2 flex items-center gap-2">
                <Pending className="rounded-md bg-primary px-2.5 py-1 text-xs font-medium text-primary-foreground hover:opacity-90">
                  Terapkan
                </Pending>
                {applyState.error && <span className="text-status-overdue">{applyState.error}</span>}
                {applyState.success && <span className="text-status-on-track">{applyState.success}</span>}
              </div>
            </form>
          )}
          <p className="text-[11px] text-muted-foreground">Model: {analysis.model}. Hasil AI adalah usulan dan bisa keliru; periksa sebelum dipakai.</p>
        </div>
      )}
    </div>
  );
}

import Link from "next/link";

export function EmptyState({
  title,
  actionLabel,
  actionHref,
  onAction
}: {
  title: string;
  actionLabel?: string;
  /** Kalau diisi, tombol jadi Link navigasi (dipakai di Server Component, tidak butuh onClick). */
  actionHref?: string;
  /** Kalau diisi, tombol jadi button dengan handler (dipakai di Client Component). */
  onAction?: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-12 text-center">
      <p className="text-sm text-muted-foreground">{title}</p>
      {actionLabel && actionHref ? (
        <Link
          href={actionHref}
          className="mt-4 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
        >
          {actionLabel}
        </Link>
      ) : actionLabel && onAction ? (
        <button
          onClick={onAction}
          className="mt-4 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
        >
          {actionLabel}
        </button>
      ) : null}
    </div>
  );
}

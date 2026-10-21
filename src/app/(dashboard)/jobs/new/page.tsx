import { redirect } from "next/navigation";

/** Pekerjaan dibuat bersama klien (Tambah Klien) atau dari halaman klien ("+ Pekerjaan baru"). */
export default function NewJobPage({ searchParams }: { searchParams: { clientId?: string } }) {
  redirect(searchParams.clientId ? `/clients/${encodeURIComponent(searchParams.clientId)}` : "/clients/new");
}

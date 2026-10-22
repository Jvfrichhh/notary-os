import { redirect } from "next/navigation";
import { unwrapProps, type Async } from "@/lib/pageProps";

/** Pekerjaan dibuat bersama klien (Tambah Klien) atau dari halaman klien ("+ Pekerjaan baru"). */
export default async function NewJobPage(props: Async<{ searchParams: { clientId?: string } }>) {
  const { searchParams } = await unwrapProps(props);
  redirect(searchParams.clientId ? `/clients/${encodeURIComponent(searchParams.clientId)}` : "/clients/new");
}

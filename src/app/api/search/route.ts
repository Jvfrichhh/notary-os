import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { userHasPermission, PERMISSIONS } from "@/lib/permissions";

// Batas jumlah hasil per entity -- global search cuma untuk "lompat cepat"
// ke suatu record, bukan pengganti halaman list masing-masing modul (yang
// sudah punya filter/pagination sendiri). Query selalu server-side dan
// selalu dibatasi `take`, tidak pernah menarik seluruh tabel ke memori.
const RESULTS_PER_ENTITY = 5;
const MIN_QUERY_LENGTH = 2;

export type SearchResultItem = {
  id: string;
  title: string;
  subtitle: string | null;
  href: string;
};

export type SearchResultGroup = {
  entity: string;
  label: string;
  items: SearchResultItem[];
};

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Anda harus login." }, { status: 401 });
  }

  const q = (req.nextUrl.searchParams.get("q") ?? "").trim();
  if (q.length < MIN_QUERY_LENGTH) {
    return NextResponse.json({ groups: [] satisfies SearchResultGroup[] });
  }

  const userId = session.user.id;

  // Cek permission per-entity dulu (paralel), baru query entity yang
  // memang boleh diakses user ini -- konsisten dengan pola VIEW_* yang
  // dipakai tiap modul (clients/jobs/archive/notary-record).
  const [canViewClients, canViewJobs, canViewArchive, canViewRepertorium] = await Promise.all([
    userHasPermission(userId, PERMISSIONS.VIEW_CLIENTS),
    userHasPermission(userId, PERMISSIONS.VIEW_JOBS),
    userHasPermission(userId, PERMISSIONS.VIEW_MINUTA), // domain Deed/Minuta/Salinan/Grosse/Kutipan
    userHasPermission(userId, PERMISSIONS.VIEW_REPERTORIUM)
  ]);

  const insensitive = { contains: q, mode: "insensitive" as const };
  const deedMatch = {
    OR: [{ deedNumber: insensitive }, { deedType: insensitive }, { client: { fullName: insensitive } }]
  };

  const [clients, jobs, deeds, minuta, salinan, grosse, kutipan, repertoriums] = await Promise.all([
    canViewClients
      ? prisma.client.findMany({
          where: {
            status: "ACTIVE",
            OR: [
              { fullName: insensitive },
              { clientNumber: insensitive },
              { phone: insensitive },
              { email: insensitive },
              { companyName: insensitive }
            ]
          },
          take: RESULTS_PER_ENTITY,
          orderBy: { createdAt: "desc" }
        })
      : [],
    canViewJobs
      ? prisma.job.findMany({
          where: {
            recordStatus: "ACTIVE",
            OR: [{ jobNumber: insensitive }, { description: insensitive }, { client: { fullName: insensitive } }]
          },
          take: RESULTS_PER_ENTITY,
          orderBy: { createdAt: "desc" },
          include: { client: true }
        })
      : [],
    canViewArchive
      ? prisma.deed.findMany({
          where: { recordStatus: "ACTIVE", ...deedMatch },
          take: RESULTS_PER_ENTITY,
          orderBy: { createdAt: "desc" },
          include: { client: true }
        })
      : [],
    canViewArchive
      ? prisma.minuta.findMany({
          where: { recordStatus: "ACTIVE", deed: deedMatch },
          take: RESULTS_PER_ENTITY,
          orderBy: { createdAt: "desc" },
          include: { deed: { include: { client: true } } }
        })
      : [],
    canViewArchive
      ? prisma.salinan.findMany({
          where: { recordStatus: "ACTIVE", deed: deedMatch },
          take: RESULTS_PER_ENTITY,
          orderBy: { createdAt: "desc" },
          include: { deed: { include: { client: true } } }
        })
      : [],
    canViewArchive
      ? prisma.grosse.findMany({
          where: { recordStatus: "ACTIVE", deed: deedMatch },
          take: RESULTS_PER_ENTITY,
          orderBy: { createdAt: "desc" },
          include: { deed: { include: { client: true } } }
        })
      : [],
    canViewArchive
      ? prisma.kutipan.findMany({
          where: { recordStatus: "ACTIVE", deed: deedMatch },
          take: RESULTS_PER_ENTITY,
          orderBy: { createdAt: "desc" },
          include: { deed: { include: { client: true } } }
        })
      : [],
    canViewRepertorium
      ? prisma.repertorium.findMany({
          where: {
            recordStatus: "ACTIVE",
            OR: [
              { appearerName: insensitive },
              { deedType: insensitive },
              { deed: { deedNumber: insensitive } },
              { client: { fullName: insensitive } }
            ]
          },
          take: RESULTS_PER_ENTITY,
          orderBy: { createdAt: "desc" },
          include: { deed: true }
        })
      : []
  ]);

  const groups: SearchResultGroup[] = [
    {
      entity: "client",
      label: "Client",
      items: clients.map((c) => ({
        id: c.id,
        title: c.fullName,
        subtitle: c.clientNumber,
        href: `/clients/${c.id}`
      }))
    },
    {
      entity: "job",
      label: "Job",
      items: jobs.map((j) => ({
        id: j.id,
        title: j.jobNumber,
        subtitle: j.description || j.client.fullName,
        href: `/jobs/${j.id}`
      }))
    },
    {
      entity: "deed",
      label: "Akta",
      items: deeds.map((d) => ({
        id: d.id,
        title: d.deedNumber,
        subtitle: `${d.deedType} · ${d.client.fullName}`,
        href: `/archive/deed/${d.id}`
      }))
    },
    {
      entity: "minuta",
      label: "Minuta",
      items: minuta.map((m) => ({
        id: m.id,
        title: `Minuta — ${m.deed.deedNumber}`,
        subtitle: m.deed.client.fullName,
        href: `/archive/minuta/${m.id}`
      }))
    },
    {
      entity: "salinan",
      label: "Salinan",
      items: salinan.map((s) => ({
        id: s.id,
        title: `Salinan — ${s.deed.deedNumber}`,
        subtitle: s.deed.client.fullName,
        href: `/archive/salinan/${s.id}`
      }))
    },
    {
      entity: "grosse",
      label: "Grosse",
      items: grosse.map((g) => ({
        id: g.id,
        title: `Grosse — ${g.deed.deedNumber}`,
        subtitle: g.deed.client.fullName,
        href: `/archive/grosse/${g.id}`
      }))
    },
    {
      entity: "kutipan",
      label: "Kutipan",
      items: kutipan.map((k) => ({
        id: k.id,
        title: `Kutipan — ${k.deed.deedNumber}`,
        subtitle: k.deed.client.fullName,
        href: `/archive/kutipan/${k.id}`
      }))
    },
    {
      entity: "repertorium",
      label: "Repertorium",
      items: repertoriums.map((r) => ({
        id: r.id,
        title: r.appearerName,
        subtitle: `${r.deedType} · ${r.deed.deedNumber}`,
        href: `/notary-record/${r.id}`
      }))
    }
  ].filter((g) => g.items.length > 0);

  return NextResponse.json({ groups } satisfies { groups: SearchResultGroup[] });
}

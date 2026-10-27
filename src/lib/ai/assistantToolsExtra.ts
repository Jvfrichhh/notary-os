import { prisma } from "@/lib/prisma";
import { STAGE_LABELS } from "@/lib/ppatStages";
import { PERMISSIONS } from "@/lib/permissionKeys";
import type { Prisma } from "@prisma/client";
import type { ToolSpec } from "@/lib/ai/assistantTools";
import { gatherMonth, previousYm, isYm, REPORT_KINDS, REPORT_LABEL, reportDueDate, reportSentInfo } from "@/lib/compliance/monthly";

/**
 * Tool tambahan Asisten Kantor: cakupan seluruh data kantor (klien, dokumen,
 * akta & protokol, PPAT, legalisasi/waarmerking/wasiat, janji temu, keuangan,
 * statistik, laporan bulanan, staf, notifikasi, aktivitas portal klien).
 * Semua BACA-SAJA, hak akses dicek dua lapis (lihat assistantTools.ts).
 */

const LIMIT_MAX = 25;
const clampLimit = (v: unknown, dflt = 15) => Math.min(LIMIT_MAX, Math.max(1, Number(v) || dflt));
const str = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : undefined);
const int = (v: unknown) => {
  const n = Number(v);
  return Number.isInteger(n) ? n : undefined;
};
const iso = (d: Date | null | undefined) => (d ? d.toISOString().slice(0, 10) : null);
const num = (v: Prisma.Decimal | number | null | undefined) => (v === null || v === undefined ? null : Number(v));
const maskNik = (nik: string | null) => (nik ? `${"*".repeat(Math.max(0, nik.length - 4))}${nik.slice(-4)}` : null);
const OPEN_JOB = { recordStatus: "ACTIVE" as const, status: { notIn: ["COMPLETED", "CANCELLED"] as ("COMPLETED" | "CANCELLED")[] } };

/** Rentang tanggal dari {year, month} atau {from, to} (UTC-midnight, [start, end)). */
function period(input: Record<string, unknown>): { start: Date; end: Date; label: string } {
  const from = str(input.from);
  const to = str(input.to);
  if (from && to && !Number.isNaN(Date.parse(from)) && !Number.isNaN(Date.parse(to))) {
    const end = new Date(to);
    end.setUTCDate(end.getUTCDate() + 1);
    return { start: new Date(from), end, label: `${from} s.d. ${to}` };
  }
  const now = new Date();
  const year = int(input.year) ?? now.getUTCFullYear();
  const month = int(input.month);
  if (month && month >= 1 && month <= 12) {
    return { start: new Date(Date.UTC(year, month - 1, 1)), end: new Date(Date.UTC(year, month, 1)), label: `${year}-${String(month).padStart(2, "0")}` };
  }
  return { start: new Date(Date.UTC(year, 0, 1)), end: new Date(Date.UTC(year + 1, 0, 1)), label: String(year) };
}

const PERIOD_PROPS = {
  year: { type: "integer", description: "Tahun (default tahun berjalan)." },
  month: { type: "integer", minimum: 1, maximum: 12, description: "Bulan 1-12 (opsional; kosong = setahun penuh)." },
  from: { type: "string", description: "YYYY-MM-DD; dipakai bersama `to` untuk rentang bebas." },
  to: { type: "string", description: "YYYY-MM-DD." }
};

const clientWhere = (q: string): Prisma.ClientWhereInput => ({
  status: "ACTIVE",
  OR: [{ clientNumber: { equals: q, mode: "insensitive" } }, { fullName: { contains: q, mode: "insensitive" } }, { companyName: { contains: q, mode: "insensitive" } }]
});

export const EXTRA_TOOLS: Record<string, ToolSpec> = {
  get_client: {
    permission: PERMISSIONS.VIEW_CLIENTS,
    def: {
      name: "get_client",
      description:
        "Detail SATU klien: kontak, pekerjaan/profesi, status akses portal, semua pekerjaannya (nomor, status, tenggat, layanan), dokumen terbaru, dan tagihan yang belum lunas. Pakai saat user menyebut nama/nomor klien tertentu, mis. 'bagaimana progres klien Budi?' atau 'CLI-0012 punya pekerjaan apa saja?'. Bila beberapa klien cocok, tool mengembalikan daftar kandidat.",
      input_schema: { type: "object", properties: { query: { type: "string", description: "Nomor klien atau (potongan) nama." } }, required: ["query"] }
    },
    run: async (input, ctx) => {
      const q = str(input.query);
      if (!q) return { error: "query wajib diisi." };
      const matches = await prisma.client.findMany({
        where: clientWhere(q),
        select: { id: true, clientNumber: true, fullName: true, companyName: true, city: true },
        take: 6,
        orderBy: { fullName: "asc" }
      });
      if (matches.length === 0) return { found: false };
      const exact = matches.find((m) => m.clientNumber.toLowerCase() === q.toLowerCase() || m.fullName.toLowerCase() === q.toLowerCase());
      if (matches.length > 1 && !exact) return { found: true, ambiguous: true, candidates: matches.map((m) => ({ clientNumber: m.clientNumber, name: m.fullName, company: m.companyName, city: m.city })) };
      const id = (exact ?? matches[0]).id;
      const canFinance = ctx.permissions.has(PERMISSIONS.VIEW_FINANCE);
      const canDocs = ctx.permissions.has(PERMISSIONS.VIEW_DOCUMENTS);
      const [c, jobs, docs, unpaid] = await Promise.all([
        prisma.client.findUnique({
          where: { id },
          select: {
            clientNumber: true,
            fullName: true,
            clientType: true,
            companyName: true,
            nik: true,
            phone: true,
            email: true,
            address: true,
            city: true,
            occupation: true,
            createdAt: true,
            dataConsentAt: true,
            accounts: { where: { isActive: true }, select: { email: true, lastLoginAt: true, mustChangePassword: true } }
          }
        }),
        prisma.job.findMany({
          where: { clientId: id, recordStatus: "ACTIVE" },
          select: { jobNumber: true, status: true, deadline: true, createdAt: true, completionDate: true, serviceType: { select: { name: true } }, pic: { select: { name: true } } },
          orderBy: { createdAt: "desc" },
          take: LIMIT_MAX
        }),
        canDocs
          ? prisma.document.findMany({ where: { clientId: id, status: "ACTIVE" }, select: { fileName: true, category: true, uploadedAt: true }, orderBy: { uploadedAt: "desc" }, take: 5 })
          : Promise.resolve([]),
        canFinance
          ? prisma.payment.aggregate({ where: { clientId: id, recordStatus: "ACTIVE", status: { in: ["UNPAID", "PARTIALLY_PAID"] } }, _sum: { remainingAmount: true }, _count: { _all: true } })
          : Promise.resolve(null)
      ]);
      if (!c) return { found: false };
      return {
        found: true,
        clientNumber: c.clientNumber,
        name: c.fullName,
        type: c.clientType,
        company: c.companyName,
        occupation: c.occupation,
        nikMasked: maskNik(c.nik),
        phone: c.phone,
        email: c.email,
        address: c.address,
        city: c.city,
        registeredAt: iso(c.createdAt),
        dataConsent: !!c.dataConsentAt,
        portal: c.accounts.length ? c.accounts.map((a) => ({ email: a.email, lastLogin: a.lastLoginAt?.toISOString() ?? null, mustChangePassword: a.mustChangePassword })) : "tidak punya akses portal",
        jobs: jobs.map((j) => ({ jobNumber: j.jobNumber, status: j.status, service: j.serviceType?.name ?? null, deadline: iso(j.deadline), createdAt: iso(j.createdAt), completedAt: iso(j.completionDate), pic: j.pic?.name ?? null })),
        recentDocuments: canDocs ? docs.map((d) => ({ fileName: d.fileName, category: d.category, uploadedAt: iso(d.uploadedAt) })) : "tidak berhak melihat dokumen",
        outstandingPayments: unpaid ? { count: unpaid._count._all, totalRemaining: num(unpaid._sum.remainingAmount) ?? 0 } : "tidak berhak melihat keuangan"
      };
    }
  },

  search_documents: {
    permission: PERMISSIONS.VIEW_DOCUMENTS,
    def: {
      name: "search_documents",
      description:
        "Cari dokumen di Document Vault berdasarkan nama file/keterangan, kategori, klien, nomor pekerjaan, atau rentang tanggal unggah. Pakai untuk 'ada file KTP Budi?', 'dokumen apa saja yang diunggah minggu ini?', 'file akta final JOB-2026-0003'.",
      input_schema: {
        type: "object",
        properties: {
          query: { type: "string", description: "Potongan nama file atau keterangan." },
          category: { type: "string", enum: ["CLIENT_DOCUMENT", "WORKING_DOCUMENT", "FINAL_DOCUMENT", "SUPPORTING_DOCUMENT"] },
          clientQuery: { type: "string" },
          jobNumber: { type: "string" },
          uploadedAfter: { type: "string", description: "YYYY-MM-DD" },
          uploadedBefore: { type: "string", description: "YYYY-MM-DD" },
          limit: { type: "integer", minimum: 1, maximum: LIMIT_MAX }
        }
      }
    },
    run: async (input) => {
      const q = str(input.query);
      const cq = str(input.clientQuery);
      const jn = str(input.jobNumber);
      const after = str(input.uploadedAfter);
      const before = str(input.uploadedBefore);
      const cat = str(input.category);
      const where: Prisma.DocumentWhereInput = {
        status: "ACTIVE",
        ...(q ? { OR: [{ fileName: { contains: q, mode: "insensitive" } }, { description: { contains: q, mode: "insensitive" } }] } : {}),
        ...(cat && ["CLIENT_DOCUMENT", "WORKING_DOCUMENT", "FINAL_DOCUMENT", "SUPPORTING_DOCUMENT"].includes(cat) ? { category: cat as Prisma.DocumentWhereInput["category"] } : {}),
        ...(cq ? { client: { OR: [{ fullName: { contains: cq, mode: "insensitive" } }, { clientNumber: { contains: cq, mode: "insensitive" } }] } } : {}),
        ...(jn ? { job: { jobNumber: { contains: jn, mode: "insensitive" } } } : {}),
        ...(after || before
          ? { uploadedAt: { ...(after && !Number.isNaN(Date.parse(after)) ? { gte: new Date(after) } : {}), ...(before && !Number.isNaN(Date.parse(before)) ? { lte: new Date(`${before}T23:59:59Z`) } : {}) } }
          : {})
      };
      const [rows, count] = await Promise.all([
        prisma.document.findMany({
          where,
          select: {
            fileName: true,
            category: true,
            fileSize: true,
            uploadedAt: true,
            description: true,
            client: { select: { clientNumber: true, fullName: true } },
            job: { select: { jobNumber: true } },
            uploader: { select: { name: true } },
            uploadedByClientAccount: { select: { email: true } },
            _count: { select: { minuta: true, salinan: true, grosse: true, kutipan: true, versions: true } }
          },
          orderBy: { uploadedAt: "desc" },
          take: clampLimit(input.limit)
        }),
        prisma.document.count({ where })
      ]);
      return {
        count,
        items: rows.map((d) => ({
          fileName: d.fileName,
          category: d.category,
          sizeKB: Math.round(d.fileSize / 1024),
          uploadedAt: iso(d.uploadedAt),
          uploader: d.uploader?.name ?? (d.uploadedByClientAccount ? "Klien (portal)" : null),
          client: d.client ? `${d.client.fullName} (${d.client.clientNumber})` : null,
          job: d.job?.jobNumber ?? null,
          description: d.description,
          isArchiveDeed: d._count.minuta + d._count.salinan + d._count.grosse + d._count.kutipan > 0,
          versions: d._count.versions
        }))
      };
    }
  },

  list_deeds: {
    permission: PERMISSIONS.VIEW_REPERTORIUM,
    def: {
      name: "list_deeds",
      description:
        "Daftar akta notaris dari Buku Daftar Akta (Repertorium): filter tahun, bulan, jenis akta, nama penghadap/klien, atau nomor akta. Dengan summaryOnly=true mengembalikan jumlah akta per bulan dan per jenis (untuk 'berapa akta bulan ini?', 'akta apa yang paling banyak tahun 2026?'). Pakai untuk 'akta nomor 12 tahun 2026 itu apa?', 'akta atas nama Budi'.",
      input_schema: {
        type: "object",
        properties: {
          year: { type: "integer" },
          month: { type: "integer", minimum: 1, maximum: 12 },
          deedType: { type: "string", description: "Potongan jenis/sifat akta, mis. 'kuasa', 'jual beli'." },
          query: { type: "string", description: "Potongan nama penghadap atau klien." },
          deedNumber: { type: "string" },
          summaryOnly: { type: "boolean" },
          limit: { type: "integer", minimum: 1, maximum: LIMIT_MAX }
        }
      }
    },
    run: async (input) => {
      const year = int(input.year);
      const month = int(input.month);
      const dt = str(input.deedType);
      const q = str(input.query);
      const dn = str(input.deedNumber);
      const range = year && month ? { gte: new Date(Date.UTC(year, month - 1, 1)), lt: new Date(Date.UTC(year, month, 1)) } : undefined;
      const where: Prisma.RepertoriumWhereInput = {
        recordStatus: "ACTIVE",
        ...(year && !range ? { year } : {}),
        ...(range ? { deedDate: range } : {}),
        ...(dt ? { deedType: { contains: dt, mode: "insensitive" } } : {}),
        ...(q ? { OR: [{ appearerName: { contains: q, mode: "insensitive" } }, { client: { fullName: { contains: q, mode: "insensitive" } } }] } : {}),
        ...(dn ? { deed: { deedNumber: { contains: dn, mode: "insensitive" } } } : {})
      };
      if (input.summaryOnly === true) {
        const rows = await prisma.repertorium.findMany({ where, select: { deedDate: true, deedType: true } });
        const perMonth: Record<string, number> = {};
        const perType: Record<string, number> = {};
        for (const r of rows) {
          const k = r.deedDate.toISOString().slice(0, 7);
          perMonth[k] = (perMonth[k] ?? 0) + 1;
          perType[r.deedType] = (perType[r.deedType] ?? 0) + 1;
        }
        return { total: rows.length, perMonth, perType };
      }
      const [rows, count] = await Promise.all([
        prisma.repertorium.findMany({
          where,
          select: { sequenceNumber: true, year: true, deedDate: true, deedType: true, appearerName: true, description: true, deed: { select: { deedNumber: true, status: true } }, client: { select: { clientNumber: true, fullName: true } }, job: { select: { jobNumber: true } } },
          orderBy: [{ year: "desc" }, { sequenceNumber: "desc" }],
          take: clampLimit(input.limit)
        }),
        prisma.repertorium.count({ where })
      ]);
      return {
        count,
        items: rows.map((r) => ({ sequence: `${r.sequenceNumber}/${r.year}`, deedNumber: r.deed.deedNumber, date: iso(r.deedDate), deedType: r.deedType, appearer: r.appearerName, client: r.client ? `${r.client.fullName} (${r.client.clientNumber})` : null, job: r.job?.jobNumber ?? null, status: r.deed.status, description: r.description }))
      };
    }
  },

  get_deed: {
    permission: PERMISSIONS.VIEW_MINUTA,
    def: {
      name: "get_deed",
      description:
        "Detail satu akta notaris berdasarkan nomor akta (atau nomor urut repertorium + tahun): tanggal, jenis, penghadap, klien, pekerjaan, serta dokumen protokol yang sudah ada (minuta, salinan, grosse, kutipan). Pakai untuk 'minuta akta nomor 5 sudah diarsipkan?', 'salinan akta 12/2026 sudah dibuat?'.",
      input_schema: { type: "object", properties: { deedNumber: { type: "string" }, sequence: { type: "integer", description: "Nomor urut repertorium." }, year: { type: "integer" } } }
    },
    run: async (input) => {
      const dn = str(input.deedNumber);
      const seq = int(input.sequence);
      const year = int(input.year);
      const where: Prisma.DeedWhereInput = dn
        ? { recordStatus: "ACTIVE", deedNumber: { contains: dn, mode: "insensitive" } }
        : seq && year
          ? { recordStatus: "ACTIVE", repertorium: { sequenceNumber: seq, year } }
          : {};
      if (!Object.keys(where).length) return { error: "Sebutkan deedNumber, atau sequence + year." };
      const d = await prisma.deed.findFirst({
        where,
        select: {
          deedNumber: true,
          deedDate: true,
          deedType: true,
          status: true,
          client: { select: { clientNumber: true, fullName: true } },
          job: { select: { jobNumber: true, status: true } },
          notary: { select: { name: true } },
          repertorium: { select: { sequenceNumber: true, year: true, appearerName: true, description: true } },
          minuta: { where: { recordStatus: "ACTIVE" }, select: { createdAt: true, document: { select: { fileName: true } } } },
          salinan: { where: { recordStatus: "ACTIVE" }, select: { createdAt: true, document: { select: { fileName: true } } } },
          grosse: { where: { recordStatus: "ACTIVE" }, select: { createdAt: true, status: true, document: { select: { fileName: true } } } },
          kutipan: { where: { recordStatus: "ACTIVE" }, select: { createdAt: true, status: true, document: { select: { fileName: true } } } }
        },
        orderBy: { deedDate: "desc" }
      });
      if (!d) return { found: false };
      const files = (xs: { createdAt: Date; status?: string; document: { fileName: string } | null }[]) => xs.map((x) => ({ at: iso(x.createdAt), status: x.status ?? null, file: x.document?.fileName ?? null }));
      return {
        found: true,
        deedNumber: d.deedNumber,
        date: iso(d.deedDate),
        deedType: d.deedType,
        status: d.status,
        repertorium: d.repertorium ? { sequence: `${d.repertorium.sequenceNumber}/${d.repertorium.year}`, appearer: d.repertorium.appearerName, description: d.repertorium.description } : null,
        client: `${d.client.fullName} (${d.client.clientNumber})`,
        job: d.job ? { jobNumber: d.job.jobNumber, status: d.job.status } : null,
        notary: d.notary?.name ?? null,
        protocol: { minuta: files(d.minuta), salinan: files(d.salinan), grosse: files(d.grosse), kutipan: files(d.kutipan) }
      };
    }
  },

  list_ppat_deeds: {
    permission: PERMISSIONS.VIEW_REPERTORIUM,
    def: {
      name: "list_ppat_deeds",
      description:
        "Akta PPAT dari Buku Daftar Akta PPAT (Jual Beli, Hibah, APHT, dll.): filter tahun, jenis, nama pihak, nomor akta. Menampilkan para pihak, objek (hak, letak, luas), nilai, pajak, apakah sudah disampaikan ke Kantor Pertanahan, dan tahapan proses PPAT yang sudah selesai. Pakai untuk 'AJB bulan ini ada berapa?', 'akta PPAT yang belum dikirim ke BPN', 'progres sertipikat JOB-2026-0010'.",
      input_schema: {
        type: "object",
        properties: {
          year: { type: "integer" },
          month: { type: "integer", minimum: 1, maximum: 12 },
          deedType: { type: "string", description: "mis. 'Jual Beli', 'Hibah', 'APHT'." },
          query: { type: "string", description: "Potongan nama pihak / klien / nomor pekerjaan." },
          deedNumber: { type: "string" },
          notSubmittedOnly: { type: "boolean", description: "Hanya yang belum disampaikan ke Kantor Pertanahan." },
          limit: { type: "integer", minimum: 1, maximum: LIMIT_MAX }
        }
      }
    },
    run: async (input) => {
      const year = int(input.year);
      const month = int(input.month);
      const dt = str(input.deedType);
      const q = str(input.query);
      const dn = str(input.deedNumber);
      const where: Prisma.PpatDeedWhereInput = {
        recordStatus: "ACTIVE",
        ...(year && !month ? { year } : {}),
        ...(year && month ? { deedDate: { gte: new Date(Date.UTC(year, month - 1, 1)), lt: new Date(Date.UTC(year, month, 1)) } } : {}),
        ...(dt ? { deedType: { contains: dt, mode: "insensitive" } } : {}),
        ...(dn ? { deedNumber: { contains: dn, mode: "insensitive" } } : {}),
        ...(input.notSubmittedOnly === true ? { submittedToBpnAt: null } : {}),
        ...(q
          ? { OR: [{ partyFrom: { contains: q, mode: "insensitive" } }, { partyTo: { contains: q, mode: "insensitive" } }, { client: { fullName: { contains: q, mode: "insensitive" } } }, { job: { jobNumber: { contains: q, mode: "insensitive" } } }] }
          : {})
      };
      const [rows, count] = await Promise.all([
        prisma.ppatDeed.findMany({
          where,
          select: {
            deedNumber: true,
            deedDate: true,
            deedType: true,
            partyFrom: true,
            partyTo: true,
            rightType: true,
            location: true,
            landArea: true,
            buildingArea: true,
            transactionValue: true,
            njopValue: true,
            sspDate: true,
            sspdDate: true,
            submittedToBpnAt: true,
            client: { select: { clientNumber: true, fullName: true } },
            job: { select: { jobNumber: true, status: true, ppatStages: { select: { step: true, doneAt: true, reference: true }, orderBy: { doneAt: "asc" } } } }
          },
          orderBy: [{ year: "desc" }, { sequence: "desc" }],
          take: clampLimit(input.limit)
        }),
        prisma.ppatDeed.count({ where })
      ]);
      return {
        count,
        items: rows.map((p) => ({
          deedNumber: p.deedNumber,
          date: iso(p.deedDate),
          deedType: p.deedType,
          partyFrom: p.partyFrom,
          partyTo: p.partyTo,
          object: { rightType: p.rightType, location: p.location, landArea: p.landArea, buildingArea: p.buildingArea },
          transactionValue: num(p.transactionValue),
          njop: num(p.njopValue),
          sspPphDate: iso(p.sspDate),
          sspdBphtbDate: iso(p.sspdDate),
          submittedToBpnAt: iso(p.submittedToBpnAt),
          client: p.client ? `${p.client.fullName} (${p.client.clientNumber})` : null,
          job: p.job ? { jobNumber: p.job.jobNumber, status: p.job.status, stagesDone: p.job.ppatStages.map((s) => ({ step: STAGE_LABELS[s.step] ?? s.step, doneAt: iso(s.doneAt), reference: s.reference })) } : null
        }))
      };
    }
  },

  list_service_records: {
    permission: PERMISSIONS.VIEW_LEGALISASI,
    def: {
      name: "list_service_records",
      description:
        "Daftar legalisasi, waarmerking, atau akta wasiat: filter tahun, bulan, nama klien. Mengembalikan nomor, tanggal, klien, jenis layanan/wasiat, status, dan jumlah. Pakai untuk 'berapa legalisasi bulan Oktober?', 'waarmerking atas nama PT Maju', 'wasiat yang belum dilaporkan'.",
      input_schema: {
        type: "object",
        properties: {
          kind: { type: "string", enum: ["legalisasi", "waarmerking", "wasiat"] },
          year: { type: "integer" },
          month: { type: "integer", minimum: 1, maximum: 12 },
          clientQuery: { type: "string" },
          limit: { type: "integer", minimum: 1, maximum: LIMIT_MAX }
        },
        required: ["kind"]
      }
    },
    run: async (input, ctx) => {
      const kind = str(input.kind);
      const year = int(input.year);
      const month = int(input.month);
      const cq = str(input.clientQuery);
      const range = year ? (month ? { gte: new Date(Date.UTC(year, month - 1, 1)), lt: new Date(Date.UTC(year, month, 1)) } : { gte: new Date(Date.UTC(year, 0, 1)), lt: new Date(Date.UTC(year + 1, 0, 1)) }) : undefined;
      const client = cq ? { client: { OR: [{ fullName: { contains: cq, mode: "insensitive" as const } }, { clientNumber: { contains: cq, mode: "insensitive" as const } }] } } : {};
      const take = clampLimit(input.limit);
      if (kind === "legalisasi") {
        const where: Prisma.LegalisasiWhereInput = { recordStatus: "ACTIVE", ...(range ? { date: range } : {}), ...client };
        const [rows, count] = await Promise.all([
          prisma.legalisasi.findMany({ where, select: { number: true, date: true, serviceType: true, status: true, client: { select: { fullName: true, clientNumber: true } }, pic: { select: { name: true } } }, orderBy: { date: "desc" }, take }),
          prisma.legalisasi.count({ where })
        ]);
        return { kind, count, items: rows.map((r) => ({ number: r.number, date: iso(r.date), client: `${r.client.fullName} (${r.client.clientNumber})`, serviceType: r.serviceType, status: r.status, pic: r.pic?.name ?? null })) };
      }
      if (kind === "waarmerking") {
        if (!ctx.permissions.has(PERMISSIONS.VIEW_WAARMERKING)) return { error: "Anda tidak berhak melihat waarmerking." };
        const where: Prisma.WaarmerkingWhereInput = { recordStatus: "ACTIVE", ...(range ? { date: range } : {}), ...client };
        const [rows, count] = await Promise.all([
          prisma.waarmerking.findMany({ where, select: { number: true, date: true, serviceType: true, status: true, client: { select: { fullName: true, clientNumber: true } }, pic: { select: { name: true } } }, orderBy: { date: "desc" }, take }),
          prisma.waarmerking.count({ where })
        ]);
        return { kind, count, items: rows.map((r) => ({ number: r.number, date: iso(r.date), client: `${r.client.fullName} (${r.client.clientNumber})`, serviceType: r.serviceType, status: r.status, pic: r.pic?.name ?? null })) };
      }
      if (kind === "wasiat") {
        if (!ctx.permissions.has(PERMISSIONS.VIEW_WASIAT)) return { error: "Anda tidak berhak melihat akta wasiat." };
        const where: Prisma.WasiatWhereInput = { recordStatus: "ACTIVE", ...(range ? { date: range } : {}), ...client };
        const [rows, count] = await Promise.all([
          prisma.wasiat.findMany({ where, select: { deedNumber: true, date: true, wasiatType: true, status: true, client: { select: { fullName: true, clientNumber: true } }, job: { select: { jobNumber: true } } }, orderBy: { date: "desc" }, take }),
          prisma.wasiat.count({ where })
        ]);
        return { kind, count, items: rows.map((r) => ({ deedNumber: r.deedNumber, date: iso(r.date), client: `${r.client.fullName} (${r.client.clientNumber})`, wasiatType: r.wasiatType, status: r.status, job: r.job?.jobNumber ?? null })) };
      }
      return { error: "kind harus legalisasi, waarmerking, atau wasiat." };
    }
  },

  appointments: {
    permission: PERMISSIONS.VIEW_JOBS,
    def: {
      name: "appointments",
      description:
        "Janji temu / jadwal (penandatanganan, pertemuan, tindak lanjut) dalam N hari ke depan (default 7), pada rentang tanggal tertentu, atau untuk klien/pekerjaan tertentu. Pakai untuk 'jadwal besok apa?', 'kapan tanda tangan JOB-2026-0003?', 'ada janji dengan Budi?'.",
      input_schema: {
        type: "object",
        properties: {
          days: { type: "integer", minimum: 1, maximum: 90, description: "N hari ke depan dari hari ini." },
          from: { type: "string", description: "YYYY-MM-DD" },
          to: { type: "string", description: "YYYY-MM-DD" },
          clientQuery: { type: "string" },
          jobNumber: { type: "string" },
          includePast: { type: "boolean", description: "Sertakan janji yang sudah lewat (default false)." }
        }
      }
    },
    run: async (input) => {
      const from = str(input.from);
      const to = str(input.to);
      const cq = str(input.clientQuery);
      const jn = str(input.jobNumber);
      const today = new Date();
      today.setUTCHours(0, 0, 0, 0);
      let range: Prisma.DateTimeFilter | undefined;
      if (from && !Number.isNaN(Date.parse(from))) {
        const end = to && !Number.isNaN(Date.parse(to)) ? new Date(to) : new Date(from);
        end.setUTCDate(end.getUTCDate() + 1);
        range = { gte: new Date(from), lt: end };
      } else if (!input.includePast || input.days) {
        const days = Math.min(90, Math.max(1, Number(input.days) || 7));
        range = { gte: today, lt: new Date(today.getTime() + (days + 1) * 86_400_000) };
      }
      const where: Prisma.AppointmentWhereInput = {
        ...(range ? { date: range } : {}),
        ...(cq ? { client: { OR: [{ fullName: { contains: cq, mode: "insensitive" } }, { clientNumber: { contains: cq, mode: "insensitive" } }] } } : {}),
        ...(jn ? { job: { jobNumber: { contains: jn, mode: "insensitive" } } } : {})
      };
      const rows = await prisma.appointment.findMany({
        where,
        select: { title: true, date: true, time: true, type: true, notes: true, client: { select: { fullName: true, clientNumber: true } }, job: { select: { jobNumber: true, status: true, pic: { select: { name: true } } } } },
        orderBy: [{ date: "asc" }, { time: "asc" }],
        take: LIMIT_MAX
      });
      return rows.map((a) => ({ date: iso(a.date), time: a.time, title: a.title, type: a.type, notes: a.notes, client: a.client ? `${a.client.fullName} (${a.client.clientNumber})` : null, job: a.job?.jobNumber ?? null, jobStatus: a.job?.status ?? null, pic: a.job?.pic?.name ?? null }));
    }
  },

  finance_summary: {
    permission: PERMISSIONS.VIEW_FINANCE,
    def: {
      name: "finance_summary",
      description:
        "Ringkasan keuangan untuk satu periode (tahun, bulan, atau rentang tanggal): tagihan yang diterbitkan (jumlah & total), pembayaran masuk (kuitansi: jumlah & total), sisa piutang saat ini, klien dengan piutang terbesar, dan daftar kuitansi dalam periode itu. Pakai untuk 'pemasukan bulan ini berapa?', 'total tagihan tahun 2026', 'siapa yang paling banyak nunggak?'.",
      input_schema: { type: "object", properties: { ...PERIOD_PROPS, limit: { type: "integer", minimum: 1, maximum: LIMIT_MAX } } }
    },
    run: async (input) => {
      const p = period(input);
      const [issued, paid, outstanding, receipts, topDebtors] = await Promise.all([
        prisma.payment.aggregate({ where: { recordStatus: "ACTIVE", createdAt: { gte: p.start, lt: p.end } }, _count: { _all: true }, _sum: { totalAmount: true } }),
        prisma.paymentReceipt.aggregate({ where: { voidedAt: null, paidAt: { gte: p.start, lt: p.end }, payment: { recordStatus: "ACTIVE" } }, _count: { _all: true }, _sum: { amount: true } }),
        prisma.payment.aggregate({ where: { recordStatus: "ACTIVE", status: { in: ["UNPAID", "PARTIALLY_PAID"] } }, _count: { _all: true }, _sum: { remainingAmount: true } }),
        prisma.paymentReceipt.findMany({
          where: { voidedAt: null, paidAt: { gte: p.start, lt: p.end }, payment: { recordStatus: "ACTIVE" } },
          select: { receiptNumber: true, amount: true, paidAt: true, method: true, payment: { select: { invoiceNumber: true, client: { select: { fullName: true } }, job: { select: { jobNumber: true } } } }, receivedBy: { select: { name: true } } },
          orderBy: { paidAt: "desc" },
          take: clampLimit(input.limit)
        }),
        prisma.payment.groupBy({ by: ["clientId"], where: { recordStatus: "ACTIVE", status: { in: ["UNPAID", "PARTIALLY_PAID"] } }, _sum: { remainingAmount: true }, orderBy: { _sum: { remainingAmount: "desc" } }, take: 5 })
      ]);
      const debtorClients = topDebtors.length
        ? await prisma.client.findMany({ where: { id: { in: topDebtors.map((t) => t.clientId) } }, select: { id: true, fullName: true, clientNumber: true } })
        : [];
      const nameOf = new Map(debtorClients.map((c) => [c.id, `${c.fullName} (${c.clientNumber})`]));
      return {
        period: p.label,
        invoicesIssued: { count: issued._count._all, total: num(issued._sum.totalAmount) ?? 0 },
        paymentsReceived: { count: paid._count._all, total: num(paid._sum.amount) ?? 0 },
        outstandingNow: { count: outstanding._count._all, total: num(outstanding._sum.remainingAmount) ?? 0 },
        topOutstandingClients: topDebtors.map((t) => ({ client: nameOf.get(t.clientId) ?? t.clientId, remaining: num(t._sum.remainingAmount) ?? 0 })),
        receipts: receipts.map((r) => ({ receiptNumber: r.receiptNumber, invoice: r.payment.invoiceNumber, amount: num(r.amount), paidAt: iso(r.paidAt), method: r.method, client: r.payment.client.fullName, job: r.payment.job?.jobNumber ?? null, receivedBy: r.receivedBy?.name ?? null }))
      };
    }
  },

  office_stats: {
    permission: PERMISSIONS.VIEW_JOBS,
    def: {
      name: "office_stats",
      description:
        "Statistik kantor untuk satu periode (tahun, bulan, atau rentang): klien baru, pekerjaan masuk, pekerjaan selesai, rata-rata hari penyelesaian, sebaran per jenis layanan, beban kerja per staf (pekerjaan berjalan per PIC), jumlah akta notaris & akta PPAT. Pakai untuk 'berapa klien baru tahun ini?', 'layanan apa yang paling laris?', 'siapa staf yang paling banyak pekerjaannya?', 'rata-rata selesai berapa hari?'.",
      input_schema: { type: "object", properties: PERIOD_PROPS }
    },
    run: async (input, ctx) => {
      const p = period(input);
      const inPeriod = { gte: p.start, lt: p.end };
      const [newClients, jobsCreated, completed, byService, byPic, deeds, ppat] = await Promise.all([
        prisma.client.count({ where: { status: "ACTIVE", createdAt: inPeriod } }),
        prisma.job.count({ where: { recordStatus: "ACTIVE", createdAt: inPeriod } }),
        prisma.job.findMany({ where: { recordStatus: "ACTIVE", status: "COMPLETED", completionDate: inPeriod }, select: { createdAt: true, completionDate: true } }),
        prisma.job.groupBy({ by: ["serviceTypeId"], where: { recordStatus: "ACTIVE", createdAt: inPeriod }, _count: { _all: true } }),
        prisma.job.groupBy({ by: ["picId"], where: OPEN_JOB, _count: { _all: true } }),
        ctx.permissions.has(PERMISSIONS.VIEW_REPERTORIUM) ? prisma.repertorium.count({ where: { recordStatus: "ACTIVE", deedDate: inPeriod } }) : Promise.resolve(null),
        ctx.permissions.has(PERMISSIONS.VIEW_REPERTORIUM) ? prisma.ppatDeed.count({ where: { recordStatus: "ACTIVE", deedDate: inPeriod } }) : Promise.resolve(null)
      ]);
      const [services, users] = await Promise.all([
        prisma.serviceType.findMany({ where: { id: { in: byService.map((s) => s.serviceTypeId).filter((x): x is string => !!x) } }, select: { id: true, name: true } }),
        prisma.user.findMany({ where: { id: { in: byPic.map((s) => s.picId).filter((x): x is string => !!x) } }, select: { id: true, name: true } })
      ]);
      const sName = new Map(services.map((s) => [s.id, s.name]));
      const uName = new Map(users.map((u) => [u.id, u.name]));
      const durations = completed.map((j) => (j.completionDate!.getTime() - j.createdAt.getTime()) / 86_400_000);
      const avgDays = durations.length ? Math.round((durations.reduce((a, b) => a + b, 0) / durations.length) * 10) / 10 : null;
      return {
        period: p.label,
        newClients,
        jobsCreated,
        jobsCompleted: completed.length,
        avgDaysToComplete: avgDays,
        jobsByService: byService.map((s) => ({ service: s.serviceTypeId ? sName.get(s.serviceTypeId) ?? "?" : "(tanpa layanan)", count: s._count._all })).sort((a, b) => b.count - a.count),
        openJobsByPic: byPic.map((s) => ({ pic: s.picId ? uName.get(s.picId) ?? "?" : "(belum ada PIC)", openJobs: s._count._all })).sort((a, b) => b.openJobs - a.openJobs),
        notarialDeeds: deeds,
        ppatDeeds: ppat
      };
    }
  },

  monthly_report_status: {
    permission: PERMISSIONS.VIEW_REPERTORIUM,
    def: {
      name: "monthly_report_status",
      description:
        "Status laporan bulanan wajib untuk satu bulan (YYYY-MM, default bulan lalu): laporan ke Majelis Pengawas Daerah (MPD), laporan wasiat ke Daftar Pusat Wasiat, dan laporan bulanan PPAT -- sudah dikirim atau belum, tenggatnya, siapa yang mengirim, serta jumlah akta/legalisasi/waarmerking/wasiat/akta PPAT bulan itu. Pakai untuk 'laporan MPD bulan lalu sudah dikirim?', 'tenggat laporan wasiat kapan?'.",
      input_schema: { type: "object", properties: { month: { type: "string", description: "YYYY-MM" } } }
    },
    run: async (input) => {
      const ym = isYm(str(input.month)) ? (str(input.month) as string) : previousYm();
      const [data, sent] = await Promise.all([gatherMonth(ym), Promise.all(REPORT_KINDS.map((k) => reportSentInfo(k, ym)))]);
      return {
        month: ym,
        counts: { akta: data.akta.length, legalisasi: data.legalisasi.length, waarmerking: data.waarmerking.length, wasiat: data.wasiat.length, ppat: data.ppat.length },
        reports: REPORT_KINDS.map((k, i) => ({ kind: k, label: REPORT_LABEL[k], dueDate: iso(reportDueDate(k, ym)), sent: !!sent[i], sentAt: sent[i]?.at.toISOString() ?? null, sentBy: sent[i]?.by ?? null, note: sent[i]?.note ?? null }))
      };
    }
  },

  staff_directory: {
    permission: PERMISSIONS.VIEW_JOBS,
    def: {
      name: "staff_directory",
      description:
        "Daftar staf kantor yang aktif: nama, peran, jumlah pekerjaan berjalan sebagai PIC, tugas yang belum selesai, login terakhir. Pakai untuk 'siapa saja staf kantor?', 'siapa PIC paling sibuk?', 'tugas Rina yang belum selesai'.",
      input_schema: { type: "object", properties: { nameQuery: { type: "string" } } }
    },
    run: async (input, ctx) => {
      const nq = str(input.nameQuery);
      const users = await prisma.user.findMany({
        where: { isActive: true, ...(nq ? { name: { contains: nq, mode: "insensitive" } } : {}) },
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          lastLoginAt: true,
          role: { select: { name: true } },
          _count: { select: { jobsAsPic: { where: OPEN_JOB }, tasksAssigned: { where: { status: "TODO", job: { recordStatus: "ACTIVE" } } } } }
        },
        orderBy: { name: "asc" },
        take: LIMIT_MAX
      });
      const canSeeContact = ctx.permissions.has(PERMISSIONS.MANAGE_USERS);
      return users.map((u) => ({
        name: u.name,
        role: u.role.name,
        openJobsAsPic: u._count.jobsAsPic,
        pendingTasks: u._count.tasksAssigned,
        lastLogin: u.lastLoginAt?.toISOString() ?? null,
        ...(canSeeContact || u.id === ctx.userId ? { email: u.email, phone: u.phone } : {})
      }));
    }
  },

  my_notifications: {
    permission: PERMISSIONS.VIEW_JOBS,
    def: {
      name: "my_notifications",
      description: "Notifikasi milik user yang bertanya (default: yang belum dibaca, 15 terbaru). Pakai untuk 'ada notifikasi buat saya?', 'apa yang baru untuk saya hari ini?'.",
      input_schema: { type: "object", properties: { includeRead: { type: "boolean" } } }
    },
    run: async (input, ctx) => {
      const rows = await prisma.notification.findMany({
        where: { userId: ctx.userId, ...(input.includeRead === true ? {} : { isRead: false }) },
        select: { type: true, message: true, relatedEntityType: true, isRead: true, createdAt: true },
        orderBy: { createdAt: "desc" },
        take: 15
      });
      return rows.map((n) => ({ at: n.createdAt.toISOString(), type: n.type, message: n.message, about: n.relatedEntityType, read: n.isRead }));
    }
  },

  client_portal_activity: {
    permission: PERMISSIONS.VIEW_JOBS,
    def: {
      name: "client_portal_activity",
      description:
        "Aktivitas portal klien dalam N hari terakhir (default 7): unggahan dokumen klien yang menunggu pemeriksaan staf, dan draft akta yang dibagikan ke klien beserta tanggapannya (disetujui / minta revisi / belum dibaca). Pakai untuk 'ada unggahan klien yang belum diperiksa?', 'klien mana yang sudah menyetujui draft aktanya?'.",
      input_schema: { type: "object", properties: { days: { type: "integer", minimum: 1, maximum: 90 } } }
    },
    run: async (input) => {
      const days = Math.min(90, Math.max(1, Number(input.days) || 7));
      const since = new Date(Date.now() - days * 86_400_000);
      const [pending, uploads, reviews] = await Promise.all([
        prisma.checklistItem.findMany({
          where: { reviewStatus: "PENDING_REVIEW", checklist: { job: { recordStatus: "ACTIVE" } } },
          select: { label: true, attachedDocument: { select: { fileName: true, uploadedAt: true } }, checklist: { select: { job: { select: { jobNumber: true, client: { select: { fullName: true } } } } } } },
          take: LIMIT_MAX
        }),
        prisma.document.count({ where: { status: "ACTIVE", uploadedByClientAccountId: { not: null }, uploadedAt: { gte: since } } }),
        prisma.deedDraftReview.findMany({
          where: { sharedAt: { gte: since } },
          select: { sharedAt: true, decision: true, note: true, decidedAt: true, draft: { select: { title: true, templateKey: true, job: { select: { jobNumber: true, client: { select: { fullName: true } } } } } } },
          orderBy: { sharedAt: "desc" },
          take: LIMIT_MAX
        })
      ]);
      return {
        days,
        clientUploadsInPeriod: uploads,
        awaitingReview: pending.map((c) => ({ job: c.checklist.job.jobNumber, client: c.checklist.job.client.fullName, item: c.label, file: c.attachedDocument?.fileName ?? null, uploadedAt: iso(c.attachedDocument?.uploadedAt) })),
        draftReviews: reviews.map((r) => ({ job: r.draft.job.jobNumber, client: r.draft.job.client.fullName, draft: r.draft.title ?? r.draft.templateKey, sharedAt: iso(r.sharedAt), decision: r.decision ?? "belum ditanggapi", decidedAt: iso(r.decidedAt), note: r.note }))
      };
    }
  }
};

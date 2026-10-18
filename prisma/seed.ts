import { PrismaClient, JobStatus, JobPriority, DocumentCategory } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

// ----------------------------------------------------------------------------
// Permission catalogue — sesuai blueprint §13 / master prompt §23
// ----------------------------------------------------------------------------
const PERMISSIONS = [
  "view_clients", "create_clients", "edit_clients", "delete_clients",
  "view_visits", "create_visits",
  "view_jobs", "create_jobs", "edit_jobs", "delete_jobs",
  "view_documents", "upload_documents", "delete_documents",
  "view_finance", "edit_finance",
  "view_minuta", "edit_minuta",
  "view_repertorium", "edit_repertorium",
  "view_legalisasi", "edit_legalisasi",
  "view_waarmerking", "edit_waarmerking",
  "view_wasiat", "edit_wasiat",
  "view_audit_log",
  "manage_users",
  "manage_roles"
];

const ROLE_PERMISSIONS: Record<string, string[]> = {
  NOTARY: PERMISSIONS, // full access
  ADMIN: [
    "view_clients", "create_clients", "edit_clients",
    "view_visits", "create_visits",
    "view_jobs", "create_jobs", "edit_jobs",
    "view_documents", "upload_documents",
    "view_finance", "edit_finance",
    "view_minuta", "view_repertorium",
    "view_legalisasi", "view_waarmerking", "view_wasiat"
  ],
  STAFF: [
    "view_clients", "create_clients",
    "view_visits", "create_visits",
    "view_jobs", "create_jobs", "edit_jobs",
    "view_documents", "upload_documents"
  ],
  VIEWER: [
    "view_clients", "view_visits", "view_jobs", "view_documents", "view_finance", "view_minuta", "view_repertorium",
    "view_legalisasi", "view_waarmerking", "view_wasiat"
  ]
};

/** Host & nama database dari DATABASE_URL, tanpa password (untuk ditampilkan). */
function describeDatabaseTarget(): string {
  try {
    const u = new URL(process.env.DATABASE_URL ?? "");
    return `${u.hostname}:${u.port || "5432"}${u.pathname}`;
  } catch {
    return "(DATABASE_URL tidak valid / tidak diset)";
  }
}

async function main() {
  console.log(`Target database: ${describeDatabaseTarget()}`);

  // PENGAMAN: seed ini berisi DATA DEMO dan tidak idempoten (beberapa create
  // tanpa upsert). Ia hanya dimaksudkan untuk database pengujian yang masih
  // kosong. Kalau database sudah berisi data, hentikan -- kecuali operator
  // secara eksplisit menyatakan paham dengan SEED_ALLOW_EXISTING_DATA=1.
  const [userCount, clientCount, jobCount] = await Promise.all([
    prisma.user.count(),
    prisma.client.count(),
    prisma.job.count()
  ]);
  if ((userCount > 0 || clientCount > 0 || jobCount > 0) && process.env.SEED_ALLOW_EXISTING_DATA !== "1") {
    console.error(
      `\nDIHENTIKAN: database sudah berisi data (users=${userCount}, clients=${clientCount}, jobs=${jobCount}).` +
        "\nSeed hanya untuk database pengujian yang kosong. Jika Anda yakin ini BUKAN database produksi," +
        "\njalankan ulang dengan SEED_ALLOW_EXISTING_DATA=1."
    );
    process.exit(2);
  }

  console.log("Seeding database...");

  // 1. Permissions
  for (const key of PERMISSIONS) {
    await prisma.permission.upsert({
      where: { key },
      update: {},
      create: { key }
    });
  }

  // 2. Roles + role_permissions
  const roles: Record<string, { id: string }> = {};
  for (const roleName of Object.keys(ROLE_PERMISSIONS)) {
    const role = await prisma.role.upsert({
      where: { name: roleName },
      update: {},
      create: { name: roleName, description: `${roleName} role` }
    });
    roles[roleName] = role;

    for (const permKey of ROLE_PERMISSIONS[roleName]) {
      const perm = await prisma.permission.findUniqueOrThrow({ where: { key: permKey } });
      await prisma.rolePermission.upsert({
        where: { roleId_permissionId: { roleId: role.id, permissionId: perm.id } },
        update: {},
        create: { roleId: role.id, permissionId: perm.id }
      });
    }
  }

  // 3. Demo users — satu per role. PASSWORD SAMA UNTUK SEMUA: "password123" (ganti setelah demo)
  const passwordHash = await bcrypt.hash("password123", 10);

  const demoUsers = [
    { name: "Budi Notaris", email: "notary@demo.local", role: "NOTARY" },
    { name: "Admin Kantor", email: "admin@demo.local", role: "ADMIN" },
    { name: "Staff Satu", email: "staff@demo.local", role: "STAFF" },
    { name: "Viewer Kantor", email: "viewer@demo.local", role: "VIEWER" }
  ];

  const users: Record<string, { id: string }> = {};
  for (const u of demoUsers) {
    const user = await prisma.user.upsert({
      where: { email: u.email },
      update: {},
      create: {
        name: u.name,
        email: u.email,
        passwordHash,
        roleId: roles[u.role].id
      }
    });
    users[u.role] = user;
  }

  // 4. Service types + template
  const ajb = await prisma.serviceType.upsert({
    where: { name: "Akta Jual Beli" },
    update: {},
    create: { name: "Akta Jual Beli", category: "Pertanahan" }
  });

  await prisma.serviceTemplate.create({
    data: {
      serviceTypeId: ajb.id,
      name: "Template Akta Jual Beli",
      defaultChecklist: [
        { label: "KTP Penjual", isRequired: true },
        { label: "KTP Pembeli", isRequired: true },
        { label: "Kartu Keluarga", isRequired: true },
        { label: "Sertifikat", isRequired: true },
        { label: "SPPT/PBB", isRequired: true },
        { label: "Bukti BPHTB", isRequired: false }
      ],
      defaultTasks: [
        { title: "Verifikasi dokumen penjual" },
        { title: "Verifikasi dokumen pembeli" },
        { title: "Siapkan draft akta" },
        { title: "Jadwalkan penandatanganan" }
      ]
    }
  });

  // 5. Sample client
  const client = await prisma.client.upsert({
    where: { clientNumber: "CLI-0001" },
    update: {},
    create: {
      clientNumber: "CLI-0001",
      fullName: "Budi Santoso",
      clientType: "Individu",
      phone: "081234567890",
      email: "budi.santoso@example.com",
      city: "Jakarta Selatan",
      status: "ACTIVE"
    }
  });

  // 6. Sample visit
  const visit = await prisma.visit.create({
    data: {
      clientId: client.id,
      visitorName: client.fullName,
      phone: client.phone,
      purpose: "Akta Jual Beli",
      serviceCategory: "Pertanahan",
      staffId: users.STAFF.id,
      status: "ACTIVE"
    }
  });

  // 7. Sample job (created from the visit)
  const seedJobYear = new Date().getFullYear();
  const seedJobNumber = `JOB-${seedJobYear}-0001`;

  const job = await prisma.job.create({
    data: {
      jobNumber: seedJobNumber,
      clientId: client.id,
      visitId: visit.id,
      serviceTypeId: ajb.id,
      description: "Akta Jual Beli tanah di Jakarta Selatan",
      priority: JobPriority.NORMAL,
      status: JobStatus.IN_PROGRESS,
      deadline: new Date("2026-09-15"),
      picId: users.STAFF.id,
      reviewerId: users.NOTARY.id,
      notaryId: users.NOTARY.id,
      startDate: new Date()
    }
  });

  // Selaraskan job_number_counters supaya job berikutnya yang dibuat lewat
  // UI (generateJobNumber di src/lib/idGenerators.ts) tidak bentrok dengan
  // nomor yang sudah dipakai job seed ini.
  await bumpJobNumberCounter(seedJobYear, 1);

  // 8. Checklist for the job
  const checklist = await prisma.jobChecklist.create({
    data: { jobId: job.id }
  });

  await prisma.checklistItem.createMany({
    data: [
      { checklistId: checklist.id, label: "KTP Penjual", isRequired: true, status: "COMPLETE" },
      { checklistId: checklist.id, label: "KTP Pembeli", isRequired: true, status: "COMPLETE" },
      { checklistId: checklist.id, label: "Sertifikat", isRequired: true, status: "MISSING" },
      { checklistId: checklist.id, label: "SPPT/PBB", isRequired: true, status: "MISSING" }
    ]
  });

  // 9. Sample document
  await prisma.document.create({
    data: {
      jobId: job.id,
      clientId: client.id,
      fileName: "ktp-budi-santoso.pdf",
      fileType: "application/pdf",
      fileSize: 204800,
      category: DocumentCategory.CLIENT_DOCUMENT,
      uploadedBy: users.STAFF.id,
      description: "KTP klien",
      storageKey: "documents/demo/ktp-budi-santoso.pdf"
    }
  });

  // 10. Sample task
  await prisma.jobTask.createMany({
    data: [
      { jobId: job.id, title: "Verifikasi dokumen penjual", status: "DONE", assignedTo: users.STAFF.id, completedAt: new Date() },
      { jobId: job.id, title: "Siapkan draft akta", status: "IN_PROGRESS", assignedTo: users.STAFF.id }
    ]
  });

  // 11. Sample payment
  await prisma.payment.create({
    data: {
      jobId: job.id,
      clientId: client.id,
      totalAmount: 5000000,
      downPayment: 2000000,
      paidAmount: 2000000,
      remainingAmount: 3000000,
      status: "PARTIALLY_PAID"
    }
  });

  // 12. Audit log entry
  await prisma.auditLog.create({
    data: {
      userId: users.STAFF.id,
      action: "job_created",
      entityType: "Job",
      entityId: job.id,
      newValue: { status: "IN_PROGRESS" }
    }
  });

  // 13. Notification sample
  await prisma.notification.create({
    data: {
      userId: users.NOTARY.id,
      type: "job_assigned",
      message: `Job ${job.jobNumber} menunggu review Anda`,
      relatedEntityType: "Job",
      relatedEntityId: job.id
    }
  });

  // 14. Portal Klien — akun login untuk klien demo + klien kedua untuk uji
  //     isolasi antar-klien (klien A tidak boleh melihat job klien B).
  //     Semua pakai upsert supaya seed aman diulang.
  await prisma.clientAccount.upsert({
    where: { email: "client@demo.local" },
    update: {},
    create: {
      clientId: client.id,
      email: "client@demo.local",
      passwordHash,
      name: client.fullName
    }
  });

  const client2 = await prisma.client.upsert({
    where: { clientNumber: "CLI-0002" },
    update: {},
    create: {
      clientNumber: "CLI-0002",
      fullName: "Siti Aminah",
      clientType: "Individu",
      phone: "081298765432",
      email: "siti.aminah@example.com",
      city: "Depok",
      status: "ACTIVE"
    }
  });

  await prisma.clientAccount.upsert({
    where: { email: "client2@demo.local" },
    update: {},
    create: {
      clientId: client2.id,
      email: "client2@demo.local",
      passwordHash,
      name: client2.fullName
    }
  });

  const seedJob2Number = `JOB-${seedJobYear}-0002`;
  await prisma.job.upsert({
    where: { jobNumber: seedJob2Number },
    update: {},
    create: {
      jobNumber: seedJob2Number,
      clientId: client2.id,
      serviceTypeId: ajb.id,
      description: "Akta Jual Beli rumah di Depok",
      priority: JobPriority.NORMAL,
      status: JobStatus.WAITING_FOR_DOCUMENT,
      deadline: new Date("2026-11-30"),
      picId: users.STAFF.id,
      notaryId: users.NOTARY.id,
      startDate: new Date()
    }
  });
  // Counter nomor job ikut dinaikkan supaya job berikutnya dari UI = 0003.
  await bumpJobNumberCounter(seedJobYear, 2);

  console.log("Seed selesai.");
  console.log("Demo login (password sama untuk semua: password123):");
  demoUsers.forEach((u) => console.log(`  ${u.role.padEnd(7)} -> ${u.email}`));
  console.log("Portal klien (/portal/login), password sama:");
  console.log("  CLI-0001 -> client@demo.local");
  console.log("  CLI-0002 -> client2@demo.local");
}

/**
 * Naikkan counter nomor job ke MINIMAL `atLeast`, tanpa pernah menurunkan
 * nilai yang sudah ada (menurunkan counter = nomor job berikutnya bentrok).
 */
async function bumpJobNumberCounter(year: number, atLeast: number) {
  const current = await prisma.jobNumberCounter.findUnique({ where: { year } });
  if (!current) {
    await prisma.jobNumberCounter.create({ data: { year, value: atLeast } });
  } else if (current.value < atLeast) {
    await prisma.jobNumberCounter.update({ where: { year }, data: { value: atLeast } });
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

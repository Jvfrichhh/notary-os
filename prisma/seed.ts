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

async function main() {
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
  await prisma.jobNumberCounter.upsert({
    where: { year: seedJobYear },
    update: { value: 1 },
    create: { year: seedJobYear, value: 1 }
  });

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

  console.log("Seed selesai.");
  console.log("Demo login (password sama untuk semua: password123):");
  demoUsers.forEach((u) => console.log(`  ${u.role.padEnd(7)} -> ${u.email}`));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

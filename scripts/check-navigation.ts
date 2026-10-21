/**
 * Pemeriksaan cepat (tanpa database): untuk tiap role bawaan di prisma/seed.ts,
 * menu apa yang akan tampil di sidebar, dan pastikan tidak ada menu yang
 * "bocor" ke role yang tidak punya izinnya.
 *
 * Jalankan:  npx tsx scripts/check-navigation.ts
 */
import { filterNavSections, NAV_SECTIONS, canAccessNavItem } from "../src/lib/navigation";
import { PERMISSIONS } from "../src/lib/permissionKeys";

// Salinan ROLE_PERMISSIONS dari prisma/seed.ts (seed.ts tidak bisa di-import
// langsung karena butuh koneksi Prisma). Kalau seed berubah, perbarui di sini.
const ALL = Object.values(PERMISSIONS) as string[];
const ROLE_PERMISSIONS: Record<string, string[]> = {
  NOTARY: ALL.filter((p) => p !== "view_visits" && p !== "create_visits"),
  ADMIN: [
    "view_clients", "edit_clients",
    "view_jobs", "edit_jobs",
    "view_documents", "upload_documents",
    "view_finance", "edit_finance",
    "view_minuta", "view_repertorium",
    "view_legalisasi", "view_waarmerking", "view_wasiat"
  ],
  STAFF: [
    "view_clients",
    "view_jobs", "edit_jobs",
    "view_documents", "upload_documents"
  ],
  VIEWER: [
    "view_clients", "view_jobs", "view_documents", "view_finance", "view_minuta", "view_repertorium",
    "view_legalisasi", "view_waarmerking", "view_wasiat"
  ]
};

// Ekspektasi menu yang TIDAK boleh muncul per role.
const MUST_BE_HIDDEN: Record<string, string[]> = {
  NOTARY: ["/visits"],
  ADMIN: ["/admin", "/visits"],
  STAFF: ["/archive", "/notary-record", "/legalisasi", "/waarmerking", "/wasiat", "/payments", "/admin", "/visits"],
  VIEWER: ["/admin", "/visits"]
};

let failures = 0;
const allItems = NAV_SECTIONS.flatMap((s) => s.items);

for (const [role, perms] of Object.entries(ROLE_PERMISSIONS)) {
  const set = new Set(perms);
  const visible = filterNavSections(NAV_SECTIONS, set).flatMap((s) => s.items.map((i) => i.href));
  console.log(`\n${role} (${visible.length}/${allItems.length} menu):`);
  console.log("  " + visible.join(", "));

  for (const href of MUST_BE_HIDDEN[role]) {
    if (visible.includes(href)) {
      failures++;
      console.log(`  ✗ BOCOR: ${href} tampil untuk ${role}`);
    }
  }
  // Setiap menu yang tampil harus benar-benar lolos aturan permission-nya.
  for (const item of allItems) {
    const shown = visible.includes(item.href);
    const allowed = canAccessNavItem(item, set);
    if (shown !== allowed) {
      failures++;
      console.log(`  ✗ INKONSISTEN: ${item.href} shown=${shown} allowed=${allowed}`);
    }
  }
}

// Section tanpa item tidak boleh ada (judul kosong di sidebar).
for (const [role, perms] of Object.entries(ROLE_PERMISSIONS)) {
  const empty = filterNavSections(NAV_SECTIONS, new Set(perms)).filter((s) => s.items.length === 0);
  if (empty.length) {
    failures++;
    console.log(`✗ ${role}: ada section kosong`);
  }
}

console.log(failures === 0 ? "\n✓ Semua pemeriksaan navigasi lolos." : `\n✗ ${failures} pemeriksaan gagal.`);
process.exit(failures === 0 ? 0 : 1);

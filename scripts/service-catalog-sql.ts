/**
 * Hasilkan SQL idempoten untuk mengisi service_types + service_templates dari
 * src/lib/serviceCatalog.ts. Aman dijalankan berulang:
 *  - service_types: upsert berdasarkan name (kategori/deskripsi diperbarui).
 *  - service_templates: hanya dibuat bila jenis layanan itu BELUM punya
 *    template (template yang sudah disesuaikan kantor tidak ditimpa).
 *
 * Jalankan:  node --experimental-strip-types scripts/service-catalog-sql.ts > catalog.sql
 */
import { SERVICE_CATALOG } from "../src/lib/serviceCatalog.ts";

const q = (s: string) => `'${s.replace(/'/g, "''")}'`;
const lines: string[] = ["BEGIN;"];
for (const item of SERVICE_CATALOG) {
  lines.push(
    `INSERT INTO service_types (id, name, description, category, "isActive", "createdAt") VALUES (gen_random_uuid()::text, ${q(item.name)}, ${q(item.description)}, ${q(item.category)}, true, now()) ON CONFLICT (name) DO UPDATE SET description = EXCLUDED.description, category = EXCLUDED.category, "isActive" = true;`
  );
  const checklist = JSON.stringify(item.checklist.map((c) => ({ label: c.label, isRequired: c.isRequired ?? true })));
  const tasks = JSON.stringify(item.tasks.map((t) => ({ title: t })));
  lines.push(
    `INSERT INTO service_templates (id, "serviceTypeId", name, "defaultChecklist", "defaultTasks", "createdAt") SELECT gen_random_uuid()::text, st.id, ${q("Template " + item.name)}, ${q(checklist)}::jsonb, ${q(tasks)}::jsonb, now() FROM service_types st WHERE st.name = ${q(item.name)} AND NOT EXISTS (SELECT 1 FROM service_templates t WHERE t."serviceTypeId" = st.id);`
  );
}
lines.push("COMMIT;");
console.log(lines.join("\n"));

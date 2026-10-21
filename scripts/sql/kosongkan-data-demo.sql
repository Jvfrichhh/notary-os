-- Kosongkan data transaksi untuk demo (HANYA database dev/test).
-- Tetap ada: akun (users), peran & hak akses, katalog layanan & template, riwayat migrasi.
-- RESTRICT: gagal (tanpa menghapus apa pun) bila ada tabel lain yang masih menunjuk tabel ini.
TRUNCATE TABLE
  appointments, audit_logs, checklist_items, job_checklists, client_accounts,
  client_notifications, clients, deed_drafts, deeds, document_ai_analyses,
  document_versions, documents, grosse, job_number_counters, job_tasks, jobs,
  kutipan, legalisasi, minuta, notifications, payments, repertorium,
  repertorium_counters, salinan, visits, waarmerking, wasiat
RESTRICT;

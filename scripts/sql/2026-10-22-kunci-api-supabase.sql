-- Tutup jalur API otomatis Supabase (PostgREST/GraphQL) ke tabel aplikasi.
-- Aplikasi memakai Prisma dengan peran pemilik tabel (postgres), yang TIDAK
-- terkena RLS, jadi aplikasi tetap berjalan normal. Peran anon/authenticated
-- (dipakai API publik Supabase) tidak bisa membaca/menulis apa pun.
-- Idempoten; tidak mengubah/menghapus data.
BEGIN;

-- 1. RLS aktif di semua tabel public (tanpa policy = semua akses API ditolak).
DO $$
DECLARE t record;
BEGIN
  FOR t IN SELECT tablename FROM pg_tables WHERE schemaname = 'public' LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t.tablename);
  END LOOP;
END $$;

-- 2. Cabut hak peran API publik atas tabel, sequence, dan fungsi yang ada.
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon, authenticated;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon, authenticated;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA public FROM anon, authenticated;

-- 3. Tabel baru dari migrasi berikutnya juga tidak otomatis terbuka.
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public REVOKE ALL ON TABLES FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public REVOKE ALL ON SEQUENCES FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public REVOKE ALL ON FUNCTIONS FROM anon, authenticated;

-- 4. Skema cadangan lama (bila ada) ikut ditutup dari API.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_namespace WHERE nspname = 'backup_portal_20261018') THEN
    EXECUTE 'REVOKE ALL ON SCHEMA backup_portal_20261018 FROM anon, authenticated';
    EXECUTE 'REVOKE ALL ON ALL TABLES IN SCHEMA backup_portal_20261018 FROM anon, authenticated';
  END IF;
END $$;

COMMIT;

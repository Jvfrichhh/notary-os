-- ============================================================================
-- Seed DATA DEMO Notary OS dalam SQL murni (setara prisma/seed.ts).
-- Dipakai untuk database PENGUJIAN ketika Prisma/Node tidak tersedia.
--
-- PENGAMAN: berhenti jika database sudah berisi users/clients/jobs.
-- Password semua akun demo: password123 (bcrypt via pgcrypto, kompatibel bcryptjs).
-- Idempoten-ringan: dijalankan di DB kosong; tidak pernah menghapus data.
-- ============================================================================
DO $seed$
DECLARE
  v_hash   text;
  v_year   int := extract(year from now())::int;
  r_notary text; r_admin text; r_staff text; r_viewer text;
  u_notary text; u_admin text; u_staff text; u_viewer text;
  st_ajb   text;
  c1 text; c2 text;
  v1 text;
  j1 text; j2 text;
  chk1 text;
  d1 text;
  p text;
  perm_keys text[] := ARRAY[
    'view_clients','create_clients','edit_clients','delete_clients',
    'view_visits','create_visits',
    'view_jobs','create_jobs','edit_jobs','delete_jobs',
    'view_documents','upload_documents','delete_documents',
    'view_finance','edit_finance',
    'view_minuta','edit_minuta',
    'view_repertorium','edit_repertorium',
    'view_legalisasi','edit_legalisasi',
    'view_waarmerking','edit_waarmerking',
    'view_wasiat','edit_wasiat',
    'view_audit_log','manage_users','manage_roles'];
  admin_keys text[] := ARRAY['view_clients','create_clients','edit_clients','view_visits','create_visits',
    'view_jobs','create_jobs','edit_jobs','view_documents','upload_documents','view_finance','edit_finance',
    'view_minuta','view_repertorium','view_legalisasi','view_waarmerking','view_wasiat'];
  staff_keys text[] := ARRAY['view_clients','create_clients','view_visits','create_visits',
    'view_jobs','create_jobs','edit_jobs','view_documents','upload_documents'];
  viewer_keys text[] := ARRAY['view_clients','view_visits','view_jobs','view_documents','view_finance','view_minuta',
    'view_repertorium','view_legalisasi','view_waarmerking','view_wasiat'];
  cnt int;
BEGIN
  SELECT (SELECT count(*) FROM "users") + (SELECT count(*) FROM "clients") + (SELECT count(*) FROM "jobs") INTO cnt;
  IF cnt > 0 THEN
    RAISE EXCEPTION 'DIHENTIKAN: database sudah berisi data (users+clients+jobs = %). Seed hanya untuk DB pengujian kosong.', cnt;
  END IF;

  v_hash := extensions.crypt('password123', extensions.gen_salt('bf', 10));

  -- 1. Permissions
  FOREACH p IN ARRAY perm_keys LOOP
    INSERT INTO "permissions" ("id","key") VALUES ('c' || replace(gen_random_uuid()::text,'-',''), p);
  END LOOP;

  -- 2. Roles
  r_notary := 'c' || replace(gen_random_uuid()::text,'-',''); r_admin := 'c' || replace(gen_random_uuid()::text,'-','');
  r_staff  := 'c' || replace(gen_random_uuid()::text,'-',''); r_viewer := 'c' || replace(gen_random_uuid()::text,'-','');
  INSERT INTO "roles" ("id","name","description") VALUES
    (r_notary,'NOTARY','NOTARY role'),(r_admin,'ADMIN','ADMIN role'),(r_staff,'STAFF','STAFF role'),(r_viewer,'VIEWER','VIEWER role');
  INSERT INTO "role_permissions" SELECT r_notary, id FROM "permissions";
  INSERT INTO "role_permissions" SELECT r_admin,  id FROM "permissions" WHERE key = ANY(admin_keys);
  INSERT INTO "role_permissions" SELECT r_staff,  id FROM "permissions" WHERE key = ANY(staff_keys);
  INSERT INTO "role_permissions" SELECT r_viewer, id FROM "permissions" WHERE key = ANY(viewer_keys);

  -- 3. Users demo
  u_notary := 'c' || replace(gen_random_uuid()::text,'-',''); u_admin := 'c' || replace(gen_random_uuid()::text,'-','');
  u_staff  := 'c' || replace(gen_random_uuid()::text,'-',''); u_viewer := 'c' || replace(gen_random_uuid()::text,'-','');
  INSERT INTO "users" ("id","name","email","passwordHash","roleId","updatedAt") VALUES
    (u_notary,'Budi Notaris','notary@demo.local',v_hash,r_notary,now()),
    (u_admin ,'Admin Kantor','admin@demo.local' ,v_hash,r_admin ,now()),
    (u_staff ,'Staff Satu'  ,'staff@demo.local' ,v_hash,r_staff ,now()),
    (u_viewer,'Viewer Kantor','viewer@demo.local',v_hash,r_viewer,now());

  -- 4. Service type + template
  st_ajb := 'c' || replace(gen_random_uuid()::text,'-','');
  INSERT INTO "service_types" ("id","name","category") VALUES (st_ajb,'Akta Jual Beli','Pertanahan');
  INSERT INTO "service_templates" ("id","serviceTypeId","name","defaultChecklist","defaultTasks") VALUES
    ('c' || replace(gen_random_uuid()::text,'-',''), st_ajb, 'Template Akta Jual Beli',
     '[{"label":"KTP Penjual","isRequired":true},{"label":"KTP Pembeli","isRequired":true},{"label":"Kartu Keluarga","isRequired":true},{"label":"Sertifikat","isRequired":true},{"label":"SPPT/PBB","isRequired":true},{"label":"Bukti BPHTB","isRequired":false}]'::jsonb,
     '[{"title":"Verifikasi dokumen penjual"},{"title":"Verifikasi dokumen pembeli"},{"title":"Siapkan draft akta"},{"title":"Jadwalkan penandatanganan"}]'::jsonb);

  -- 5. Client 1 + visit + job 1
  c1 := 'c' || replace(gen_random_uuid()::text,'-','');
  INSERT INTO "clients" ("id","clientNumber","fullName","clientType","phone","email","city","status","updatedAt") VALUES
    (c1,'CLI-0001','Budi Santoso','Individu','081234567890','budi.santoso@example.com','Jakarta Selatan','ACTIVE',now());
  v1 := 'c' || replace(gen_random_uuid()::text,'-','');
  INSERT INTO "visits" ("id","clientId","visitorName","phone","purpose","serviceCategory","staffId","status") VALUES
    (v1,c1,'Budi Santoso','081234567890','Akta Jual Beli','Pertanahan',u_staff,'ACTIVE');
  j1 := 'c' || replace(gen_random_uuid()::text,'-','');
  INSERT INTO "jobs" ("id","jobNumber","clientId","visitId","serviceTypeId","description","priority","status","deadline","picId","reviewerId","notaryId","startDate","updatedAt") VALUES
    (j1, 'JOB-'||v_year||'-0001', c1, v1, st_ajb, 'Akta Jual Beli tanah di Jakarta Selatan','NORMAL','IN_PROGRESS','2026-09-15',u_staff,u_notary,u_notary,now(),now());
  chk1 := 'c' || replace(gen_random_uuid()::text,'-','');
  INSERT INTO "job_checklists" ("id","jobId") VALUES (chk1,j1);
  INSERT INTO "checklist_items" ("id","checklistId","label","isRequired","status") VALUES
    ('c' || replace(gen_random_uuid()::text,'-',''),chk1,'KTP Penjual',true,'COMPLETE'),
    ('c' || replace(gen_random_uuid()::text,'-',''),chk1,'KTP Pembeli',true,'COMPLETE'),
    ('c' || replace(gen_random_uuid()::text,'-',''),chk1,'Sertifikat',true,'MISSING'),
    ('c' || replace(gen_random_uuid()::text,'-',''),chk1,'SPPT/PBB',true,'MISSING');
  d1 := 'c' || replace(gen_random_uuid()::text,'-','');
  INSERT INTO "documents" ("id","jobId","clientId","fileName","fileType","fileSize","category","uploadedBy","description","storageKey") VALUES
    (d1,j1,c1,'ktp-budi-santoso.pdf','application/pdf',204800,'CLIENT_DOCUMENT',u_staff,'KTP klien','documents/demo/ktp-budi-santoso.pdf');
  INSERT INTO "job_tasks" ("id","jobId","title","status","assignedTo","completedAt") VALUES
    ('c' || replace(gen_random_uuid()::text,'-',''),j1,'Verifikasi dokumen penjual','DONE',u_staff,now()),
    ('c' || replace(gen_random_uuid()::text,'-',''),j1,'Siapkan draft akta','IN_PROGRESS',u_staff,NULL);
  INSERT INTO "payments" ("id","jobId","clientId","totalAmount","downPayment","paidAmount","remainingAmount","status") VALUES
    ('c' || replace(gen_random_uuid()::text,'-',''),j1,c1,5000000,2000000,2000000,3000000,'PARTIALLY_PAID');
  INSERT INTO "audit_logs" ("id","userId","action","entityType","entityId","newValue") VALUES
    ('c' || replace(gen_random_uuid()::text,'-',''),u_staff,'job_created','Job',j1,'{"status":"IN_PROGRESS"}'::jsonb);
  INSERT INTO "notifications" ("id","userId","type","message","relatedEntityType","relatedEntityId") VALUES
    ('c' || replace(gen_random_uuid()::text,'-',''),u_notary,'job_assigned','Job JOB-'||v_year||'-0001 menunggu review Anda','Job',j1);

  -- 6. Portal: akun klien 1, klien 2 + akun + job 2
  INSERT INTO "client_accounts" ("id","clientId","email","passwordHash","name","updatedAt") VALUES
    ('c' || replace(gen_random_uuid()::text,'-',''),c1,'client@demo.local',v_hash,'Budi Santoso',now());
  c2 := 'c' || replace(gen_random_uuid()::text,'-','');
  INSERT INTO "clients" ("id","clientNumber","fullName","clientType","phone","email","city","status","updatedAt") VALUES
    (c2,'CLI-0002','Siti Aminah','Individu','081298765432','siti.aminah@example.com','Depok','ACTIVE',now());
  INSERT INTO "client_accounts" ("id","clientId","email","passwordHash","name","updatedAt") VALUES
    ('c' || replace(gen_random_uuid()::text,'-',''),c2,'client2@demo.local',v_hash,'Siti Aminah',now());
  j2 := 'c' || replace(gen_random_uuid()::text,'-','');
  INSERT INTO "jobs" ("id","jobNumber","clientId","serviceTypeId","description","priority","status","deadline","picId","notaryId","startDate","updatedAt") VALUES
    (j2,'JOB-'||v_year||'-0002',c2,st_ajb,'Akta Jual Beli rumah di Depok','NORMAL','WAITING_FOR_DOCUMENT','2026-11-30',u_staff,u_notary,now(),now());

  -- 7. Counter nomor job (minimal 2, tidak pernah diturunkan)
  INSERT INTO "job_number_counters" ("year","value") VALUES (v_year,2)
    ON CONFLICT ("year") DO UPDATE SET "value" = GREATEST("job_number_counters"."value", EXCLUDED."value");

  RAISE NOTICE 'Seed selesai: 4 user internal, 2 klien, 2 akun portal, 2 job.';
END
$seed$;

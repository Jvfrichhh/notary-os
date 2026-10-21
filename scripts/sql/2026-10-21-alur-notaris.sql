-- Alur kantor (21 Okt 2026): hanya NOTARY menerima klien & memberi job;
-- fitur Visits tidak dipakai oleh siapa pun. Idempoten (aman diulang).
-- Hanya menghapus baris di role_permissions; tidak menyentuh data lain.
DELETE FROM role_permissions rp
USING roles r, permissions p
WHERE rp."roleId" = r.id
  AND rp."permissionId" = p.id
  AND (
    (r.name IN ('ADMIN', 'STAFF', 'VIEWER') AND p.key IN ('create_clients', 'create_jobs'))
    OR p.key IN ('view_visits', 'create_visits')
  );

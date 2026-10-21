-- Hapus peran ADMIN & VIEWER beserta akun yang memakainya (21 Okt 2026).
-- Idempoten. Semua relasi ke users bersifat SET NULL kecuali notifications
-- (RESTRICT), jadi notifikasi akun tersebut dihapus lebih dulu.
BEGIN;
DELETE FROM notifications
WHERE "userId" IN (SELECT u.id FROM users u JOIN roles r ON r.id = u."roleId" WHERE r.name IN ('ADMIN', 'VIEWER'));
DELETE FROM users
WHERE "roleId" IN (SELECT id FROM roles WHERE name IN ('ADMIN', 'VIEWER'));
DELETE FROM role_permissions
WHERE "roleId" IN (SELECT id FROM roles WHERE name IN ('ADMIN', 'VIEWER'));
DELETE FROM roles WHERE name IN ('ADMIN', 'VIEWER');
COMMIT;

-- Satu akun = satu sesi login: penanda sesi yang berlaku.
ALTER TABLE "users" ADD COLUMN "activeSessionId" TEXT;

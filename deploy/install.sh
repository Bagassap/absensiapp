#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# LMS PPLG — production install/deploy script
# Target: Ubuntu 24.04 LXC, IP static 192.168.111.151
#
# JALANKAN INI DI DALAM CONTAINER, bukan di mesin dev Windows.
# Repo harus sudah ada di container (git clone / rsync / scp) — script ini
# TIDAK meng-copy kode dari mesin dev.
#
# Asumsi: repo ada di $APP_DIR (default: $HOME/lms-pplg). Ubah kalau beda.
# Jalankan sebagai user non-root yang punya sudo (jangan langsung root).
#
# Usage:
#   chmod +x install.sh
#   ./install.sh
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

APP_DIR="${APP_DIR:-$HOME/lms-pplg}"
DB_NAME="lms_pplg"
DB_USER="lms_pplg_user"

echo "==> Repo target: $APP_DIR"
if [ ! -d "$APP_DIR/backend" ] || [ ! -d "$APP_DIR/frontend" ]; then
  echo "!! $APP_DIR/backend atau $APP_DIR/frontend tidak ditemukan."
  echo "!! Clone/copy repo ke sana dulu, lalu jalankan ulang script ini."
  echo "!! Atau set APP_DIR=/path/lain ./install.sh"
  exit 1
fi

# Secret TIDAK disimpan di git (deploy/*.env.production hanya template
# dengan placeholder). Kalau backend/.env sudah ada dan sudah terisi (bukan
# hasil jalan pertama), pakai ulang kredensial yang sama supaya idempotent —
# password DB di Postgres tidak akan cocok lagi kalau di-generate ulang.
if [ -f "$APP_DIR/backend/.env" ] && ! grep -q '__DB_PASSWORD__' "$APP_DIR/backend/.env"; then
  echo "==> backend/.env sudah ada, pakai ulang DB_PASSWORD & JWT_SECRET yang sudah ada."
  DB_PASSWORD=$(sed -n "s#.*${DB_USER}:\\([^@]*\\)@.*#\\1#p" "$APP_DIR/backend/.env" | head -1)
  JWT_SECRET=$(sed -n 's#^JWT_SECRET="\(.*\)"$#\1#p' "$APP_DIR/backend/.env" | head -1)
  if [ -z "$DB_PASSWORD" ] || [ -z "$JWT_SECRET" ]; then
    echo "!! Tidak bisa baca DB_PASSWORD/JWT_SECRET dari backend/.env yang ada. Cek manual."
    exit 1
  fi
else
  echo "==> Generate DB_PASSWORD & JWT_SECRET baru (acak, sekali per deploy pertama)."
  DB_PASSWORD=$(openssl rand -base64 24 | tr -dc 'A-Za-z0-9' | cut -c1-24)
  JWT_SECRET=$(openssl rand -base64 48 | tr -d '\n')
fi

# ── 1. PostgreSQL ─────────────────────────────────────────────────────────
echo "==> [1/8] Install PostgreSQL"
if ! command -v psql >/dev/null 2>&1; then
  sudo apt update
  sudo apt install -y postgresql postgresql-contrib
else
  echo "    postgresql sudah terinstall, skip."
fi
sudo systemctl enable --now postgresql

# ── 2. Database + user ────────────────────────────────────────────────────
echo "==> [2/8] Buat database & user (idempotent)"
sudo -u postgres psql -v ON_ERROR_STOP=1 <<SQL
DO \$\$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = '${DB_USER}') THEN
    CREATE ROLE ${DB_USER} LOGIN PASSWORD '${DB_PASSWORD}';
  END IF;
END
\$\$;
SELECT 'CREATE DATABASE ${DB_NAME} OWNER ${DB_USER}'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = '${DB_NAME}')\gexec
GRANT ALL PRIVILEGES ON DATABASE ${DB_NAME} TO ${DB_USER};
SQL
echo "    DB '${DB_NAME}' + user '${DB_USER}' siap."

# ── 3. .env files ──────────────────────────────────────────────────────────
echo "==> [3/8] Tulis backend/.env & frontend/.env dari template (isi placeholder secret)"
sed -e "s#__DB_PASSWORD__#${DB_PASSWORD}#g" \
    -e "s#__JWT_SECRET__#${JWT_SECRET}#g" \
    "$APP_DIR/deploy/backend.env.production" > "$APP_DIR/backend/.env"
sed -e "s#__JWT_SECRET__#${JWT_SECRET}#g" \
    "$APP_DIR/deploy/frontend.env.production" > "$APP_DIR/frontend/.env"
echo "    Selesai. Review isi backend/.env dan frontend/.env kalau IP/port beda."

# ── 4. Install dependencies ───────────────────────────────────────────────
echo "==> [4/8] npm install (backend & frontend)"
(cd "$APP_DIR/backend" && npm install)
(cd "$APP_DIR/frontend" && npm install)

# ── 5. Prisma generate + migrate deploy ───────────────────────────────────
echo "==> [5/8] Prisma generate & migrate deploy"
(cd "$APP_DIR/backend" && npx prisma generate)
(cd "$APP_DIR/backend" && npx prisma migrate deploy)
echo "    NOTE: database masih KOSONG (belum ada user ADMIN/GURU/SISWA)."
echo "    Lihat deploy/README.md bagian 'Seed data awal' untuk opsi mengisi data."

# ── 6. Build ───────────────────────────────────────────────────────────────
# rm -rf dist/.next dulu: build sebelumnya bisa meninggalkan cache basi
# (terutama Turbopack persistent cache di .next/cache) kalau redeploy
# dilakukan sebelum source tree lengkap ter-sync — hasilnya CSS Tailwind
# jadi cuma beberapa KB (preflight doang, semua utility class hilang).
echo "==> [6/8] Build backend (nest build) & frontend (next build)"
rm -rf "$APP_DIR/backend/dist"
rm -rf "$APP_DIR/frontend/.next"
(cd "$APP_DIR/backend" && npm run build)
(cd "$APP_DIR/frontend" && npm run build)

# ── 7. PM2 ───────────────────────────────────────────────────────────────
echo "==> [7/8] Setup PM2"
if ! command -v pm2 >/dev/null 2>&1; then
  sudo npm install -g pm2
fi
mkdir -p "$APP_DIR/logs"
cp "$APP_DIR/deploy/ecosystem.config.js" "$APP_DIR/ecosystem.config.js"

pm2 delete lms-backend lms-frontend >/dev/null 2>&1 || true
(cd "$APP_DIR" && pm2 start ecosystem.config.js)
pm2 save

echo ""
echo "==> PM2 startup (auto-start saat reboot):"
echo "    Perintah di bawah PERLU dijalankan MANUAL dengan sudo (PM2 tidak bisa"
echo "    self-elevate). Copy-paste persis output 'pm2 startup' berikut:"
echo ""
pm2 startup systemd -u "$USER" --hp "$HOME" || true
echo ""
echo "    Setelah menjalankan perintah sudo di atas, jalankan sekali lagi:"
echo "      pm2 save"
echo ""

# ── 8. Nginx ───────────────────────────────────────────────────────────────
echo "==> [8/8] Install & konfigurasi Nginx"
if ! command -v nginx >/dev/null 2>&1; then
  sudo apt install -y nginx
fi
sudo cp "$APP_DIR/deploy/nginx-lms.conf" /etc/nginx/sites-available/lms-pplg
sudo ln -sf /etc/nginx/sites-available/lms-pplg /etc/nginx/sites-enabled/lms-pplg
# matikan default site kalau masih aktif (biar tidak konflik server_name/port 80)
if [ -e /etc/nginx/sites-enabled/default ]; then
  sudo rm -f /etc/nginx/sites-enabled/default
fi

sudo nginx -t
sudo systemctl enable --now nginx
sudo systemctl reload nginx

echo ""
echo "==> SELESAI. Buka http://192.168.111.151/ dari browser."
echo "==> Cek ringkasan & cara lihat log di deploy/README.md."
echo ""
echo "==> PENTING — simpan ke password manager, tidak ditampilkan lagi setelah ini:"
echo "    DB user      : ${DB_USER}"
echo "    DB password  : ${DB_PASSWORD}"
echo "    JWT secret   : ${JWT_SECRET}"
echo "    (nilai yang sama juga ada di ${APP_DIR}/backend/.env kalau lupa)"

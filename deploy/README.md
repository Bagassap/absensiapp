# Deploy LMS PPLG — 192.168.111.151

**Penting:** semua file di folder `deploy/` ini dibuat dari mesin dev (tidak
punya akses SSH ke container kamu). Kamu perlu menjalankan langkah-langkah di
bawah ini SENDIRI di dalam container, dan tempel output-nya ke saya kalau ada
error di salah satu langkah — jangan lanjut ke langkah berikutnya kalau
langkah sebelumnya gagal.

## Keputusan yang sudah dikunci

| Hal | Nilai |
|---|---|
| Akses | IP-only, `http://192.168.111.151/` (tidak pakai domain) |
| Database | `lms_pplg` |
| DB user | `lms_pplg_user` |
| DB password | *di-generate acak oleh `install.sh` saat run pertama — lihat di bawah* |
| Backend port (internal) | `3001` |
| Frontend port (internal) | `3000` |
| JWT secret | *di-generate acak oleh `install.sh` saat run pertama — lihat di bawah* |

**Soal secret:** `deploy/backend.env.production` di git hanya berisi
placeholder (`__DB_PASSWORD__`, `__JWT_SECRET__`), bukan nilai asli — supaya
aman di-push ke GitHub. `install.sh` men-generate password DB & JWT secret
acak sendiri di run pertama, langsung menulis ke `backend/.env` di container
(file itu gitignored, tidak pernah masuk git), dan mencetaknya sekali di akhir
run — **copy ke password manager saat itu juga**, karena tidak ditampilkan
ulang. Kalau lupa, baca langsung dari `backend/.env` di container. Run
`install.sh` berikutnya (misal setelah `git pull`) otomatis memakai ulang
nilai yang sama dari `backend/.env` yang sudah ada, bukan generate baru.

## 0. Pindahkan kode ke container

Saya tidak bisa transfer file ke 192.168.111.151. Pilih salah satu, dari mesin dev:

```bash
# opsi A: rsync
rsync -avz --exclude node_modules --exclude .next --exclude dist \
  /path/ke/lms-pplg/ user@192.168.111.151:~/lms-pplg/

# opsi B: git (kalau repo sudah punya remote)
# di container:
git clone <url-repo> ~/lms-pplg
```

`deploy/backend.env.production`, `deploy/frontend.env.production`,
`deploy/ecosystem.config.js`, `deploy/nginx-lms.conf`, `deploy/install.sh`
harus ikut ter-copy (mereka baru dibuat di repo lokal, belum di-commit).

## 1. Jalankan install.sh

Login ke container via SSH, lalu:

```bash
cd ~/lms-pplg
chmod +x deploy/install.sh
APP_DIR=~/lms-pplg ./deploy/install.sh
```

Script ini otomatis mengerjakan:

1. Install PostgreSQL (`apt install postgresql postgresql-contrib`)
2. Buat role `lms_pplg_user` + database `lms_pplg` (idempotent — aman dijalankan ulang)
3. Copy `deploy/backend.env.production` → `backend/.env`, `deploy/frontend.env.production` → `frontend/.env`
4. `npm install` di `backend/` dan `frontend/`
5. `npx prisma generate` + `npx prisma migrate deploy` (menerapkan migration yang sudah ada di `backend/prisma/migrations/`, TIDAK membuat migration baru)
6. `npm run build` di kedua folder (`nest build`, `next build`)
7. Install PM2 global, `pm2 start ecosystem.config.js`, `pm2 save`, cetak perintah `pm2 startup` yang **harus kamu jalankan manual dengan sudo** (PM2 tidak bisa sudo sendiri)
8. Install Nginx, pasang `deploy/nginx-lms.conf` ke `sites-available`/`sites-enabled`, matikan default site, `nginx -t`, reload

Kalau ada langkah yang gagal (misal `npm install` error karena `bcrypt` butuh
build tools), lihat bagian **Troubleshooting** di bawah, lalu jalankan ulang
`install.sh` — semua langkahnya aman diulang (idempotent).

### Setelah script selesai — WAJIB langkah manual

`pm2 startup` mencetak satu baris perintah `sudo env PATH=... pm2 startup ...`.
Copy-paste persis baris itu dan jalankan. Lalu:

```bash
pm2 save
```

Tanpa ini, PM2 **tidak** akan auto-start saat container reboot.

## 2. Seed data awal (opsional, PENTING dibaca)

Database production masih **kosong** setelah `prisma migrate deploy` — belum
ada user ADMIN/GURU/SISWA sama sekali, jadi kamu belum bisa login.

Saya menemukan ada script seed `backend/prisma/import-users-csv.ts` +
`backend/csv/data user.csv` di repo kamu, tapi **keduanya belum ter-commit ke
git** (masih untracked) — jadi saya tidak tahu apakah itu sudah final/teruji.
Saya sengaja **tidak** memasukkannya ke `install.sh` otomatis.

> ⚠️ **Keamanan — `backend/csv/*.csv` TIDAK PERNAH boleh masuk git.** File ini
> berisi password plaintext + data pribadi siswa/guru. Sudah di-`.gitignore`
> secara eksplisit (`backend/.gitignore`) dan riwayat lama yang pernah
> memuatnya sudah dibersihkan dari git history. Kalau perlu memindahkan CSV
> baru ke container, pakai `scp` langsung, jangan pernah commit/push:
> ```bash
> scp "data user.csv" user@192.168.111.151:~/lms-pplg/backend/csv/
> ```

Kalau kamu yakin file itu sudah benar, jalankan manual di container:

```bash
cd ~/lms-pplg/backend
npx tsx prisma/import-users-csv.ts
```

Kalau belum siap, buat minimal 1 user ADMIN manual dulu supaya bisa login,
misalnya lewat `psql` (ganti hash password dengan hasil bcrypt asli):

```bash
sudo -u postgres psql -d lms_pplg -c "
INSERT INTO users (id, nama, email, password, role, \"isActive\", \"createdAt\", \"updatedAt\")
VALUES ('admin1', 'Admin PPLG', 'admin@lms.local', '<bcrypt-hash>', 'ADMIN', true, now(), now());
"
```

Generate hash bcrypt-nya dari container:
```bash
cd ~/lms-pplg/backend
node -e "console.log(require('bcrypt').hashSync('password-kamu', 10))"
```

## 3. Verifikasi tiap layer

Cek satu-satu dari dalam container sebelum cek dari browser:

```bash
# 1. Postgres jalan & bisa dikoneksi dengan kredensial app
# (ambil DATABASE_URL langsung dari backend/.env supaya tidak salah ketik password)
psql "$(grep DATABASE_URL ~/lms-pplg/backend/.env | cut -d '"' -f2)" -c '\dt'

# 2. Backend jalan di 3001
curl -i http://localhost:3001/api/auth/me   # wajar dapat 401 (belum login) — artinya server hidup

# 3. Frontend jalan di 3000
curl -i http://localhost:3000/

# 4. Nginx meneruskan dengan benar
curl -i http://localhost/
curl -i http://localhost/uploads/   # wajar 403/404 kalau folder kosong — bukan error koneksi
```

Baru setelah semua di atas OK, buka `http://192.168.111.151/` dari browser.

## Ringkasan service

| Service | Proses | Port internal | Diakses lewat |
|---|---|---|---|
| Frontend (Next.js) | PM2 `lms-frontend` | 3000 | Nginx `/` |
| Backend (Nest.js) | PM2 `lms-backend` | 3001 | Nginx `/uploads/` saja; sisanya lewat proxy internal Next.js (`BACKEND_URL`) |
| PostgreSQL | systemd `postgresql` | 5432 | hanya localhost |
| Nginx | systemd `nginx` | 80 | publik, `http://192.168.111.151/` |

**Kenapa `/api/` tidak di-proxy Nginx ke backend:** browser memanggil `/api/*`
milik Next.js sendiri (`frontend/app/api/**/route.ts`), yang baca cookie
httpOnly `token` lalu proxy server-to-server ke Nest lewat `BACKEND_URL`. Kalau
Nginx mengarahkan `/api/` langsung ke Nest, cookie login tidak pernah ke-set →
semua orang gagal login. Detail ada sebagai komentar di `nginx-lms.conf`.

## Cek status & log

```bash
pm2 status                    # ringkasan semua proses
pm2 logs lms-backend          # log realtime backend
pm2 logs lms-frontend         # log realtime frontend
pm2 logs                      # gabungan keduanya
pm2 logs lms-backend --lines 200 --nostream   # 200 baris terakhir, tanpa follow

# Nginx
sudo tail -f /var/log/nginx/error.log
sudo tail -f /var/log/nginx/access.log

# PostgreSQL
sudo journalctl -u postgresql -f
```

Restart setelah ganti kode/env:
```bash
cd ~/lms-pplg
git pull   # atau rsync ulang
rm -rf backend/dist frontend/.next   # WAJIB — lihat troubleshooting "CSS Tailwind cuma ~1KB"
(cd backend && npm run build)
(cd frontend && npm run build)
pm2 restart lms-backend lms-frontend
```

## Troubleshooting

- **`npm install` gagal di `bcrypt`** (native addon): `sudo apt install -y build-essential python3`, lalu `npm install` ulang.
- **`EADDRINUSE` saat `pm2 start`**: ada proses lama masih pegang port. `sudo lsof -i :3001` / `:3000`, `pm2 delete lms-backend lms-frontend`, jalankan ulang.
- **Nginx `502 Bad Gateway`**: backend/frontend belum jalan — cek `pm2 status`, lalu `pm2 logs`.
- **Login gagal terus / redirect loop**: cek `FRONTEND_URL` di `backend/.env` dan `NEXT_PUBLIC_API_URL`/`BACKEND_URL` di `frontend/.env` sudah sesuai IP container, bukan `localhost` yang salah konteks (browser vs server-side).
- **`prisma migrate deploy` error "database does not exist"**: pastikan langkah 2 (`install.sh`) sukses buat database — cek `sudo -u postgres psql -l`.
- **CSS Tailwind ter-load tapi cuma ~1KB, styling berantakan**: sudah diverifikasi config Tailwind v4 (`postcss.config.mjs`, `app/globals.css`) di repo ini BENAR — build lokal bersih menghasilkan CSS ~115KB. Penyebab paling mungkin di production: Turbopack persistent cache (`frontend/.next/cache`) basi dari build sebelumnya yang sempat jalan saat source tree belum lengkap ter-sync (mis. rebuild ditrigger di tengah `rsync`/`git pull`). Fix: `rm -rf frontend/.next` lalu `npm run build` ulang (sudah otomatis di `install.sh` step 6 sejak commit ini). Kalau masih terjadi, pastikan `app/` dan `components/` benar-benar lengkap ter-sync ke container SEBELUM `npm run build` dijalankan.
- **`/_next/image` 400 "isn't a valid image ... received null"**: gejala klasik self-hosted Next.js waktu package `sharp` tidak terpasang/salah platform. `sharp` cuma `optionalDependency` bawaan `next`, jadi instalasinya tidak dijamin (bisa ke-skip kalau ada `--omit=optional`, atau `node_modules` ke-copy dari OS lain). Sudah di-fix: `sharp` sekarang jadi `dependencies` langsung di `frontend/package.json`, jadi selalu ke-install fresh di `npm install` sesuai platform container. Kalau masih error setelah `npm install` ulang, cek `ls frontend/node_modules/@img/` — harus ada folder `sharp-linux-x64-*` (bukan `sharp-darwin-*`/`sharp-win32-*`, yang berarti `node_modules` pernah ke-copy dari mesin dev, bukan hasil install fresh di container).

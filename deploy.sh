#!/usr/bin/env bash
# ==============================================================================
# Script Deployment & Update Otomatis Aplikasi Werewolf Companion untuk VPS
# ==============================================================================

set -euo pipefail

# Konfigurasi Direktori & Variabel
TARGET_DIR="${TARGET_DIR:-/www/wwwroot/warewolf}"
HEALTH_CHECK_URL="${HEALTH_CHECK_URL:-http://localhost:3010/api/health}"
MAX_HEALTH_RETRIES=15
RETRY_DELAY_SECONDS=2

echo "======================================================================"
echo "[DEPLOYMENT] Memulai proses update otomatis aplikasi Werewolf"
echo "[WAKTU] $(date -u '+%Y-%m-%d %H:%M:%S UTC')"
echo "======================================================================"

# 1. Navigasi ke direktori proyek
if [ -d "$TARGET_DIR" ]; then
    echo "[INFO] Mengakses direktori proyek: $TARGET_DIR"
    cd "$TARGET_DIR"
else
    echo "[ERROR] Direktori $TARGET_DIR tidak ditemukan!"
    exit 1
fi

# 2. Deteksi perintah Docker Compose yang tersedia
if command -v docker-compose &> /dev/null; then
    DOCKER_COMPOSE_CMD="docker-compose"
elif docker compose version &> /dev/null; then
    DOCKER_COMPOSE_CMD="docker compose"
else
    echo "[ERROR] Perintah 'docker compose' atau 'docker-compose' tidak ditemukan di VPS!"
    exit 1
fi

# 3. Periksa keberadaan Docker Image & Container saat ini
echo "[STEP 1/6] Memeriksa status Docker image & container yang ada..."
if $DOCKER_COMPOSE_CMD ps --services --filter "status=running" | grep -q .; then
    echo "[INFO] Container saat ini sedang berjalan."
else
    echo "[INFO] Tidak ada container yang sedang berjalan atau ini adalah deployment awal."
fi

# 4. Tarik pembaruan kode dari Repository Git
echo "[STEP 2/6] Menarik pembaruan kode terbaru dari branch main..."
git fetch origin main

if ! git pull --ff-only origin main; then
    echo "[ERROR] Gagal melakukan 'git pull --ff-only origin main'. Mohon periksa konflik pada repository."
    exit 1
fi
echo "[SUCCESS] Kode berhasil diperbarui ke commit: $(git rev-parse --short HEAD)"

# 5. Jalankan Docker Compose Build & Up (Proses pembaruan container)
echo "[STEP 3/6] Menjalankan 'docker compose up -d --build'..."
if ! $DOCKER_COMPOSE_CMD up -d --build --remove-orphans; then
    echo "[ERROR] Gagal melakukan build dan pembaharuan container!"
    exit 1
fi
echo "[SUCCESS] Container berhasil dibangun dan diperbarui."

# 6. Membersihkan Docker Image lama yang tidak terpakai (Prune Dampak Tanpa Menghapus Volume)
echo "[STEP 4/6] Membersihkan Docker image lama yang dangling / tidak terpakai..."
echo "[INFO] Menjalankan 'docker image prune -f' (TIDAK menghapus volume data)..."
docker image prune -f || true
echo "[SUCCESS] Pembersihan image lama selesai."

# 7. Verifikasi Health Check Endpoint Aplikasi
echo "[STEP 5/6] Memeriksa status kesehatan aplikasi (Health Check)..."
HEALTH_SUCCESS=false

for i in $(seq 1 $MAX_HEALTH_RETRIES); do
    echo "[HEALTH CHECK] Percobaan $i/$MAX_HEALTH_RETRIES ke $HEALTH_CHECK_URL..."
    
    if command -v curl &> /dev/null; then
        RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" "$HEALTH_CHECK_URL" || true)
    elif command -v wget &> /dev/null; then
        RESPONSE=$(wget -q -O - --server-response "$HEALTH_CHECK_URL" 2>&1 | awk '/HTTP\// {print $2}' | tail -n1 || true)
    else
        echo "[WARN] curl/wget tidak ditemukan, melewati pengujian HTTP health check."
        HEALTH_SUCCESS=true
        break
    fi

    if [ "$RESPONSE" = "200" ]; then
        echo "[SUCCESS] Health check BERHASIL! HTTP Status Code: 200 OK"
        HEALTH_SUCCESS=true
        break
    fi

    sleep $RETRY_DELAY_SECONDS
done

if [ "$HEALTH_SUCCESS" = false ]; then
    echo "[ERROR] Health check GAGAL setelah $MAX_HEALTH_RETRIES percobaan! Status HTTP: $RESPONSE"
    echo "---------------- Log Terbaru Container ----------------"
    $DOCKER_COMPOSE_CMD logs --tail=50
    echo "--------------------------------------------------------"
    exit 1
fi

# 8. Tampilkan Status Container Akhir
echo "[STEP 6/6] Status akhir container:"
$DOCKER_COMPOSE_CMD ps

echo "======================================================================"
echo "[DEPLOYMENT BERHASIL] Aplikasi Werewolf telah diperbarui dengan aman!"
echo "[PERINGATAN] Seluruh volume data persisten tetap aman dan tidak tersentuh."
echo "======================================================================"

#!/usr/bin/env bash
# ==============================================================================
# Script Deployment Otomatis Aplikasi Werewolf Companion untuk VPS / aaPanel
# ==============================================================================

set -euo pipefail

# Konfigurasi Direktori & Variabel
TARGET_DIR="${TARGET_DIR:-/www/wwwroot/warewolf}"
HEALTH_CHECK_URL="${HEALTH_CHECK_URL:-http://localhost:3000/api/health}"
MAX_HEALTH_RETRIES=15
RETRY_DELAY_SECONDS=2

echo "======================================================================"
echo "[DEPLOYMENT] Memulai alur pembaruan otomatis Werewolf Companion"
echo "[TIME] $(date -u '+%Y-%m-%d %H:%M:%S UTC')"
echo "======================================================================"

# 1. Navigasi ke direktori proyek
if [ -d "$TARGET_DIR" ]; then
    echo "[INFO] Berpindah ke direktori proyek: $TARGET_DIR"
    cd "$TARGET_DIR"
else
    echo "[ERROR] Direktori $TARGET_DIR tidak ditemukan!"
    exit 1
fi

# 2. Verifikasi status repository Git & Pull kode terbaru
echo "[STEP 1/5] Mengambil kode terbaru dari branch main..."
git fetch origin main

# Memastikan tidak ada perubahan lokal yang membatalkan merge
if ! git pull --ff-only origin main; then
    echo "[ERROR] Gagal melakukan 'git pull --ff-only origin main'. Mohon periksa status git."
    exit 1
fi
echo "[SUCCESS] Kode berhasil diperbarui ke commit: $(git rev-parse --short HEAD)"

# 3. Membangun Docker Image terbaru (termasuk aset statis di public/ & src/assets/)
echo "[STEP 2/5] Membangun ulang Docker image..."
if command -v docker-compose &> /dev/null; then
    DOCKER_COMPOSE_CMD="docker-compose"
elif docker compose version &> /dev/null; then
    DOCKER_COMPOSE_CMD="docker compose"
else
    echo "[ERROR] Perintah 'docker compose' atau 'docker-compose' tidak ditemukan!"
    exit 1
fi

if ! $DOCKER_COMPOSE_CMD build; then
    echo "[ERROR] Proses build Docker image gagal!"
    exit 1
fi
echo "[SUCCESS] Build Docker image berhasil."

# 4. Memperbarui container tanpa menghapus volume persisten data
echo "[STEP 3/5] Memperbarui container dengan image terbaru..."
if ! $DOCKER_COMPOSE_CMD up -d --remove-orphans; then
    echo "[ERROR] Gagal menjalankan container!"
    exit 1
fi
echo "[SUCCESS] Container berhasil diperbarui dan berjalan."

# 5. Uji Health Check Endpoint
echo "[STEP 4/5] Melakukan verifikasi Health Check aplikasi..."
HEALTH_SUCCESS=false

for i in $(seq 1 $MAX_HEALTH_RETRIES); do
    echo "[HEALTH CHECK] Percobaan $i/$MAX_HEALTH_RETRIES ke $HEALTH_CHECK_URL..."
    if command -v curl &> /dev/null; then
        RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" "$HEALTH_CHECK_URL" || true)
    elif command -v wget &> /dev/null; then
        RESPONSE=$(wget -q -O - --server-response "$HEALTH_CHECK_URL" 2>&1 | awk '/HTTP\// {print $2}' | tail -n1 || true)
    else
        echo "[WARN] curl/wget tidak tersedia, melewati HTTP health check secara langsung."
        HEALTH_SUCCESS=true
        break
    fi

    if [ "$RESPONSE" = "200" ]; then
        echo "[SUCCESS] Health check BERHASIL! HTTP Status Code: 200"
        HEALTH_SUCCESS=true
        break
    fi

    sleep $RETRY_DELAY_SECONDS
done

if [ "$HEALTH_SUCCESS" = false ]; then
    echo "[ERROR] Health check GAGAL setelah $MAX_HEALTH_RETRIES percobaan! Status HTTP: $RESPONSE"
    echo "---------------- Container Logs (Terbaru) ----------------"
    $DOCKER_COMPOSE_CMD logs --tail=50
    echo "--------------------------------------------------------"
    exit 1
fi

# 6. Menampilkan Status Akhir Container & Log Singkat
echo "[STEP 5/5] Status container saat ini:"
$DOCKER_COMPOSE_CMD ps

echo "======================================================================"
echo "[DEPLOYMENT SUCCESS] Aplikasi Werewolf Companion berhasil di-deploy!"
echo "======================================================================"

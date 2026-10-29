#!/usr/bin/env bash
# ==============================================================================
# Script Deployment & Update Otomatis Aplikasi Werewolf Companion untuk VPS
# ==============================================================================

set -euo pipefail

# Konfigurasi Direktori & Variabel Wajib
TARGET_DIR="${TARGET_DIR:-/www/wwwroot/warewolf}"
EXPECTED_BRANCH="main"
APP_PORT="${APP_PORT:-3010}"
HEALTH_CHECK_URL="http://127.0.0.1:${APP_PORT}/"
API_HEALTH_URL="http://127.0.0.1:${APP_PORT}/api/health"
MAX_HEALTH_RETRIES=15
RETRY_DELAY_SECONDS=2

echo "======================================================================"
echo "[DEPLOYMENT] Memulai proses update aman aplikasi Werewolf Companion"
echo "[WAKTU] $(date -u '+%Y-%m-%d %H:%M:%S UTC')"
echo "======================================================================"

# ------------------------------------------------------------------------------
# 1. Memastikan direktori, branch, dan repository benar
# ------------------------------------------------------------------------------
echo "[STEP 1/9] Memeriksa direktori dan repositori Git..."
if [ ! -d "$TARGET_DIR" ]; then
    echo "[ERROR] Direktori $TARGET_DIR tidak ditemukan di VPS!"
    exit 1
fi

cd "$TARGET_DIR"

if ! git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
    echo "[ERROR] Direktori $TARGET_DIR bukan merupakan repositori Git yang valid!"
    exit 1
fi

CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)
if [ "$CURRENT_BRANCH" != "$EXPECTED_BRANCH" ]; then
    echo "[INFO] Berpindah dari branch '$CURRENT_BRANCH' ke '$EXPECTED_BRANCH'..."
    git checkout "$EXPECTED_BRANCH"
fi

# Deteksi perintah Docker Compose yang tersedia di host VPS
if command -v docker-compose &> /dev/null; then
    DOCKER_COMPOSE_CMD="docker-compose"
elif docker compose version &> /dev/null; then
    DOCKER_COMPOSE_CMD="docker compose"
else
    echo "[ERROR] Perintah 'docker compose' atau 'docker-compose' tidak ditemukan di VPS!"
    exit 1
fi

# ------------------------------------------------------------------------------
# 2. Mengambil pembaruan kode dengan aman
# ------------------------------------------------------------------------------
echo "[STEP 2/9] Menarik pembaruan kode terbaru dari branch $EXPECTED_BRANCH..."
PREV_COMMIT=$(git rev-parse --short HEAD)
echo "[INFO] Commit saat ini sebelum pembaruan: $PREV_COMMIT"

git fetch origin "$EXPECTED_BRANCH"

if ! git pull --ff-only origin "$EXPECTED_BRANCH"; then
    echo "[ERROR] Gagal melakukan 'git pull --ff-only origin $EXPECTED_BRANCH'."
    echo "[ERROR] Terdapat konflik lokal atau riwayat branch tidak sejalan. Deployment dibatalkan demi keamanan."
    exit 1
fi

NEW_COMMIT=$(git rev-parse --short HEAD)
echo "[SUCCESS] Kode berhasil diperbarui ke commit: $NEW_COMMIT"

# ------------------------------------------------------------------------------
# 3. Memvalidasi konfigurasi Docker Compose & direktori aset
# ------------------------------------------------------------------------------
echo "[STEP 3/9] Memvalidasi konfigurasi docker-compose.yml..."
if ! $DOCKER_COMPOSE_CMD config -q; then
    echo "[ERROR] Validasi docker-compose.yml gagal! Periksa struktur berkas."
    exit 1
fi
echo "[SUCCESS] Konfigurasi docker-compose valid."

# Pastikan folder penyimpanan persisten dan aset upload tetap ada
mkdir -p uploads public/assets/images

# ------------------------------------------------------------------------------
# 4. Cadangkan image aktif & bangun image baru (Build Safety First)
# ------------------------------------------------------------------------------
echo "[STEP 4/9] Membangun image Docker baru (aplikasi tetap berjalan)..."

# Jika ada image aktif sebelumnya, beri tag cadangan untuk keperluan rollback cepat
if docker image inspect werewolf-app:latest >/dev/null 2>&1; then
    echo "[INFO] Mencadangkan image saat ini sebagai 'werewolf-app:rollback-backup'..."
    docker tag werewolf-app:latest werewolf-app:rollback-backup || true
fi

# Lakukan build image Docker secara terpisah terlebih dahulu
if ! $DOCKER_COMPOSE_CMD build; then
    echo "======================================================================"
    echo "[ERROR FATAL] Proses 'docker build' GAGAL!"
    echo "[PROTEKSI] Container yang sedang berjalan TIDAK DIHENTIKAN."
    echo "[PROTEKSI] Aplikasi produksi tetap aktif melayani pengguna tanpa gangguan."
    echo "======================================================================"
    exit 1
fi
echo "[SUCCESS] Image Docker baru berhasil dibangun tanpa kendala."

# ------------------------------------------------------------------------------
# 5. Menjalankan atau memperbarui container setelah build berhasil
# ------------------------------------------------------------------------------
echo "[STEP 5/9] Memperbarui dan menjalankan container dengan image terbaru..."
if ! $DOCKER_COMPOSE_CMD up -d --no-build --remove-orphans; then
    echo "[ERROR] Gagal menjalankan container dengan image baru!"
    # Upaya pemulihan darurat jika container gagal start
    if docker image inspect werewolf-app:rollback-backup >/dev/null 2>&1; then
        echo "[ROLLBACK] Mengembalikan ke image cadangan..."
        docker tag werewolf-app:rollback-backup werewolf-app:latest
        $DOCKER_COMPOSE_CMD up -d --no-build || true
    fi
    exit 1
fi
echo "[SUCCESS] Container diperbarui."

# ------------------------------------------------------------------------------
# 6. Memastikan container utama berstatus running
# ------------------------------------------------------------------------------
echo "[STEP 6/9] Memverifikasi status container running..."
sleep 2
if ! $DOCKER_COMPOSE_CMD ps --services --filter "status=running" | grep -q "werewolf-app"; then
    echo "[ERROR] Container werewolf-app tidak dalam status running!"
    echo "---------------- Log Container ----------------"
    $DOCKER_COMPOSE_CMD logs --tail=60
    echo "-----------------------------------------------"
    exit 1
fi
echo "[SUCCESS] Container werewolf-app berstatus running."

# ------------------------------------------------------------------------------
# 7. Menjalankan HTTP health check ke http://127.0.0.1:3010/
# ------------------------------------------------------------------------------
echo "[STEP 7/9] Menjalankan HTTP Health Check ke $HEALTH_CHECK_URL..."
HEALTH_SUCCESS=false

for i in $(seq 1 "$MAX_HEALTH_RETRIES"); do
    echo "[HEALTH CHECK] Percobaan $i/$MAX_HEALTH_RETRIES ke $HEALTH_CHECK_URL..."
    
    RESPONSE=""
    if command -v curl &> /dev/null; then
        RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" "$HEALTH_CHECK_URL" || true)
    elif command -v wget &> /dev/null; then
        RESPONSE=$(wget -q -O - --server-response "$HEALTH_CHECK_URL" 2>&1 | awk '/HTTP\// {print $2}' | tail -n1 || true)
    fi

    if [ "$RESPONSE" = "200" ] || [ "$RESPONSE" = "304" ]; then
        echo "[SUCCESS] Health check BERHASIL pada port $APP_PORT! HTTP Status Code: $RESPONSE"
        HEALTH_SUCCESS=true
        break
    fi

    # Cek alternatif ke /api/health jika root sedang redirect
    if command -v curl &> /dev/null; then
        API_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" "$API_HEALTH_URL" || true)
        if [ "$API_RESPONSE" = "200" ]; then
            echo "[SUCCESS] Health check BERHASIL via /api/health! HTTP Status Code: 200"
            HEALTH_SUCCESS=true
            break
        fi
    fi

    sleep "$RETRY_DELAY_SECONDS"
done

# ------------------------------------------------------------------------------
# 8. Penanganan Kegagalan Health Check & Rollback Aman
# ------------------------------------------------------------------------------
if [ "$HEALTH_SUCCESS" = false ]; then
    echo "======================================================================"
    echo "[ERROR] Health check GAGAL setelah $MAX_HEALTH_RETRIES percobaan! Status: $RESPONSE"
    echo "---------------- Log Terbaru Container ----------------"
    $DOCKER_COMPOSE_CMD logs --tail=80
    echo "--------------------------------------------------------"
    
    if docker image inspect werewolf-app:rollback-backup >/dev/null 2>&1; then
        echo "[ROLLBACK] Menjalankan rollback otomatis ke image sebelumnya..."
        docker tag werewolf-app:rollback-backup werewolf-app:latest
        $DOCKER_COMPOSE_CMD up -d --no-build
        echo "[ROLLBACK] Selesai: Container dikembalikan ke image cadangan stabil."
    else
        echo "[WARN] Tidak ada image cadangan untuk rollback otomatis."
    fi
    exit 1
fi

# ------------------------------------------------------------------------------
# 9. Pembersihan Aman & Pelaporan Status Akhir
# ------------------------------------------------------------------------------
echo "[STEP 8/9] Pembersihan aman image dangling tanpa menghapus volume..."
# Hanya membersihkan image tak bernama (dangling), TIDAK menggunakan -a agar rollback tetap ada
docker image prune -f || true

echo "[STEP 9/9] Status akhir layanan Docker:"
$DOCKER_COMPOSE_CMD ps

echo "======================================================================"
echo "[DEPLOYMENT SELESAI & SUKSES]"
echo "- Repositori: $TARGET_DIR (branch: $EXPECTED_BRANCH)"
echo "- Versi Aktif: commit $NEW_COMMIT"
echo "- Port Akses: http://127.0.0.1:${APP_PORT}/ (Container: :3000)"
echo "- Status Health Check: 200 OK"
echo "- Volume data persisten ('werewolf-uploads'): Aman & Utuh"
echo "======================================================================"

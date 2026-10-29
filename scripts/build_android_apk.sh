#!/usr/bin/env bash
set -e

echo "=== IronTrack: Gerador de APK Android Release via Gradle ==="

cd "$(dirname "$0")/.."
export PROJECT_ROOT="$(pwd)"

if [ -f "scripts/env_android.sh" ]; then
    source "scripts/env_android.sh"
fi

if ! command -v java &> /dev/null; then
    if command -v distrobox &> /dev/null; then
        echo "🔄 Executando compilação dentro do Distrobox Fedora..."
        exec distrobox enter Fedora -- bash -c "cd '$(pwd)' && bash scripts/build_android_apk.sh"
    fi
    echo "⚠️  AVISO: Java (JDK 17+) não encontrado no PATH."
    exit 1
fi

echo "1. Gerando bundle web de produção (Vite)..."
npm run build

echo "2. Sincronizando assets com Capacitor Android..."
npx cap sync android

echo "3. Compilando APK Release Standalone via Gradle..."
cd android
chmod +x ./gradlew
./gradlew assembleRelease
cd ..

OUTPUT_APK="android/app/build/outputs/apk/release/app-release.apk"
VERSION=$(node -p "require('./package.json').version" 2>/dev/null || echo "0.5.2")
TARGET_NAME="irontrack-v${VERSION}.apk"

if [ -f "$OUTPUT_APK" ]; then
    cp "$OUTPUT_APK" "$TARGET_NAME"
    echo "✅ APK gerado com sucesso!"
    echo "📦 Arquivo original: $OUTPUT_APK"
    echo "📱 Cópia na raiz: $TARGET_NAME"
else
    echo "⚠️ Arquivo $OUTPUT_APK não encontrado após o build."
fi

# Passo 4: Envio e instalação via ADB se houver dispositivo conectado
if [ -f "$TARGET_NAME" ] && [ -f "scripts/install_apk_adb.sh" ]; then
    echo ""
    echo "=== Passo 4: Verificação de Envio via ADB ==="
    bash scripts/install_apk_adb.sh "$TARGET_NAME" --auto || true
fi

#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ANDROID_DIR="$ROOT_DIR/android"
GRADLE_VERSION="8.9"
GRADLE_HOME="${GRADLE_USER_HOME:-$HOME/.gradle}/manual-dists/gradle-$GRADLE_VERSION"

java_major() {
  local version

  # Reading the JDK metadata is faster and also works before launching Java.
  if [[ -r "$1/release" ]]; then
    version="$(sed -n 's/^JAVA_VERSION="\([0-9]*\).*/\1/p' "$1/release" | head -n 1)"
  fi
  if [[ -z "${version:-}" ]]; then
    version="$("$1/bin/java" -version 2>&1 | sed -n 's/.*version "\([0-9]*\).*/\1/p' | head -n 1)"
  fi
  printf '%s\n' "$version"
}

is_compatible_java() {
  local home="${1:-}"
  local major

  [[ -x "$home/bin/java" ]] || return 1
  major="$(java_major "$home")"
  [[ "$major" == "17" || "$major" == "21" ]]
}

find_compatible_java() {
  local version home

  # Android Gradle Plugin 8.x runs reliably on these LTS JDK releases.
  for version in 21 17; do
    if [[ -x /usr/libexec/java_home ]]; then
      home="$(/usr/libexec/java_home -v "$version" 2>/dev/null || true)"
      if is_compatible_java "$home"; then
        printf '%s\n' "$home"
        return 0
      fi
    fi
  done

  return 1
}

# JAVA_HOME is commonly inherited from Android Studio's JBR. After an IDE
# update that can suddenly point at Java 25, so validate it instead of trusting
# that merely being set means it is usable.
if ! is_compatible_java "${JAVA_HOME:-}"; then
  JAVA_HOME="$(find_compatible_java || true)"
  export JAVA_HOME
fi

if ! is_compatible_java "${JAVA_HOME:-}"; then
  echo "No se encontró un JDK compatible. Instala Java 17 o 21 para Gradle $GRADLE_VERSION." >&2
  exit 1
fi

echo "Usando Java $(java_major "$JAVA_HOME") desde $JAVA_HOME"

if [[ -x "$ANDROID_DIR/gradlew" ]]; then
  GRADLE="$ANDROID_DIR/gradlew"
elif command -v gradle >/dev/null 2>&1; then
  GRADLE="$(command -v gradle)"
else
  if [[ ! -x "$GRADLE_HOME/bin/gradle" ]]; then
    ARCHIVE="${TMPDIR:-/tmp}/gradle-$GRADLE_VERSION-bin.zip"
    echo "Gradle $GRADLE_VERSION no está instalado; descargándolo una sola vez..."
    curl --fail --location --retry 3 \
      "https://services.gradle.org/distributions/gradle-$GRADLE_VERSION-bin.zip" \
      --output "$ARCHIVE"
    mkdir -p "$(dirname "$GRADLE_HOME")"
    unzip -q -o "$ARCHIVE" -d "$(dirname "$GRADLE_HOME")"
    rm -f "$ARCHIVE"
  fi
  GRADLE="$GRADLE_HOME/bin/gradle"
fi

echo "Compilando e instalando app-debug.apk en el dispositivo conectado..."
cd "$ANDROID_DIR"
"$GRADLE" --no-daemon clean :app:installDebug

echo "APK instalado correctamente."

#!/usr/bin/env bash
set -euo pipefail

fail() {
  printf '%s\n' "$*" >&2
  exit 1
}

repo_root=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd -P)
toolchain="$repo_root/.mobile/android"
avd_name=LostFound_API_36
system_image='system-images;android-36;google_apis_playstore;arm64-v8a'

[[ $(uname -s) == Darwin && $(uname -m) == arm64 ]] ||
  fail 'Lệnh này dành cho Mac Apple Silicon. Trên máy khác, xem docs/operations/environments.md.'

export JAVA_HOME="$(/usr/libexec/java_home -v 17 2>/dev/null)" ||
  fail 'Cần cài JDK 17 trước khi chạy Android.'
[[ -x "$JAVA_HOME/bin/java" ]] || fail 'Cần cài JDK 17 trước khi chạy Android.'
export ANDROID_HOME="${ANDROID_HOME:-${ANDROID_SDK_ROOT:-$toolchain/sdk}}"
export ANDROID_SDK_ROOT="$ANDROID_HOME"
export ANDROID_AVD_HOME="${ANDROID_AVD_HOME:-$toolchain/avd}"
export PATH="$ANDROID_HOME/platform-tools:$ANDROID_HOME/emulator:$PATH"

sdk_tools="$ANDROID_HOME/cmdline-tools/latest/bin"
packages=(
  'platform-tools'
  'emulator'
  'platforms;android-37.0'
  'build-tools;36.0.0'
  'build-tools;37.0.0'
  'ndk;27.1.12297006'
  'cmake;3.22.1'
  "$system_image"
)

missing_packages() {
  local package package_path
  for package in "${packages[@]}"; do
    package_path=$(printf '%s' "$package" | tr ';' '/')
    if [[ ! -f "$ANDROID_HOME/$package_path/package.xml" ]]; then
      printf '%s\n' "$package"
    fi
  done
}

case "${1:-}" in
  setup)
    if [[ ! -x "$sdk_tools/sdkmanager" || ! -x "$sdk_tools/avdmanager" ]]; then
      mkdir -p "$ANDROID_HOME/cmdline-tools"
      [[ ! -e "$ANDROID_HOME/cmdline-tools/latest" ]] ||
        fail "Thư mục command-line tools đang tồn tại nhưng thiếu tệp. Kiểm tra $ANDROID_HOME/cmdline-tools/latest."
      staging=$(mktemp -d "$ANDROID_HOME/cmdline-tools/download.XXXXXX")
      trap 'rm -r -- "$staging"' EXIT
      archive="$staging/commandlinetools.zip"
      curl -fL --retry 3 -o "$archive" \
        https://dl.google.com/android/repository/commandlinetools-mac_arm64-15859902_latest.zip
      printf '%s  %s\n' '835b62a26162b229b441d1f6d4680383815a270809eb33522c0d480fa5002c4e' "$archive" |
        shasum -a 256 -c
      unzip -q "$archive" -d "$staging"
      mv "$staging/cmdline-tools" "$ANDROID_HOME/cmdline-tools/latest"
      rm "$archive"
      rmdir "$staging"
      trap - EXIT
    fi

    if [[ -n $(missing_packages) ]]; then
      "$sdk_tools/sdkmanager" --sdk_root="$ANDROID_HOME" --licenses
      "$sdk_tools/sdkmanager" --sdk_root="$ANDROID_HOME" --install "${packages[@]}"
      [[ -z $(missing_packages) ]] || fail "SDK chưa đủ gói: $(missing_packages)"
    fi

    mkdir -p "$ANDROID_AVD_HOME"
    if ! "$ANDROID_HOME/emulator/emulator" -list-avds | grep -Fxq "$avd_name"; then
      config="$ANDROID_AVD_HOME/$avd_name.avd/config.ini"
      # Some command-line tools report missing devices.xml after creating the AVD.
      if ! printf 'no\n' | "$sdk_tools/avdmanager" create avd \
        --name "$avd_name" --package "$system_image" --device pixel_6; then
        [[ -s "$ANDROID_AVD_HOME/$avd_name.ini" ]] &&
        [[ -s "$config" ]] &&
          grep -Fxq 'image.sysdir.1=system-images/android-36/google_apis_playstore/arm64-v8a/' "$config" ||
          fail 'Không tạo được máy ảo Pixel 6.'
      fi

      awk -F= '$1 != "disk.dataPartition.size" && $1 != "PlayStore.enabled" { print }
        END { print "disk.dataPartition.size=4096M"; print "PlayStore.enabled=yes" }' "$config" > "$config.tmp"
      mv "$config.tmp" "$config"
    fi
    printf 'Máy ảo %s đã sẵn sàng. Chạy npm run mobile:android.\n' "$avd_name"
    ;;
  run)
    [[ -z $(missing_packages) ]] || fail 'Chạy npm run mobile:android:setup để cài đủ gói Android.'
    shift
    if [[ $# -eq 0 ]]; then
      "$ANDROID_HOME/emulator/emulator" -list-avds | grep -Fxq "$avd_name" ||
        fail 'Chạy npm run mobile:android:setup để tạo máy ảo Pixel 6.'
      set -- --device "$avd_name"
    fi
    [[ -x "$repo_root/apps/mobile/node_modules/.bin/expo" ]] ||
      fail 'Chạy npm run mobile:setup để cài thư viện của app.'
    export REACT_NATIVE_PACKAGER_HOSTNAME="${REACT_NATIVE_PACKAGER_HOSTNAME:-127.0.0.1}"
    exec npm run android --prefix "$repo_root/apps/mobile" -- "$@"
    ;;
  *) fail 'Dùng npm run mobile:android:setup hoặc npm run mobile:android.' ;;
esac

#Requires -Version 5.1
$ErrorActionPreference = 'Stop'

if ($env:OS -ne 'Windows_NT' -or $env:PROCESSOR_ARCHITECTURE -ne 'AMD64') {
    throw 'Run this script in 64-bit PowerShell on Windows x64.'
}

$repo = Split-Path -Parent $PSScriptRoot
$npm = Get-Command npm.cmd -ErrorAction SilentlyContinue
if (-not $npm) {
    throw 'Install Node.js 22.13+ or 24.3+ and reopen PowerShell.'
}
if (-not $env:JAVA_HOME -or -not (Test-Path (Join-Path $env:JAVA_HOME 'bin\javac.exe'))) {
    throw 'Install JDK 17 and set JAVA_HOME to its installation directory.'
}
$java = Join-Path $env:JAVA_HOME 'bin\java.exe'
if ((& $java --version | Select-Object -First 1) -notmatch '^(openjdk|java) 17([. ]|$)') {
    throw 'Set JAVA_HOME to a JDK 17 installation.'
}

$sdk = $env:ANDROID_HOME
if (-not $sdk) { $sdk = $env:ANDROID_SDK_ROOT }
if (-not $sdk) { $sdk = Join-Path $env:LOCALAPPDATA 'Android\Sdk' }
$sdkManager = Join-Path $sdk 'cmdline-tools\latest\bin\sdkmanager.bat'
$avdManager = Join-Path $sdk 'cmdline-tools\latest\bin\avdmanager.bat'
if (-not (Test-Path $sdkManager) -or -not (Test-Path $avdManager)) {
    throw 'In Android Studio SDK Manager, install Android SDK Command-line Tools (latest). Set ANDROID_HOME if you use a custom SDK directory.'
}

$env:ANDROID_HOME = $sdk
$env:ANDROID_SDK_ROOT = $sdk
if (-not $env:ANDROID_AVD_HOME) {
    $env:ANDROID_AVD_HOME = Join-Path $repo '.mobile\android\avd'
}
$env:Path = "$(Join-Path $sdk 'platform-tools');$(Join-Path $sdk 'emulator');$env:Path"

$image = 'system-images;android-36;google_apis_playstore;x86_64'
$packages = @(
    'platform-tools', 'emulator', 'platforms;android-37.0',
    'build-tools;36.0.0', 'build-tools;37.0.0',
    'ndk;27.1.12297006', 'cmake;3.22.1', $image
)
$missing = @($packages | Where-Object {
    -not (Test-Path (Join-Path $sdk (($_ -replace ';', '\') + '\package.xml')))
})
if ($missing.Count -gt 0) {
    & $sdkManager "--sdk_root=$sdk" --licenses
    if ($LASTEXITCODE -ne 0) { throw 'Android SDK license check failed.' }
    & $sdkManager "--sdk_root=$sdk" --install @missing
    if ($LASTEXITCODE -ne 0) { throw 'Android SDK package installation failed.' }
}

$avdName = 'LostFound_API_36'
$emulator = Join-Path $sdk 'emulator\emulator.exe'
New-Item -ItemType Directory -Force -Path $env:ANDROID_AVD_HOME | Out-Null
$avds = & $emulator -list-avds
if ($LASTEXITCODE -ne 0) { throw 'Could not list Android virtual devices.' }
if ($avds -notcontains $avdName) {
    $avdDir = Join-Path $env:ANDROID_AVD_HOME "$avdName.avd"
    'no' | & $avdManager create avd --name $avdName --package $image --device pixel_6 --path $avdDir
    $createExit = $LASTEXITCODE
    $config = Join-Path $avdDir 'config.ini'
    # Some command-line tools report a missing devices.xml after writing a valid AVD.
    if (-not (Test-Path (Join-Path $env:ANDROID_AVD_HOME "$avdName.ini")) -or -not (Test-Path $config)) {
        throw "Could not create $avdName (avdmanager exit code $createExit)."
    }
    $settings = Get-Content -LiteralPath $config
    $expectedImage = "image.sysdir.1=$($image.Replace(';', '/'))"
    if (-not ($settings | Where-Object { $_.Replace('\', '/').TrimEnd('/') -eq $expectedImage })) {
        throw "The AVD did not register the requested Google Play image (avdmanager exit code $createExit)."
    }
    $settings = @($settings | Where-Object { $_ -notmatch '^(disk\.dataPartition\.size|PlayStore\.enabled)=' })
    $settings += @('disk.dataPartition.size=4096M', 'PlayStore.enabled=yes')
    $settings | Set-Content -LiteralPath $config -Encoding Ascii
}

Push-Location $repo
try {
    & $npm.Source run mobile:setup
    if ($LASTEXITCODE -ne 0) { throw 'Mobile dependency installation failed.' }
    $env:REACT_NATIVE_PACKAGER_HOSTNAME = '127.0.0.1'
    & $npm.Source run android --prefix apps/mobile -- --device $avdName
    if ($LASTEXITCODE -ne 0) { throw 'The Android development build failed.' }
} finally {
    Pop-Location
}

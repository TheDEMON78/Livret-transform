const { execFileSync } = require("child_process");
const path = require("path");

/**
 * We don't have a paid Apple Developer certificate, so electron-builder
 * produces a completely unsigned .app (CSC_IDENTITY_AUTO_DISCOVERY=false
 * in CI disables its own signing attempt). On Apple Silicon, macOS
 * refuses to even launch an unsigned arm64 binary and reports it as
 * "damaged" — a misleading error for what's really a missing signature.
 * An ad-hoc signature (no real identity, just "-") is enough to satisfy
 * that requirement and let the app launch; Gatekeeper still shows the
 * normal "unidentified developer" prompt, which users can bypass via
 * right-click > Open.
 */
exports.default = async function afterPack(context) {
  if (context.electronPlatformName !== "darwin") return;

  const appName = `${context.packager.appInfo.productFilename}.app`;
  const appPath = path.join(context.appOutDir, appName);

  execFileSync("codesign", ["--force", "--deep", "--sign", "-", appPath], {
    stdio: "inherit",
  });
};

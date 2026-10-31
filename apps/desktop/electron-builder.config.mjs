// Packages the desktop app (desktop spec §3.4). `pnpm desktop:mac` / `pnpm desktop:win` at the repo root run
// every step. Signing turns on only when the owner's certificates are in the environment:
//   macOS: CSC_LINK + CSC_KEY_PASSWORD (Developer ID Application), and APPLE_ID + APPLE_APP_SPECIFIC_PASSWORD +
//          APPLE_TEAM_ID to notarise. Without them the app is ad-hoc signed, without the hardened runtime
//          (ad-hoc frameworks fail its library validation).
//   Windows: WIN_CSC_LINK + WIN_CSC_KEY_PASSWORD. Without them the installer is unsigned.

/**
 * @param {Readonly<Record<string, string | undefined>>} env
 * @returns {import('electron-builder').Configuration}
 */
export function builderConfig(env) {
  const developerId = Boolean(env.CSC_LINK);
  const notarise = developerId && Boolean(env.APPLE_ID && env.APPLE_TEAM_ID);
  return {
    appId: 'io.github.jaybecina.ethergrove',
    productName: 'Ethergrove Chronicles',
    copyright: 'Copyright © 2026 Jay Becina',
    artifactName: 'Ethergrove-Chronicles-${version}-${os}-${arch}.${ext}',
    directories: { output: 'release', buildResources: 'build' },
    files: ['package.json', 'dist/**/*.js', 'web/**/*'],
    asar: true,
    // Releases are drafts until the Desktop workflow's publish job releases them (auto-update spec §3).
    publish: [
      {
        provider: 'github',
        owner: 'jaybecina',
        repo: 'ethergrove-chronicles',
        releaseType: 'draft',
      },
    ],
    // The app reads this at runtime: only a Developer ID signed Mac can install updates itself.
    extraMetadata: { ethergroveMacSigned: developerId },
    electronFuses: {
      runAsNode: false,
      enableCookieEncryption: true,
      enableNodeOptionsEnvironmentVariable: false,
      enableNodeCliInspectArguments: false,
      enableEmbeddedAsarIntegrityValidation: true,
      onlyLoadAppFromAsar: true,
      grantFileProtocolExtraPrivileges: false,
    },
    mac: {
      category: 'public.app-category.games',
      icon: 'build/icon.png',
      minimumSystemVersion: '12.0',
      // The zip is what latest-mac.yml points at for updates; the dmg stays the download for people.
      target: [
        { target: 'dmg', arch: ['arm64', 'x64'] },
        { target: 'zip', arch: ['arm64', 'x64'] },
      ],
      // '-' is an ad-hoc signature: it seals the bundle so Apple Silicon runs it, but names no developer.
      ...(developerId ? {} : { identity: '-' }),
      hardenedRuntime: developerId,
      notarize: notarise,
    },
    dmg: { title: 'Ethergrove Chronicles ${version}' },
    win: {
      icon: 'build/icon.png',
      target: [{ target: 'nsis', arch: ['x64'] }],
    },
    nsis: {
      oneClick: false,
      perMachine: false,
      allowToChangeInstallationDirectory: true,
      createDesktopShortcut: true,
      createStartMenuShortcut: true,
      shortcutName: 'Ethergrove Chronicles',
      // Uninstalling keeps saves and settings in the user's AppData folder.
      deleteAppDataOnUninstall: false,
    },
  };
}

export default builderConfig(process.env);

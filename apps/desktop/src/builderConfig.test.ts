import { describe, expect, it } from 'vitest';
import { builderConfig } from '../electron-builder.config.mjs';

describe('packaging config (desktop spec §3.4)', () => {
  it('builds a dmg per Mac CPU and a per-user Windows installer that keeps saves', () => {
    const c = builderConfig({});
    expect(c.appId).toBe('io.github.jaybecina.ethergrove');
    expect(c.productName).toBe('Ethergrove Chronicles');
    expect(c.mac?.target).toEqual([{ target: 'dmg', arch: ['arm64', 'x64'] }]);
    expect(c.win?.target).toEqual([{ target: 'nsis', arch: ['x64'] }]);
    expect(c.nsis).toMatchObject({
      oneClick: false,
      perMachine: false,
      deleteAppDataOnUninstall: false,
    });
    expect(c.files).toEqual(['package.json', 'dist/**/*.js', 'web/**/*']);
  });

  it('flips every hardening fuse', () => {
    expect(builderConfig({}).electronFuses).toEqual({
      runAsNode: false,
      enableCookieEncryption: true,
      enableNodeOptionsEnvironmentVariable: false,
      enableNodeCliInspectArguments: false,
      enableEmbeddedAsarIntegrityValidation: true,
      onlyLoadAppFromAsar: true,
      grantFileProtocolExtraPrivileges: false,
    });
  });

  it('without a certificate: ad-hoc signed, no hardened runtime, no notarising', () => {
    expect(builderConfig({}).mac).toMatchObject({
      identity: '-',
      hardenedRuntime: false,
      notarize: false,
    });
  });

  it('with a Developer ID: hardened runtime, and notarised when Apple credentials are set', () => {
    const signed = builderConfig({ CSC_LINK: 'cert.p12' }).mac;
    expect(signed).not.toHaveProperty('identity');
    expect(signed).toMatchObject({ hardenedRuntime: true, notarize: false });
    expect(
      builderConfig({ CSC_LINK: 'cert.p12', APPLE_ID: 'a@b.c', APPLE_TEAM_ID: 'TEAM' }).mac,
    ).toMatchObject({ hardenedRuntime: true, notarize: true });
  });
});

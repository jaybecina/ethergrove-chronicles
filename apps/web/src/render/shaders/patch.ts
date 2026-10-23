import type { Material, WebGLProgramParametersWithUniforms } from 'three';
import { shared } from './uniforms';

export interface PatchOptions {
  /** Sway amplitude at the top of the mesh (local y = 1); 0 disables wind. */
  wind?: number;
  /** Flatten near the player (grass). */
  trample?: boolean;
  /** Whiten upward faces by the shared snow amount. */
  snow?: boolean;
}

const ORIGIN = /* glsl */ `
  #ifdef USE_INSTANCING
    vec3 hvOrigin = (modelMatrix * instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
  #else
    vec3 hvOrigin = (modelMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
  #endif
`;

function windChunk(amp: number, trample: boolean): string {
  return /* glsl */ `
    ${ORIGIN}
    float hvH = max(position.y, 0.0);
    float hvW = sin(uTime * 1.7 + hvOrigin.x * 0.7 + hvOrigin.z * 0.45)
              + 0.45 * sin(uTime * 3.3 + hvOrigin.x * 1.9 + hvOrigin.z * 1.1);
    transformed.x += hvW * ${amp.toFixed(4)} * hvH * hvH;
    transformed.z += hvW * ${(amp * 0.4).toFixed(4)} * hvH * hvH;
    ${trample ? 'transformed.y *= mix(0.3, 1.0, smoothstep(0.2, 0.75, distance(hvOrigin.xz, uPlayer.xz)));' : ''}
  `;
}

const SNOW_NORMAL = /* glsl */ `
  #ifdef USE_INSTANCING
    vHvUp = normalize(mat3(modelMatrix) * mat3(instanceMatrix) * objectNormal).y;
  #else
    vHvUp = normalize(mat3(modelMatrix) * objectNormal).y;
  #endif
`;

const SNOW_COLOR = /* glsl */ `
  diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.93, 0.96, 1.0), smoothstep(0.55, 0.85, vHvUp) * uSnow);
`;

/** Patch a built-in three.js material with wind sway and/or snow cover (spec §4.4). */
export function patchMaterial<T extends Material>(material: T, opts: PatchOptions): T {
  const wind = opts.wind ?? 0;
  material.onBeforeCompile = (shader: WebGLProgramParametersWithUniforms) => {
    shader.uniforms.uTime = shared.uTime;
    shader.uniforms.uPlayer = shared.uPlayer;
    shader.uniforms.uSnow = shared.uSnow;
    let vs = `uniform float uTime;\nuniform vec3 uPlayer;\nvarying float vHvUp;\n${shader.vertexShader}`;
    let fs = `uniform float uSnow;\nvarying float vHvUp;\n${shader.fragmentShader}`;
    if (wind > 0)
      vs = vs.replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>\n${windChunk(wind, opts.trample === true)}`,
      );
    if (opts.snow) {
      vs = vs.replace(
        '#include <beginnormal_vertex>',
        `#include <beginnormal_vertex>\n${SNOW_NORMAL}`,
      );
      fs = fs.replace('#include <color_fragment>', `#include <color_fragment>\n${SNOW_COLOR}`);
    }
    shader.vertexShader = vs;
    shader.fragmentShader = fs;
  };
  material.customProgramCacheKey = () => `hv-${wind}-${opts.trample ? 1 : 0}-${opts.snow ? 1 : 0}`;
  return material;
}

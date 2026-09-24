/* =====================================================================
   UTILITATS DE MATERIALS I SOROLL
   ===================================================================== */
/* ---------- Boira de guerra: tots els materials enfosqueixen segons una textura del mapa ----------
   r = 1 visible · ~0.4 explorat · 0 inexplorat (negre) */
const FOG_UNIFORMS = {
  uFogTex: { value: null },
  uFogOrigin: { value: new THREE.Vector2(-CONFIG.MAP_LIMIT, -CONFIG.MAP_LIMIT) },
  uFogSize: { value: CONFIG.MAP_LIMIT * 2 },
};
function fogify(material) {
  const prev = material.onBeforeCompile;   // encadena amb altres modificacions del shader (terreny…)
  const prevKey = material.customProgramCacheKey();
  material.onBeforeCompile = (shader, r) => {
    prev.call(material, shader, r);
    shader.uniforms.uFogTex = FOG_UNIFORMS.uFogTex;
    shader.uniforms.uFogOrigin = FOG_UNIFORMS.uFogOrigin;
    shader.uniforms.uFogSize = FOG_UNIFORMS.uFogSize;
    shader.vertexShader = 'uniform vec2 uFogOrigin;\nuniform float uFogSize;\nvarying vec2 vFogUv;\n' +
      shader.vertexShader.replace('#include <project_vertex>', `#include <project_vertex>
        vec4 fogWP = vec4(transformed, 1.0);
        #ifdef USE_INSTANCING
          fogWP = instanceMatrix * fogWP;
        #endif
        fogWP = modelMatrix * fogWP;
        vFogUv = (fogWP.xz - uFogOrigin) / uFogSize;`);
    shader.fragmentShader = 'uniform sampler2D uFogTex;\nvarying vec2 vFogUv;\n' +
      shader.fragmentShader.replace('#include <fog_fragment>', `gl_FragColor.rgb *= texture2D(uFogTex, vFogUv).r;
        #include <fog_fragment>`);
  };
  material.customProgramCacheKey = () => 'fog-of-war' + prevKey;
  return material;
}

const matCache = new Map();
function mat(color, opts = {}) {
  const key = color + JSON.stringify(opts);
  if (!matCache.has(key)) {
    matCache.set(key, fogify(new THREE.MeshStandardMaterial({ color, roughness: 0.75, metalness: 0.0, ...opts })));
  }
  return matCache.get(key);
}

function hash2(x, z) {
  const s = Math.sin(x * 127.1 + z * 311.7) * 43758.5453;
  return s - Math.floor(s);
}
function valueNoise(x, z) {
  const xi = Math.floor(x), zi = Math.floor(z);
  const xf = x - xi, zf = z - zi;
  const u = xf * xf * (3 - 2 * xf), v = zf * zf * (3 - 2 * zf);
  const a = hash2(xi, zi), b = hash2(xi + 1, zi), c = hash2(xi, zi + 1), d = hash2(xi + 1, zi + 1);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}
function fbm(x, z) {
  let total = 0, amp = 0.5, freq = 1;
  for (let i = 0; i < 4; i++) { total += valueNoise(x * freq, z * freq) * amp; freq *= 2; amp *= 0.5; }
  return total / 0.9375;
}

function makeRadialTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d');
  const grd = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  grd.addColorStop(0.0, 'rgba(255,255,255,0.0)');
  grd.addColorStop(0.55, 'rgba(255,255,255,0.10)');
  grd.addColorStop(0.82, 'rgba(255,255,255,0.55)');
  grd.addColorStop(1.0, 'rgba(255,255,255,0.0)');
  g.fillStyle = grd;
  g.fillRect(0, 0, 128, 128);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}
const radialTex = makeRadialTexture();

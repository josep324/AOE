/* =====================================================================
   RENDERITZADOR, ESCENA, CEL I BOIRA
   ===================================================================== */
const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.08;
renderer.domElement.id = 'game';
renderer.domElement.tabIndex = 0;
document.body.prepend(renderer.domElement);
const canvas = renderer.domElement;

const scene = new THREE.Scene();
const FOG_COLOR = new THREE.Color(0xd3dfe2);
scene.background = FOG_COLOR.clone();
scene.fog = new THREE.Fog(FOG_COLOR, 150, 420);

// Cúpula de cel amb degradat (no afectada per la boira)
const sky = new THREE.Mesh(
  new THREE.SphereGeometry(1400, 32, 16),
  new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    fog: false,
    uniforms: {
      topColor: { value: new THREE.Color(0x4a84c4) },
      horizonColor: { value: FOG_COLOR.clone() },
      bottomColor: { value: new THREE.Color(0x9aa888) },
    },
    vertexShader: /* glsl */`
      varying vec3 vDir;
      void main() {
        vDir = normalize(position);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }`,
    fragmentShader: /* glsl */`
      uniform vec3 topColor;
      uniform vec3 horizonColor;
      uniform vec3 bottomColor;
      varying vec3 vDir;
      void main() {
        float h = vDir.y;
        vec3 col = h > 0.0
          ? mix(horizonColor, topColor, pow(smoothstep(0.0, 0.65, h), 0.75))
          : mix(horizonColor, bottomColor, smoothstep(0.0, -0.25, h));
        gl_FragColor = vec4(col, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  })
);
sky.renderOrder = -1;
scene.add(sky);

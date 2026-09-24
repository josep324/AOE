// Models 3D opcionals: tots els .glb de assets/models/ s'incrusten al fitxer final.
// Si un model existeix, substitueix automàticament el model fet amb primitives (vegeu docs/MODELS.md).
export const MODEL_URLS = import.meta.glob('../assets/models/**/*.glb', { eager: true, query: '?url', import: 'default' });

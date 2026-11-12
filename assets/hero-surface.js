// Ask for WebGL before Three.js constructs its renderer. Passing the verified surface into Three
// avoids its console error when WebGL is unavailable and leaves the static WebP untouched.
export function createWebGLSurface(doc = document) {
  const canvas = doc.createElement('canvas');
  try {
    const context = canvas.getContext('webgl2', {
      alpha: true,
      antialias: true,
      powerPreference: 'high-performance',
    });
    return context ? { canvas, context } : null;
  } catch {
    return null;
  }
}

// The home page hero: the SwarmUp mark in 3D, inside [data-hero].
//
// The mark sways and leans toward the pointer, a click turns it once, and the tile of the seat
// that site.js has pressed (you, Claude, Codex, the orchestrator) steps forward. The still render
// in the page stays visible until the first frame is drawn, and for good when WebGL or the model
// is missing. hero-loader.js never requests this module under reduced motion or below 900 px.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { createWebGLSurface } from './hero-surface.js';

const MODEL = new URL('./brand/icon.glb', import.meta.url).href;
// Node names in the model, in the order of the tabs.
const TILES = ['SM_Icon_Pink_TL', 'SM_Icon_Orange_TR', 'SM_Icon_Cyan_BL', 'SM_Icon_Violet_BR'];
const LIFT = 0.55;

const stage = document.querySelector('[data-hero]');
const tabs = [...document.querySelectorAll('[data-tab]')];

function start() {
  const surface = createWebGLSurface();
  if (!surface) return;
  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: true,
    canvas: surface.canvas,
    context: surface.context,
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  // The same view transform as the renders of the brand kit (Khronos PBR Neutral).
  renderer.toneMapping = THREE.NeutralToneMapping;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(22, 1, 0.1, 100);
  camera.position.set(0, 0.5, 8.4);
  camera.lookAt(0, 0, 0);

  // A soft room for the clearcoat to reflect, and the three lights of the brand kit's rig.
  const pmrem = new THREE.PMREMGenerator(renderer);
  const environment = pmrem.fromScene(new RoomEnvironment(), 0.04);
  scene.environment = environment.texture;
  pmrem.dispose();
  scene.environmentIntensity = 0.45;
  const key = new THREE.DirectionalLight(0xffffff, 2.3);
  key.position.set(-2.2, 2.2, 3.4);
  const fill = new THREE.DirectionalLight(0xffffff, 0.6);
  fill.position.set(3.0, 0.4, 2.5);
  const back = new THREE.DirectionalLight(0xffffff, 0.9);
  back.position.set(0.8, 3.5, -1.5);
  scene.add(key, fill, back);

  const lean = new THREE.Group(); // follows the pointer
  const turn = new THREE.Group(); // sways, and spins on a click
  lean.add(turn);
  scene.add(lean);

  const tiles = [];
  const pointer = new THREE.Vector2();
  let active = Math.max(
    0,
    tabs.findIndex((tab) => tab.getAttribute('aria-pressed') === 'true'),
  );
  let spinStart = -1;
  let visible = true;

  const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

  function dispose() {
    renderer.setAnimationLoop(null);
    environment.dispose();
    renderer.dispose();
    if (window.swarmupHero) delete window.swarmupHero;
  }

  function draw(now) {
    const seconds = now / 1000;
    let angle = Math.sin(seconds * 0.6) * 0.3 - 0.2;
    if (spinStart >= 0) {
      const t = (now - spinStart) / 1400;
      if (t >= 1) spinStart = -1;
      else angle += easeInOut(t) * Math.PI * 2;
    }
    turn.rotation.y = angle;
    const rate = 0.08;
    lean.rotation.y += (pointer.x * 0.35 - lean.rotation.y) * rate;
    lean.rotation.x += (pointer.y * 0.25 + 0.12 - lean.rotation.x) * rate;
    tiles.forEach((tile, i) => {
      const out = i === active ? 1 : 0;
      const z = tile.userData.rest.z + out * LIFT;
      const scale = 1 + out * 0.08;
      tile.position.z += (z - tile.position.z) * 0.12;
      tile.scale.setScalar(tile.scale.x + (scale - tile.scale.x) * 0.12);
    });
    renderer.render(scene, camera);
  }

  function resize() {
    const size = stage.clientWidth;
    if (size === 0) return;
    renderer.setSize(size, size, false);
    if (!visible) draw(performance.now());
  }

  // site.js calls this when a tab is pressed, by a person or by its own timer.
  window.swarmupHero = {
    show(index) {
      active = index;
    },
  };

  stage.addEventListener('pointermove', (event) => {
    const box = stage.getBoundingClientRect();
    pointer.set(
      ((event.clientX - box.left) / box.width) * 2 - 1,
      ((event.clientY - box.top) / box.height) * 2 - 1,
    );
  });
  stage.addEventListener('pointerleave', () => pointer.set(0, 0));
  stage.addEventListener('click', () => {
    if (spinStart < 0) spinStart = performance.now();
  });

  new GLTFLoader().load(
    MODEL,
    (gltf) => {
      const loadedTiles = TILES.map((name) => gltf.scene.getObjectByName(name));
      if (loadedTiles.some((tile) => !tile)) {
        dispose(); // An unexpected model: keep the still render.
        return;
      }
      turn.add(gltf.scene);
      for (const tile of loadedTiles) {
        tile.userData.rest = tile.position.clone();
        tiles.push(tile);
      }
      stage.append(renderer.domElement);
      new ResizeObserver(resize).observe(stage);
      resize();
      draw(performance.now());
      stage.classList.add('live');
      // Draw only while the mark is on screen.
      new IntersectionObserver(([entry]) => {
        visible = entry.isIntersecting;
        renderer.setAnimationLoop(visible ? draw : null);
      }).observe(stage);
    },
    undefined,
    dispose,
  );
}

if (
  stage &&
  window.matchMedia('(min-width: 900px)').matches &&
  !window.matchMedia('(prefers-reduced-motion: reduce)').matches
) {
  try {
    start();
  } catch {
    // No WebGL: the still render in the page is the hero.
  }
}

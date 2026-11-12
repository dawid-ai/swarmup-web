// The home page hero: the SwarmUp mark in 3D, inside [data-hero].
//
// The mark sways and leans toward the pointer, a click turns it once, and the tile of the seat
// that site.js has pressed (you, Claude, Codex, the orchestrator) steps forward. The still render
// in the page stays visible until the first frame is drawn, and for good when WebGL or the model
// is missing. With prefers-reduced-motion nothing moves by itself.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

const MODEL = new URL('./brand/icon.glb', import.meta.url).href;
// Node names in the model, in the order of the tabs.
const TILES = ['SM_Icon_Pink_TL', 'SM_Icon_Orange_TR', 'SM_Icon_Cyan_BL', 'SM_Icon_Violet_BR'];
const LIFT = 0.55;

const stage = document.querySelector('[data-hero]');
const tabs = [...document.querySelectorAll('[data-tab]')];
const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function start() {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
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
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
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

  function draw(now) {
    const seconds = now / 1000;
    let angle = still ? -0.35 : Math.sin(seconds * 0.6) * 0.3 - 0.2;
    if (spinStart >= 0) {
      const t = (now - spinStart) / 1400;
      if (t >= 1) spinStart = -1;
      else angle += easeInOut(t) * Math.PI * 2;
    }
    turn.rotation.y = angle;
    // Ease toward the pointer; snap when nothing may animate.
    const rate = still ? 1 : 0.08;
    lean.rotation.y += (pointer.x * 0.35 - lean.rotation.y) * rate;
    lean.rotation.x += (pointer.y * 0.25 + 0.12 - lean.rotation.x) * rate;
    tiles.forEach((tile, i) => {
      const out = i === active ? 1 : 0;
      const z = tile.userData.rest.z + out * LIFT;
      const scale = 1 + out * 0.08;
      tile.position.z += (z - tile.position.z) * (still ? 1 : 0.12);
      tile.scale.setScalar(tile.scale.x + (scale - tile.scale.x) * (still ? 1 : 0.12));
    });
    renderer.render(scene, camera);
  }

  function resize() {
    const size = stage.clientWidth;
    if (size === 0) return;
    renderer.setSize(size, size, false);
    if (still || !visible) draw(performance.now());
  }

  // site.js calls this when a tab is pressed, by a person or by its own timer.
  window.swarmupHero = {
    show(index) {
      active = index;
      if (still) draw(performance.now());
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
    if (!still && spinStart < 0) spinStart = performance.now();
  });

  new GLTFLoader().load(MODEL, (gltf) => {
    turn.add(gltf.scene);
    for (const name of TILES) {
      const tile = gltf.scene.getObjectByName(name);
      if (!tile) return; // an unexpected model: keep the still render
      tile.userData.rest = tile.position.clone();
      tiles.push(tile);
    }
    stage.append(renderer.domElement);
    new ResizeObserver(resize).observe(stage);
    resize();
    draw(performance.now());
    stage.classList.add('live');
    if (still) return;
    // Draw only while the mark is on screen.
    new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      renderer.setAnimationLoop(visible ? draw : null);
    }).observe(stage);
  });
}

if (stage) {
  try {
    start();
  } catch {
    // No WebGL: the still render in the page is the hero.
  }
}

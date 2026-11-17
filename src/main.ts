import '@fontsource/atkinson-hyperlegible/400.css';
import '@fontsource/atkinson-hyperlegible/700.css';
import * as THREE from 'three';

const app = document.getElementById('app')!;
app.style.cssText = 'position:fixed;inset:0;background:#F3E6CC';

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
app.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color('#F3E6CC');
const camera = new THREE.OrthographicCamera(-8, 8, 4.5, -4.5, 0.1, 100);
camera.position.z = 10;

const shape = new THREE.Shape();
shape.absarc(0, 0, 2, 0, Math.PI * 2, false);
const ink = new THREE.Mesh(new THREE.CircleGeometry(2.12, 64), new THREE.MeshBasicMaterial({ color: '#2B1D14' }));
const paper = new THREE.Mesh(new THREE.ShapeGeometry(shape, 64), new THREE.MeshBasicMaterial({ color: '#E8772E' }));
paper.position.z = 0.01;
scene.add(ink, paper);

function resize() {
  const w = window.innerWidth;
  const h = window.innerHeight;
  renderer.setSize(w, h);
  const aspect = w / h;
  camera.left = -4.5 * aspect;
  camera.right = 4.5 * aspect;
  camera.updateProjectionMatrix();
  renderer.render(scene, camera);
}
window.addEventListener('resize', resize);
resize();

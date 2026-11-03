import { useEffect, useRef } from 'react';
import * as THREE from 'three';

/** Decorative, procedural fish-shaped particle field. No portfolio data is encoded here. */
export default function WaterField({ progress }: { progress: { current: number } }) {
  const container = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const host = container.current;
    if (!host || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    let renderer: THREE.WebGLRenderer;
    try { renderer = new THREE.WebGLRenderer({ alpha: true, antialias: false, powerPreference: 'low-power' }); }
    catch { return; }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    renderer.setClearColor(0x000000, 0);
    host.appendChild(renderer.domElement);
    host.classList.add('is-rendering');

    let seed = 7421;
    const random = () => {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      return seed / 4294967296;
    };
    const positions: number[] = [];
    const colors: number[] = [];
    const add = (x: number, y: number, z: number, brightness = 1) => {
      positions.push(x, y, z);
      const shade = Math.min(1, (0.35 + random() * 0.6) * brightness);
      colors.push(shade * 0.86, shade * 0.91, shade * 0.94);
    };

    // Ellipsoidal body, broad fan tail, and two fins make an original fish silhouette.
    for (let index = 0; index < 5200; index++) {
      const x = -0.06 + (random() * 2 - 1) * 0.68;
      const profile = Math.sqrt(Math.max(0, 1 - ((x + 0.06) / 0.68) ** 2));
      const y = (random() * 2 - 1) * 0.35 * profile;
      const z = (random() * 2 - 1) * 0.29 * profile;
      if (x > 0.37 && x < 0.46 && y > 0.05 && y < 0.14 && z > 0.12) continue;
      add(x, y, z, 0.55 + (z + 0.29) * 0.85);
    }
    for (let index = 0; index < 1600; index++) {
      const t = random();
      const lobe = random() < 0.5 ? -1 : 1;
      const spread = (0.06 + random() * 0.44) * t;
      add(-0.58 - t * 0.56, lobe * spread, (random() - 0.5) * 0.12, 0.45 + t * 0.36);
    }
    for (let index = 0; index < 650; index++) {
      const x = -0.3 + random() * 0.58;
      const width = Math.max(0, 1 - Math.abs((x + 0.02) / 0.32));
      add(x, 0.23 + random() * 0.36 * width, (random() - 0.5) * 0.1, 0.48);
    }
    for (let index = 0; index < 500; index++) {
      const x = -0.3 + random() * 0.55;
      const width = Math.max(0, 1 - Math.abs((x + 0.02) / 0.3));
      add(x, -0.22 - random() * 0.23 * width, (random() - 0.5) * 0.1, 0.42);
    }
    for (let index = 0; index < 130; index++) {
      const angle = random() * Math.PI * 2;
      const radius = 0.031 + random() * 0.008;
      add(0.405 + Math.cos(angle) * radius, 0.098 + Math.sin(angle) * radius, 0.3, 1.2);
    }

    const fishGeometry = new THREE.BufferGeometry();
    fishGeometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    fishGeometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    const fishMaterial = new THREE.PointsMaterial({ size: 2.3, sizeAttenuation: false, vertexColors: true, transparent: true, opacity: 0.82, depthWrite: false });
    const fish = new THREE.Points(fishGeometry, fishMaterial);
    const scene = new THREE.Scene();
    scene.add(fish);

    const driftPositions: number[] = [];
    for (let index = 0; index < 460; index++) driftPositions.push((random() - 0.5) * 4.3, (random() - 0.5) * 2.2, (random() - 0.5) * 0.5);
    const driftGeometry = new THREE.BufferGeometry();
    driftGeometry.setAttribute('position', new THREE.Float32BufferAttribute(driftPositions, 3));
    const driftMaterial = new THREE.PointsMaterial({ color: 0x879296, size: 1.4, sizeAttenuation: false, transparent: true, opacity: 0.34, depthWrite: false });
    const drift = new THREE.Points(driftGeometry, driftMaterial);
    scene.add(drift);

    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 10);
    camera.position.z = 5;
    let baseScale = 1.28;
    let baseX = 0.16;
    let baseY = 0.18;
    let compact = false;
    const resize = () => {
      const width = Math.max(1, host.clientWidth);
      const height = Math.max(1, host.clientHeight);
      const aspect = width / height;
      compact = aspect < 0.75;
      camera.left = -aspect;
      camera.right = aspect;
      camera.updateProjectionMatrix();
      baseScale = compact ? 0.56 : aspect < 1.2 ? 0.88 : 1.28;
      baseX = compact ? 0 : 0.16;
      baseY = compact ? 0.17 : 0.18;
      fish.scale.setScalar(baseScale);
      fish.position.set(baseX, baseY, 0);
      renderer.setSize(width, height, false);
    };
    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(host);
    resize();

    let visible = true;
    const visibilityObserver = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; }, { threshold: 0 });
    visibilityObserver.observe(host);
    const pointer = { x: 0, y: 0 };
    const move = (event: PointerEvent) => {
      const rect = host.getBoundingClientRect();
      pointer.x = ((event.clientX - rect.left) / rect.width - 0.5) * 2;
      pointer.y = ((event.clientY - rect.top) / rect.height - 0.5) * 2;
    };
    const leave = () => { pointer.x = 0; pointer.y = 0; };
    host.addEventListener('pointermove', move);
    host.addEventListener('pointerleave', leave);
    let frame = 0;
    const animate = () => {
      frame = requestAnimationFrame(animate);
      if (!visible || document.hidden) return;
      const now = performance.now();
      const phaseOne = Math.min(1, Math.max(0, (progress.current - 0.08) / 0.44));
      const phaseTwo = Math.min(1, Math.max(0, (progress.current - 0.56) / 0.4));
      const targetScale = baseScale * (1 + phaseOne * 0.3 - phaseTwo * 0.14);
      fish.scale.setScalar(fish.scale.x + (targetScale - fish.scale.x) * 0.035);
      fish.position.x += ((baseX + (compact ? 0.08 : 0.3) * phaseOne - (compact ? 0.17 : 0.66) * phaseTwo) - fish.position.x) * 0.035;
      fish.rotation.y += ((Math.sin(now / 4400) * 0.08 + pointer.x * 0.16 + phaseOne * 0.28 - phaseTwo * 0.55) - fish.rotation.y) * 0.025;
      fish.rotation.x += ((pointer.y * -0.07) - fish.rotation.x) * 0.025;
      fish.rotation.z += ((phaseOne * -0.08 + phaseTwo * 0.15) - fish.rotation.z) * 0.025;
      fish.position.y += ((baseY + Math.sin(now / 3200) * 0.026 + phaseOne * 0.07 - phaseTwo * 0.11) - fish.position.y) * 0.04;
      fishMaterial.opacity = 0.82 - phaseTwo * 0.15;
      drift.rotation.z = now * 0.000004;
      renderer.render(scene, camera);
    };
    animate();
    return () => {
      cancelAnimationFrame(frame);
      resizeObserver.disconnect();
      visibilityObserver.disconnect();
      host.removeEventListener('pointermove', move);
      host.removeEventListener('pointerleave', leave);
      fishGeometry.dispose(); fishMaterial.dispose(); driftGeometry.dispose(); driftMaterial.dispose(); renderer.dispose();
      renderer.domElement.remove();
      host.classList.remove('is-rendering');
    };
  }, []);

  return <div className="water-field" ref={container} aria-hidden="true"><img className="water-fallback" src="/vlad-placeholder.png" alt="" /></div>;
}

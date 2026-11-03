import { useEffect, useRef } from 'react';
import * as THREE from 'three';

/** A restrained WebGL water column. Decorative only; never a data visualization. */
export default function WaterField() {
  const container = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const host = container.current;
    if (!host || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    let renderer: THREE.WebGLRenderer;
    try { renderer = new THREE.WebGLRenderer({ alpha: true, antialias: false, powerPreference: 'low-power' }); }
    catch { return; }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    host.appendChild(renderer.domElement);
    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 10);
    camera.position.z = 5;
    const count = 78;
    const positions = new Float32Array(count * 3);
    for (let index = 0; index < count; index++) {
      positions[index * 3] = ((index * 53) % 101) / 50 - 1;
      positions[index * 3 + 1] = ((index * 37) % 97) / 48 - 1;
      positions[index * 3 + 2] = ((index * 19) % 13) / 13;
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const material = new THREE.PointsMaterial({ color: 0x73d6c8, size: 0.007, transparent: true, opacity: 0.45, depthWrite: false });
    const field = new THREE.Points(geometry, material);
    scene.add(field);
    const resize = () => renderer.setSize(host.clientWidth, host.clientHeight, false);
    const observer = new ResizeObserver(resize);
    observer.observe(host);
    resize();
    let frame = 0;
    const animate = () => {
      frame = requestAnimationFrame(animate);
      if (document.hidden) return;
      field.rotation.z += 0.000035;
      field.position.y = Math.sin(performance.now() / 9000) * 0.035;
      renderer.render(scene, camera);
    };
    animate();
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      geometry.dispose(); material.dispose(); renderer.dispose();
      renderer.domElement.remove();
    };
  }, []);

  return <div className="water-field" ref={container} aria-hidden="true" />;
}

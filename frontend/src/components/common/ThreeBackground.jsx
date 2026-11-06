import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

/**
 * ThreeBackground
 * Ambient, subtle 3D floating constellation/dust particle background.
 * Reactive to mouse coordinates and page scrolling with spring damping.
 * Palette-synchronized (#06141B, #11212D, #253745, #4A5C6A, #9BA8AB, #CCD0CF).
 * No grid lines — only gentle, organic floating dots.
 */
export default function ThreeBackground({ darkMode = true }) {
  const mountRef = useRef(null);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    // Check user preference for reduced motion
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // ICPF 2026 6-color palette
    const PALETTE = {
      void: 0x06141B,
      midnight: 0x11212D,
      elevated: 0x253745,
      steel: 0x4A5C6A,
      muted: 0x9BA8AB,
      frost: 0xCCD0CF,
    };

    // 1. Scene & Camera Setup
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    camera.position.set(0, 0, 24);

    const renderer = new THREE.WebGLRenderer({
      powerPreference: 'high-performance',
      antialias: true,
      alpha: true,
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

    // Transparent canvas so CSS background & cards show through seamlessly
    renderer.setClearColor(0x000000, 0);

    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    // 2. Ambient Floating Constellation Particles (Moving Dots)
    const particleCount = 600;
    const particleGeo = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const initialPositions = new Float32Array(particleCount * 3);
    const speeds = new Float32Array(particleCount);
    const scales = new Float32Array(particleCount);

    for (let i = 0; i < particleCount; i++) {
      const x = (Math.random() - 0.5) * 55;
      const y = (Math.random() - 0.5) * 40;
      const z = (Math.random() - 0.5) * 35;

      positions[i * 3] = x;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = z;

      initialPositions[i * 3] = x;
      initialPositions[i * 3 + 1] = y;
      initialPositions[i * 3 + 2] = z;

      speeds[i] = 0.3 + Math.random() * 0.7;
      scales[i] = 0.5 + Math.random() * 0.5;
    }

    particleGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    // Custom circular soft particle texture
    const canvas = document.createElement('canvas');
    canvas.width = 32;
    canvas.height = 32;
    const ctx = canvas.getContext('2d');
    const grad = ctx.createRadialGradient(16, 16, 0, 16, 16, 16);
    grad.addColorStop(0, 'rgba(255, 255, 255, 1)');
    grad.addColorStop(0.4, 'rgba(255, 255, 255, 0.8)');
    grad.addColorStop(1, 'rgba(255, 255, 255, 0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(16, 16, 16, 0, Math.PI * 2);
    ctx.fill();

    const particleTexture = new THREE.CanvasTexture(canvas);

    const particleMaterial = new THREE.PointsMaterial({
      color: darkMode ? PALETTE.frost : PALETTE.steel,
      size: darkMode ? 0.32 : 0.28,
      map: particleTexture,
      transparent: true,
      opacity: darkMode ? 0.45 : 0.3,
      depthWrite: false,
      blending: darkMode ? THREE.AdditiveBlending : THREE.NormalBlending,
    });

    const particlePoints = new THREE.Points(particleGeo, particleMaterial);
    scene.add(particlePoints);

    // 3. Mouse & Scroll Interaction State
    const mouse = { x: 0, y: 0, targetX: 0, targetY: 0 };
    const scroll = { y: 0, targetY: 0 };

    const handleMouseMove = (e) => {
      mouse.targetX = (e.clientX / window.innerWidth) * 2 - 1;
      mouse.targetY = -(e.clientY / window.innerHeight) * 2 + 1;
    };

    const handleScroll = () => {
      scroll.targetY = window.scrollY;
    };

    const handleResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', handleResize);

    // 4. Animation Loop
    let animationFrameId;
    const clock = new THREE.Clock();

    const animate = () => {
      const elapsedTime = clock.getElapsedTime();

      // Smooth spring interpolation for mouse (Emil Kowalski spring damping)
      mouse.x += (mouse.targetX - mouse.x) * 0.04;
      mouse.y += (mouse.targetY - mouse.y) * 0.04;

      // Smooth scroll interpolation
      scroll.y += (scroll.targetY - scroll.y) * 0.06;
      const scrollOffset = scroll.y * 0.0025;

      // Camera reactive orientation
      camera.position.x = mouse.x * 2.8;
      camera.position.y = mouse.y * 2.0 - scrollOffset * 1.5;
      camera.lookAt(0, 0, 0);

      // Continuous subtle ambient drift for particles
      const posArray = particleGeo.attributes.position.array;
      for (let i = 0; i < particleCount; i++) {
        const idx = i * 3;
        const speed = speeds[i];

        // Float with sinusoidal drift
        posArray[idx] =
          initialPositions[idx] +
          Math.sin(elapsedTime * speed * 0.5 + i) * 1.2 +
          mouse.x * 0.8;
        posArray[idx + 1] =
          initialPositions[idx + 1] +
          Math.cos(elapsedTime * speed * 0.6 + i) * 1.0 +
          mouse.y * 0.6;
        posArray[idx + 2] =
          initialPositions[idx + 2] +
          Math.sin(elapsedTime * speed * 0.3 + i * 0.5) * 0.8;
      }
      particleGeo.attributes.position.needsUpdate = true;

      // Gentle orbital cloud rotation
      particlePoints.rotation.y = elapsedTime * 0.02 + mouse.x * 0.06;
      particlePoints.rotation.x = Math.sin(elapsedTime * 0.015) * 0.05 + mouse.y * 0.04;

      renderer.render(scene, camera);

      if (!prefersReducedMotion) {
        animationFrameId = requestAnimationFrame(animate);
      }
    };

    // Render static frame or start loop
    if (prefersReducedMotion) {
      renderer.render(scene, camera);
    } else {
      animate();
    }

    // 5. Cleanup on Unmount
    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleResize);

      particleGeo.dispose();
      particleMaterial.dispose();
      particleTexture.dispose();
      renderer.dispose();

      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [darkMode]);

  return (
    <div
      ref={mountRef}
      className="fixed inset-0 pointer-events-none z-0 overflow-hidden transition-opacity duration-300"
      aria-hidden="true"
    />
  );
}

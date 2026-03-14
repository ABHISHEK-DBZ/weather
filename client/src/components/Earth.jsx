import React, { useRef } from 'react';
import { useFrame, useLoader } from '@react-three/fiber';
import { TextureLoader } from 'three';
import * as THREE from 'three';

export default function Earth() {
  const earthRef = useRef();
  const glowRef  = useRef();

  const [diffuse, bump, specular] = useLoader(TextureLoader, [
    '/textures/earth_diffuse.jpg',
    '/textures/earth_bump.jpg',
    '/textures/earth_specular.jpg',
  ]);

  // Slow auto-rotation; pauses when OrbitControls are being used
  useFrame((state, delta) => {
    if (earthRef.current) {
      earthRef.current.rotation.y += delta * 0.05;
    }
    if (glowRef.current) {
      glowRef.current.rotation.y += delta * 0.04;
    }
  });

  return (
    <group>
      {/* ── Earth sphere ── */}
      <mesh ref={earthRef}>
        <sphereGeometry args={[2, 64, 64]} />
        <meshPhongMaterial
          map={diffuse}
          bumpMap={bump}
          bumpScale={0.06}
          specularMap={specular}
          specular={new THREE.Color(0x334455)}
          shininess={18}
        />
      </mesh>

      {/* ── Atmospheric glow (slightly larger, additive blend) ── */}
      <mesh ref={glowRef} scale={[1.06, 1.06, 1.06]}>
        <sphereGeometry args={[2, 32, 32]} />
        <meshBasicMaterial
          color={new THREE.Color(0x2266ff)}
          side={THREE.BackSide}
          transparent
          opacity={0.12}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>

      {/* ── Second glow pass – tighter ── */}
      <mesh scale={[1.025, 1.025, 1.025]}>
        <sphereGeometry args={[2, 32, 32]} />
        <meshBasicMaterial
          color={new THREE.Color(0x44aaff)}
          side={THREE.BackSide}
          transparent
          opacity={0.07}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>
    </group>
  );
}

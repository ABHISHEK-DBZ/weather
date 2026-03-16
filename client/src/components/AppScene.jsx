import React, { useRef, useState } from 'react';
import { Canvas, useThree, useFrame } from '@react-three/fiber';
import { OrbitControls, Stars, Html } from '@react-three/drei';
import * as THREE from 'three';
import gsap from 'gsap';

import Earth from './Earth';
import SearchBar from './SearchBar';
import AgriStats from './AgriStats';
import { latLongToCartesian } from '../utils/coordinates';

const GLOBE_RADIUS = 2;

// ─── Camera fly-to controller ────────────────────────────────────────────────
function CameraController({ targetPosition }) {
  const { camera } = useThree();

  React.useEffect(() => {
    if (!targetPosition) return;
    const mult = 2.0;
    gsap.to(camera.position, {
      x: targetPosition.x * mult,
      y: targetPosition.y * mult,
      z: targetPosition.z * mult,
      duration: 2.2,
      ease: 'power3.inOut',
    });
  }, [targetPosition, camera]);

  return null;
}

// ─── Weather condition → colours map ────────────────────────────────────────
const getMarkerColors = (code) => {
  if (code === 0) return { pin: '#fbbf24', ring: '#f59e0b' };
  if (code <= 3)  return { pin: '#94a3b8', ring: '#64748b' };
  if (code <= 49) return { pin: '#6b7280', ring: '#4b5563' };
  if (code <= 69) return { pin: '#60a5fa', ring: '#3b82f6' };
  if (code <= 82) return { pin: '#22d3ee', ring: '#06b6d4' };
  if (code <= 99) return { pin: '#a78bfa', ring: '#8b5cf6' };
  return { pin: '#9ca3af', ring: '#6b7280' };
};

const getWeatherEmoji = (code, isDay) => {
  if (code === 0) return isDay ? '☀️' : '🌙';
  if (code <= 2)  return '⛅';
  if (code === 3)  return '☁️';
  if (code <= 49) return '🌫️';
  if (code <= 69) return '🌧️';
  if (code <= 79) return '❄️';
  if (code <= 82) return '🌧️';
  if (code <= 99) return '⛈️';
  return '🌡️';
};

// ─── Animated pulsing ring ───────────────────────────────────────────────────
function PulsingRing({ color }) {
  const ringRef = useRef();
  useFrame(({ clock }) => {
    if (ringRef.current) {
      const s = 1 + Math.sin(clock.elapsedTime * 2) * 0.15;
      ringRef.current.scale.set(s, s, s);
      ringRef.current.material.opacity = 0.6 - Math.sin(clock.elapsedTime * 2) * 0.3;
    }
  });
  return (
    <mesh ref={ringRef}>
      <ringGeometry args={[0.06, 0.1, 32]} />
      <meshBasicMaterial color={color} transparent opacity={0.6} side={THREE.DoubleSide} />
    </mesh>
  );
}

// ─── 3D Pin marker ───────────────────────────────────────────────────────────
function WeatherMarker({ position, data }) {
  const { pin, ring } = getMarkerColors(data.code ?? 0);
  const normal = new THREE.Vector3(position.x, position.y, position.z).normalize();

  return (
    <group position={[position.x, position.y, position.z]}>
      {/* Sphere pin */}
      <mesh>
        <sphereGeometry args={[0.045, 16, 16]} />
        <meshBasicMaterial color={pin} />
      </mesh>

      {/* Pulsing ring oriented to globe surface */}
      <group quaternion={new THREE.Quaternion().setFromUnitVectors(
        new THREE.Vector3(0, 0, 1), normal
      )}>
        <PulsingRing color={ring} />
      </group>

      {/* HTML pop-up card */}
      <Html distanceFactor={8} zIndexRange={[100, 0]} className="pointer-events-none">
        <div style={{
          transform: 'translate(-50%, -110%)',
          background: 'rgba(0,0,0,0.75)',
          backdropFilter: 'blur(16px)',
          border: '1px solid rgba(255,255,255,0.12)',
          borderRadius: '14px',
          padding: '10px 14px',
          whiteSpace: 'nowrap',
          color: 'white',
          fontSize: '13px',
          boxShadow: `0 8px 32px ${ring}44`,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '3px' }}>
            <span style={{ fontSize: '18px' }}>{getWeatherEmoji(data.code, data.isDay)}</span>
            <span style={{ fontWeight: 700, fontSize: '15px' }}>{data.name}</span>
          </div>
          <div style={{ color: pin, fontWeight: 600, fontSize: '22px', lineHeight: 1 }}>
            {data.temp}°C
          </div>
          <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '11px', marginTop: '2px' }}>
            {data.condition} · Humidity {data.humidity}%
          </div>
        </div>
      </Html>
    </group>
  );
}

// ─── Main App Scene ──────────────────────────────────────────────────────────
export default function AppScene() {
  const [activeLocation, setActiveLocation] = useState(null);
  const controlsRef = useRef();

  const handleSearchData = (data) => {
    const coords = latLongToCartesian(data.lat, data.lon, GLOBE_RADIUS);
    setActiveLocation({ ...data, coords });
  };

  return (
    <div style={{
      width: '100vw',
      height: '100vh',
      background: 'radial-gradient(ellipse at center, #0a0e1a 0%, #000000 100%)',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* UI Overlay */}
      <SearchBar onSearchComplete={handleSearchData} />
      <AgriStats />

      {/* 3D Canvas */}
      <Canvas
        camera={{ position: [0, 0, 7], fov: 45 }}
        gl={{ antialias: true, alpha: true }}
        style={{ position: 'absolute', inset: 0 }}
      >
        <ambientLight intensity={0.35} />
        <directionalLight position={[10, 5, 10]} intensity={2.2} />
        <pointLight position={[-10, -5, -10]} intensity={0.3} color="#2244ff" />

        <Stars radius={120} depth={60} count={8000} factor={4.5} saturation={0.4} fade />

        <React.Suspense fallback={null}>
          <Earth />
        </React.Suspense>

        {activeLocation && (
          <WeatherMarker position={activeLocation.coords} data={activeLocation} />
        )}

        <OrbitControls
          ref={controlsRef}
          enablePan={false}
          minDistance={3}
          maxDistance={14}
          rotateSpeed={0.5}
          zoomSpeed={0.8}
          dampingFactor={0.08}
          enableDamping
        />

        <CameraController targetPosition={activeLocation?.coords} />
      </Canvas>

      {/* Bottom attribution */}
      <div style={{
        position: 'absolute',
        bottom: 16,
        left: '50%',
        transform: 'translateX(-50%)',
        color: 'rgba(255,255,255,0.2)',
        fontSize: '11px',
        fontFamily: 'monospace',
        letterSpacing: '0.05em',
        userSelect: 'none',
      }}>
        🌐 3D WEATHER PLATFORM · OPEN-METEO · REAL-TIME DATA
      </div>
    </div>
  );
}

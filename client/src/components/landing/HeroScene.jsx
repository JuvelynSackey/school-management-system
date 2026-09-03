import { useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Float, Html } from '@react-three/drei';

const CARDS = [
  { pos: [-1.9, 0.9, 0], value: '482', label: 'Students', tone: 'gold', floatSpeed: 1.1 },
  { pos: [1.7, 1.3, -0.6], value: '96%', label: 'Attendance', tone: 'cyan', floatSpeed: 1.4 },
  { pos: [-1.3, -1.1, -0.3], value: 'GH₵12k', label: 'Fees Collected', tone: 'plain', floatSpeed: 0.9 },
  { pos: [1.9, -0.7, 0.2], value: 'A1', label: 'Top Grade', tone: 'gold', floatSpeed: 1.25 },
  { pos: [0.1, 0.1, 0.9], value: 'Approved', label: 'Results Workflow', tone: 'cyan', floatSpeed: 1.0 },
];

function Card({ pos, value, label, tone, floatSpeed }) {
  return (
    <Float speed={floatSpeed} rotationIntensity={0.25} floatIntensity={0.7}>
      <group position={pos}>
        <Html transform distanceFactor={4} occlude={false} zIndexRange={[10, 0]}>
          <div className={`hero-scene-card hero-scene-card-${tone}`}>
            <span className="hero-scene-card-value">{value}</span>
            <span className="hero-scene-card-label">{label}</span>
          </div>
        </Html>
      </group>
    </Float>
  );
}

function Scene() {
  const groupRef = useRef(null);

  useFrame((state) => {
    if (!groupRef.current) return;
    groupRef.current.rotation.y += 0.0012;
    const targetX = state.pointer.y * 0.15;
    const targetY = state.pointer.x * 0.2;
    groupRef.current.rotation.x += (targetX - groupRef.current.rotation.x) * 0.03;
    groupRef.current.rotation.y += (targetY - groupRef.current.rotation.y) * 0.02;
  });

  return (
    <group ref={groupRef}>
      {CARDS.map((c) => <Card key={c.label} {...c} />)}
    </group>
  );
}

export default function HeroScene() {
  return (
    <Canvas
      camera={{ position: [0, 0, 6.5], fov: 42 }}
      gl={{ alpha: true, antialias: true }}
      dpr={[1, 1.75]}
      style={{ width: '100%', height: '100%' }}
    >
      <ambientLight intensity={1.1} />
      <Scene />
    </Canvas>
  );
}

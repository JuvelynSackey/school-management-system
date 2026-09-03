import { useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Float, Html } from '@react-three/drei';

const TONE_CLASSES = {
  cyan: 'text-cyan-600 dark:text-cyan-400',
  indigo: 'text-indigo-600 dark:text-indigo-400',
  plain: 'text-gray-900 dark:text-white',
};

// Floating interface-layer cards — reads as an actual product, not
// abstract shapes. Kept to 5 real product surfaces the brief names
// explicitly.
const LAYERS = [
  { pos: [-2.1, 1.0, 0], value: '482', label: 'Students', tone: 'cyan', floatSpeed: 1.1 },
  { pos: [1.9, 1.4, -0.5], value: '96%', label: 'Attendance', tone: 'plain', floatSpeed: 1.3 },
  { pos: [-1.4, -1.2, -0.3], value: 'GH₵128k', label: 'Fees Collected', tone: 'plain', floatSpeed: 0.9 },
  { pos: [2.1, -0.8, 0.2], value: 'Approved', label: 'Results Workflow', tone: 'cyan', floatSpeed: 1.25 },
  { pos: [0.1, 0.15, 0.9], value: '86.2', label: 'School Health Score', tone: 'indigo', floatSpeed: 1.0 },
];

function Layer({ pos, value, label, tone, floatSpeed }) {
  return (
    <Float speed={floatSpeed} rotationIntensity={0.2} floatIntensity={0.65}>
      <group position={pos}>
        <Html transform distanceFactor={4} occlude={false} zIndexRange={[10, 0]}>
          <div className="flex flex-col items-center gap-1 whitespace-nowrap rounded-xl border border-gray-200/70 bg-white/90 px-4 py-2.5 text-center shadow-lg backdrop-blur-sm dark:border-gray-700/70 dark:bg-gray-900/90">
            <span className={`text-lg font-bold ${TONE_CLASSES[tone]}`}>{value}</span>
            <span className="text-[10px] font-medium tracking-wide text-gray-500 dark:text-gray-400">{label}</span>
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
    groupRef.current.rotation.y += 0.001;
    const targetX = state.pointer.y * 0.12;
    const targetY = state.pointer.x * 0.16;
    groupRef.current.rotation.x += (targetX - groupRef.current.rotation.x) * 0.03;
    groupRef.current.rotation.y += (targetY - groupRef.current.rotation.y) * 0.02;
  });

  return (
    <group ref={groupRef}>
      {LAYERS.map((l) => <Layer key={l.label} {...l} />)}
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

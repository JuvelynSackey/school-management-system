import { useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Float, RoundedBox } from '@react-three/drei';

// Palette pulled straight from index.css's --landing-gold / --sidebar-bg /
// --landing-bg-alt so the scene reads as part of the same "cosmic" theme
// rather than a bolted-on demo. No external textures/HDRIs — everything
// here is procedural geometry + lights, so the hero never depends on a
// network fetch to render.
const GOLD = '#f5c344';
const GOLD_DARK = '#e0af2e';
const PURPLE_LIGHT = '#8b7fd6';
const CREAM = '#fdf6e3';

function FloatingMesh({
  children, position, scale = 1, floatSpeed = 1, rotationIntensity = 1,
}) {
  return (
    <Float speed={floatSpeed} rotationIntensity={rotationIntensity} floatIntensity={1.4}>
      <mesh position={position} scale={scale}>
        {children}
      </mesh>
    </Float>
  );
}

// The whole cluster drifts a little toward the cursor — a cheap, tasteful
// parallax that reads as "alive" without full orbit-control interactivity
// (this is a marketing hero, not a 3D viewer).
function DriftGroup({ children }) {
  const group = useRef(null);
  useFrame(({ pointer, clock }) => {
    if (!group.current) return;
    const t = clock.getElapsedTime();
    group.current.rotation.y += (pointer.x * 0.4 - group.current.rotation.y) * 0.02;
    group.current.rotation.x += (-pointer.y * 0.2 - group.current.rotation.x) * 0.02;
    group.current.position.y = Math.sin(t * 0.3) * 0.15;
  });
  return <group ref={group}>{children}</group>;
}

export default function Hero3D() {
  return (
    <Canvas
      camera={{ position: [0, 0, 9], fov: 40 }}
      gl={{ alpha: true, antialias: true }}
      style={{ width: '100%', height: '100%' }}
      dpr={[1, 1.75]}
    >
      <ambientLight intensity={0.8} />
      <directionalLight position={[4, 5, 5]} intensity={1.5} color={CREAM} />
      <pointLight position={[-4, -2, 3]} intensity={0.8} color={GOLD} />
      <pointLight position={[3, -3, -2]} intensity={0.4} color={PURPLE_LIGHT} />

      <DriftGroup>
        <FloatingMesh position={[0.6, 0.4, 0]} floatSpeed={1.1} rotationIntensity={0.7}>
          <icosahedronGeometry args={[1.15, 0]} />
          <meshStandardMaterial color={GOLD} metalness={0.4} roughness={0.25} />
        </FloatingMesh>

        <Float speed={0.8} rotationIntensity={1.1} floatIntensity={1.4}>
          <RoundedBox position={[-1.8, -0.6, -1]} args={[1.3, 1.3, 1.3]} radius={0.18} smoothness={4} scale={0.85}>
            <meshStandardMaterial color={PURPLE_LIGHT} metalness={0.2} roughness={0.5} />
          </RoundedBox>
        </Float>

        <FloatingMesh position={[1.9, -1.1, -1.5]} scale={0.9} floatSpeed={1.3} rotationIntensity={0.9}>
          <torusGeometry args={[0.75, 0.26, 24, 64]} />
          <meshStandardMaterial color={GOLD_DARK} metalness={0.5} roughness={0.3} />
        </FloatingMesh>

        <FloatingMesh position={[-1.4, 1.3, -0.5]} floatSpeed={1.5} rotationIntensity={0.5} scale={0.65}>
          <sphereGeometry args={[0.55, 32, 32]} />
          <meshStandardMaterial color={CREAM} metalness={0.1} roughness={0.6} />
        </FloatingMesh>

        <FloatingMesh position={[2.1, 1.2, -2]} scale={0.7} floatSpeed={1.8} rotationIntensity={1.3}>
          <octahedronGeometry args={[0.65, 0]} />
          <meshStandardMaterial color={GOLD} metalness={0.35} roughness={0.35} />
        </FloatingMesh>
      </DriftGroup>
    </Canvas>
  );
}

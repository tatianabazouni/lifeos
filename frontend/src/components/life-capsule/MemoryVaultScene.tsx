/**
 * MemoryVaultScene — 3D Memory Scrapbook Box
 *
 * A warm, cozy wooden box that opens to reveal memories as
 * tangible objects: polaroids, postcards, notes, and keepsakes.
 * Light, pastel, cinematic lighting.
 */
import { useRef, useMemo, useState, useEffect } from "react";
import { Canvas, useFrame, ThreeEvent } from "@react-three/fiber";
import { OrbitControls, Float, Environment, RoundedBox, Html } from "@react-three/drei";
import * as THREE from "three";

/* ─── Types ─── */
export interface MemoryItem {
  id: string;
  title: string;
  description: string;
  date: string;
  chapter: string;
  tags: string[];
  imageUrl?: string;
  type: "text" | "image" | "voice" | "video";
  emotion: "joy" | "calm" | "love" | "nostalgia" | "growth";
}

interface SceneProps {
  memories: MemoryItem[];
  onSelectMemory: (memory: MemoryItem) => void;
  isOpen: boolean;
  activeChapter: string | null;
  onClose?: () => void;
}

/* ─── Palette (light & warm) ─── */
const C = {
  primary: "#3C9F7C",
  accent: "#C5005E",
  highlight: "#FFD150",
  secondary: "#233FAF",
  wood: "#C4A35A",
  woodDark: "#A68B3C",
  woodLight: "#DCC88A",
  leather: "#D4B896",
  paper: "#FFFDF5",
  paperAged: "#F5E6C8",
  warmLight: "#FFF5E1",
  candleGlow: "#FFCC80",
  joy: "#FFD150",
  calm: "#233FAF",
  love: "#C5005E",
  nostalgia: "#9b87f5",
  growth: "#3C9F7C",
};

/* ─── Warm Dust Motes ─── */
function DustMotes({ count = 100 }: { count?: number }) {
  const ref = useRef<THREE.Points>(null);
  const positions = useMemo(() => {
    const p = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      p[i * 3] = (Math.random() - 0.5) * 8;
      p[i * 3 + 1] = Math.random() * 6 - 1;
      p[i * 3 + 2] = (Math.random() - 0.5) * 8;
    }
    return p;
  }, [count]);

  useFrame((_, delta) => {
    if (!ref.current) return;
    ref.current.rotation.y += delta * 0.006;
    const pos = ref.current.geometry.attributes.position.array as Float32Array;
    for (let i = 0; i < count; i++) {
      pos[i * 3 + 1] += delta * 0.015;
      if (pos[i * 3 + 1] > 5) pos[i * 3 + 1] = -1;
    }
    ref.current.geometry.attributes.position.needsUpdate = true;
  });

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial
        size={0.02}
        color={C.warmLight}
        transparent
        opacity={0.5}
        sizeAttenuation
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </points>
  );
}

/* ─── Wooden Memory Box ─── */
function MemoryBox({ isOpen }: { isOpen: boolean }) {
  const lidRef = useRef<THREE.Group>(null);
  const targetRotation = isOpen ? -Math.PI * 0.65 : 0;

  useFrame((_, delta) => {
    if (!lidRef.current) return;
    lidRef.current.rotation.x += (targetRotation - lidRef.current.rotation.x) * delta * 2.5;
  });

  const boxWidth = 5;
  const boxDepth = 4;
  const boxHeight = 2.5;
  const wall = 0.15;

  return (
    <group position={[0, -1.5, 0]}>
      {/* Bottom */}
      <mesh position={[0, 0, 0]} receiveShadow>
        <boxGeometry args={[boxWidth, wall, boxDepth]} />
        <meshStandardMaterial color={C.woodDark} roughness={0.7} metalness={0.05} />
      </mesh>
      {/* Front */}
      <mesh position={[0, boxHeight / 2, boxDepth / 2 - wall / 2]}>
        <boxGeometry args={[boxWidth, boxHeight, wall]} />
        <meshStandardMaterial color={C.wood} roughness={0.7} metalness={0.05} />
      </mesh>
      {/* Back */}
      <mesh position={[0, boxHeight / 2, -boxDepth / 2 + wall / 2]}>
        <boxGeometry args={[boxWidth, boxHeight, wall]} />
        <meshStandardMaterial color={C.wood} roughness={0.7} metalness={0.05} />
      </mesh>
      {/* Left */}
      <mesh position={[-boxWidth / 2 + wall / 2, boxHeight / 2, 0]}>
        <boxGeometry args={[wall, boxHeight, boxDepth]} />
        <meshStandardMaterial color={C.woodLight} roughness={0.7} metalness={0.05} />
      </mesh>
      {/* Right */}
      <mesh position={[boxWidth / 2 - wall / 2, boxHeight / 2, 0]}>
        <boxGeometry args={[wall, boxHeight, boxDepth]} />
        <meshStandardMaterial color={C.woodLight} roughness={0.7} metalness={0.05} />
      </mesh>
      {/* Interior floor */}
      <mesh position={[0, wall / 2 + 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[boxWidth - wall * 2, boxDepth - wall * 2]} />
        <meshStandardMaterial color={C.leather} roughness={0.9} metalness={0} />
      </mesh>
      {/* Lid (hinged at back) */}
      <group ref={lidRef} position={[0, boxHeight, -boxDepth / 2 + wall / 2]}>
        <mesh position={[0, wall / 2, boxDepth / 2 - wall / 2]} castShadow>
          <boxGeometry args={[boxWidth + 0.1, wall, boxDepth + 0.1]} />
          <meshStandardMaterial color={C.woodDark} roughness={0.7} metalness={0.05} />
        </mesh>
      </group>
    </group>
  );
}

/* ─── Polaroid ─── */
function PolaroidItem({ memory, position, rotation, onClick }: {
  memory: MemoryItem; position: [number, number, number]; rotation: [number, number, number]; onClick: () => void;
}) {
  const ref = useRef<THREE.Group>(null);
  const [hovered, setHovered] = useState(false);
  const emotionColor = C[memory.emotion] || C.primary;

  useFrame((state) => {
    if (!ref.current) return;
    ref.current.position.y = position[1] + Math.sin(state.clock.elapsedTime * 0.6 + position[0]) * 0.03 + (hovered ? 0.4 : 0);
    const s = hovered ? 1.08 : 1;
    ref.current.scale.lerp(new THREE.Vector3(s, s, s), 0.1);
  });

  return (
    <group ref={ref} position={position} rotation={rotation}
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      onPointerOver={(e) => { e.stopPropagation(); setHovered(true); document.body.style.cursor = "pointer"; }}
      onPointerOut={() => { setHovered(false); document.body.style.cursor = "auto"; }}
    >
      <RoundedBox args={[1.1, 1.4, 0.02]} radius={0.02} smoothness={4}>
        <meshStandardMaterial color={C.paper} roughness={0.85} />
      </RoundedBox>
      <mesh position={[0, 0.12, 0.011]}>
        <planeGeometry args={[0.9, 0.9]} />
        <meshStandardMaterial color={emotionColor} roughness={0.5} opacity={0.25} transparent />
      </mesh>
      <mesh position={[0.35, -0.55, 0.015]}>
        <circleGeometry args={[0.06, 16]} />
        <meshBasicMaterial color={emotionColor} />
      </mesh>
      {hovered && <pointLight position={[0, 0, 0.3]} color={emotionColor} intensity={0.5} distance={2} />}
    </group>
  );
}

/* ─── Sticky Note ─── */
function StickyNote({ memory, position, rotation, onClick }: {
  memory: MemoryItem; position: [number, number, number]; rotation: [number, number, number]; onClick: () => void;
}) {
  const ref = useRef<THREE.Group>(null);
  const [hovered, setHovered] = useState(false);
  const noteColors = [C.highlight, C.paperAged, "#FFE4B5", "#E8F5E9"];
  const noteColor = noteColors[memory.id.charCodeAt(0) % noteColors.length];

  useFrame((state) => {
    if (!ref.current) return;
    ref.current.position.y = position[1] + Math.sin(state.clock.elapsedTime * 0.5 + position[2]) * 0.02 + (hovered ? 0.35 : 0);
    const s = hovered ? 1.1 : 1;
    ref.current.scale.lerp(new THREE.Vector3(s, s, s), 0.1);
  });

  return (
    <group ref={ref} position={position} rotation={rotation}
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      onPointerOver={(e) => { e.stopPropagation(); setHovered(true); document.body.style.cursor = "pointer"; }}
      onPointerOut={() => { setHovered(false); document.body.style.cursor = "auto"; }}
    >
      <mesh>
        <planeGeometry args={[0.9, 0.9]} />
        <meshStandardMaterial color={noteColor} roughness={0.9} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[0.35, 0.35, 0.005]} rotation={[0, 0, Math.PI / 4]}>
        <planeGeometry args={[0.2, 0.2]} />
        <meshStandardMaterial color={noteColor} roughness={0.9} side={THREE.DoubleSide} />
      </mesh>
      {hovered && <pointLight position={[0, 0, 0.5]} color={C.warmLight} intensity={0.3} distance={2} />}
    </group>
  );
}

/* ─── Postcard ─── */
function PostcardItem({ memory, position, rotation, onClick }: {
  memory: MemoryItem; position: [number, number, number]; rotation: [number, number, number]; onClick: () => void;
}) {
  const ref = useRef<THREE.Group>(null);
  const [hovered, setHovered] = useState(false);
  const emotionColor = C[memory.emotion] || C.primary;

  useFrame((state) => {
    if (!ref.current) return;
    ref.current.position.y = position[1] + Math.sin(state.clock.elapsedTime * 0.7 + position[0] * 2) * 0.025 + (hovered ? 0.35 : 0);
    const s = hovered ? 1.08 : 1;
    ref.current.scale.lerp(new THREE.Vector3(s, s, s), 0.1);
  });

  return (
    <group ref={ref} position={position} rotation={rotation}
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      onPointerOver={(e) => { e.stopPropagation(); setHovered(true); document.body.style.cursor = "pointer"; }}
      onPointerOut={() => { setHovered(false); document.body.style.cursor = "auto"; }}
    >
      <RoundedBox args={[1.4, 0.9, 0.015]} radius={0.015} smoothness={4}>
        <meshStandardMaterial color={C.paperAged} roughness={0.85} />
      </RoundedBox>
      <mesh position={[0.5, 0.25, 0.009]}>
        <planeGeometry args={[0.25, 0.3]} />
        <meshStandardMaterial color={emotionColor} roughness={0.5} opacity={0.35} transparent />
      </mesh>
      <mesh position={[0, 0, 0.009]}>
        <planeGeometry args={[0.005, 0.7]} />
        <meshStandardMaterial color="#ccc" />
      </mesh>
      {hovered && <pointLight position={[0, 0, 0.4]} color={emotionColor} intensity={0.4} distance={2} />}
    </group>
  );
}

/* ─── Layout engine: paginated 3D stack inside the box ─── */
const PAGE_SIZE = 6; // visible cards per page (fanned out inside box)
const BOX_INNER_W = 4.4;
const BOX_INNER_D = 3.4;

function MemoryItems({
  memories,
  onSelect,
  page,
}: {
  memories: MemoryItem[];
  onSelect: (m: MemoryItem) => void;
  page: number;
}) {
  const totalPages = Math.max(1, Math.ceil(memories.length / PAGE_SIZE));
  const safePage = ((page % totalPages) + totalPages) % totalPages;

  const items = useMemo(() => {
    const start = safePage * PAGE_SIZE;
    const visible = memories.slice(start, start + PAGE_SIZE);

    // Grid 3 cols x 2 rows inside the box, kept within inner bounds
    const cols = 3;
    const rows = 2;
    const cellW = BOX_INNER_W / cols;
    const cellD = BOX_INNER_D / rows;

    return visible.map((memory, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const x = -BOX_INNER_W / 2 + cellW / 2 + col * cellW;
      const z = -BOX_INNER_D / 2 + cellD / 2 + row * cellD;
      // tiny stack lift so they layer nicely
      const y = -0.35 + i * 0.04;
      const rotY = ((memory.id.charCodeAt(0) % 7) - 3) * 0.05;
      const rotZ = ((memory.id.charCodeAt(1) % 7) - 3) * 0.03;
      const itemType = memory.id.charCodeAt(2) % 3;
      return {
        memory,
        position: [x, y, z] as [number, number, number],
        rotation: [-Math.PI / 2 + 0.08, rotY, rotZ] as [number, number, number],
        itemType,
      };
    });
  }, [memories, safePage]);

  // Background "pile" cards to suggest more memories beneath when there are extras
  const pileCount = Math.min(5, Math.max(0, memories.length - PAGE_SIZE));

  return (
    <group position={[0, -0.8, 0]}>
      {/* Hidden pile underneath */}
      {Array.from({ length: pileCount }).map((_, i) => (
        <mesh
          key={`pile-${i}`}
          position={[
            (Math.sin(i * 1.7) * 0.1),
            -0.55 - i * 0.015,
            (Math.cos(i * 1.3) * 0.08),
          ]}
          rotation={[-Math.PI / 2, 0, (i - 2) * 0.04]}
        >
          <planeGeometry args={[BOX_INNER_W * 0.85, BOX_INNER_D * 0.7]} />
          <meshStandardMaterial color={C.paperAged} roughness={0.95} />
        </mesh>
      ))}

      {items.map(({ memory, position, rotation, itemType }) => {
        const props = { memory, position, rotation, onClick: () => onSelect(memory), key: memory.id };
        if (itemType === 0)
          return (
            <Float key={memory.id} speed={0.8} floatIntensity={0.06} rotationIntensity={0.03}>
              <PolaroidItem {...props} />
            </Float>
          );
        if (itemType === 1)
          return (
            <Float key={memory.id} speed={0.6} floatIntensity={0.05} rotationIntensity={0.02}>
              <StickyNote {...props} />
            </Float>
          );
        return (
          <Float key={memory.id} speed={0.7} floatIntensity={0.06} rotationIntensity={0.02}>
            <PostcardItem {...props} />
          </Float>
        );
      })}
    </group>
  );
}

/* ─── Page indicator (dots) anchored above box ─── */
function PageIndicator({ page, totalPages }: { page: number; totalPages: number }) {
  if (totalPages <= 1) return null;
  return (
    <Html position={[0, 1.6, 0]} center transform={false} zIndexRange={[100, 0]}>
      <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-background/70 backdrop-blur-md border border-border/60 select-none pointer-events-none">
        {Array.from({ length: totalPages }).map((_, i) => (
          <span
            key={i}
            className={`block rounded-full transition-all duration-300 ${
              i === page ? "w-4 h-1.5 bg-primary" : "w-1.5 h-1.5 bg-muted-foreground/40"
            }`}
          />
        ))}
      </div>
    </Html>
  );
}


/* ─── Warm Lighting ─── */
function WarmLighting() {
  const candleRef = useRef<THREE.PointLight>(null);
  useFrame((state) => {
    if (!candleRef.current) return;
    candleRef.current.intensity = 1.2 + Math.sin(state.clock.elapsedTime * 3) * 0.1 + Math.sin(state.clock.elapsedTime * 7) * 0.05;
  });

  return (
    <>
      <ambientLight intensity={0.45} color={C.warmLight} />
      <directionalLight position={[3, 8, 4]} intensity={0.6} color="#FFF8F0" castShadow />
      <pointLight ref={candleRef} position={[0, 0.5, 0]} color={C.candleGlow} intensity={1.2} distance={6} castShadow />
      <pointLight position={[-3, 3, -2]} color={C.primary} intensity={0.1} distance={8} />
      <pointLight position={[3, 2, -3]} color={C.accent} intensity={0.08} distance={6} />
    </>
  );
}

/* ─── Exported Canvas ─── */
export function MemoryVaultCanvas({ memories, onSelectMemory, isOpen, activeChapter, onClose }: SceneProps) {
  const filtered = activeChapter ? memories.filter((m) => m.chapter === activeChapter) : memories;
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const [page, setPage] = useState(0);

  // reset page if filter changes or count shrinks
  useEffect(() => {
    if (page >= totalPages) setPage(0);
  }, [totalPages, page]);
  useEffect(() => {
    setPage(0);
  }, [activeChapter]);

  const goPrev = () => setPage((p) => (p - 1 + totalPages) % totalPages);
  const goNext = () => setPage((p) => (p + 1) % totalPages);

  // Keyboard arrow navigation when open
  useEffect(() => {
    if (!isOpen || totalPages <= 1) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") goPrev();
      else if (e.key === "ArrowRight") goNext();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, totalPages]);

  // Swipe/drag handling (touch + pointer). Horizontal-dominant swipes flip pages.
  const swipeRef = useRef<{ x: number; y: number; active: boolean; fired: boolean } | null>(null);
  const SWIPE_THRESHOLD = 60; // px
  const enableSwipe = isOpen && totalPages > 1;

  const handlePointerDown = (e: React.PointerEvent) => {
    if (!enableSwipe) return;
    // Only track touch + primary mouse; let OrbitControls keep right-drag/pinch
    if (e.pointerType === "mouse" && e.button !== 0) return;
    swipeRef.current = { x: e.clientX, y: e.clientY, active: true, fired: false };
  };
  const handlePointerMove = (e: React.PointerEvent) => {
    const s = swipeRef.current;
    if (!s || !s.active || s.fired) return;
    const dx = e.clientX - s.x;
    const dy = e.clientY - s.y;
    if (Math.abs(dx) > SWIPE_THRESHOLD && Math.abs(dx) > Math.abs(dy) * 1.3) {
      if (dx < 0) goNext();
      else goPrev();
      s.fired = true;
    }
  };
  const handlePointerEnd = () => {
    swipeRef.current = null;
  };

  return (
    <div
      className="w-full h-full touch-pan-y"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerEnd}
      onPointerCancel={handlePointerEnd}
      onPointerLeave={handlePointerEnd}
    >
      <Canvas
        camera={{ position: [0, 4, 6], fov: 40 }}
        shadows
        gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
        dpr={[1, 1.5]}
        style={{ background: "transparent" }}
      >
        <WarmLighting />
        <DustMotes count={80} />
        <MemoryBox isOpen={isOpen} />
        {isOpen && filtered.length > 0 && (
          <>
            <MemoryItems memories={filtered} onSelect={onSelectMemory} page={page} />
            <PageIndicator page={page} totalPages={totalPages} />
          </>
        )}
        {isOpen && onClose && (
          <Html position={[0, 2.2, 0]} center transform={false} zIndexRange={[100, 0]}>
            <button
              onClick={onClose}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-background/80 backdrop-blur-md border border-border shadow-lifted text-xs font-medium hover:bg-muted transition-colors select-none"
              aria-label="Close box"
            >
              <span className="text-base leading-none">✕</span>
              <span>Close box</span>
            </button>
          </Html>
        )}

        <OrbitControls
          enablePan={false}
          enableZoom
          minDistance={3.5}
          maxDistance={10}
          minPolarAngle={Math.PI / 8}
          maxPolarAngle={Math.PI / 2.2}
          autoRotate={!isOpen}
          autoRotateSpeed={0.4}
          dampingFactor={0.05}
          enableDamping
          target={[0, 0, 0]}
        />

        <Environment preset="apartment" />
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -2, 0]} receiveShadow>
          <planeGeometry args={[20, 20]} />
          <shadowMaterial opacity={0.1} />
        </mesh>
      </Canvas>
    </div>
  );
}



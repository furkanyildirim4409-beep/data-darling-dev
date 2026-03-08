import { Suspense, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Environment, ContactShadows } from "@react-three/drei";
import { Button } from "@/components/ui/button";
import { RotateCcw, ZoomIn, Layers } from "lucide-react";
import * as THREE from "three";

interface HumanModelProps {
  showMuscles: boolean;
}

function HumanModel({ showMuscles }: HumanModelProps) {
  const groupRef = useRef<THREE.Group>(null);
  
  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.3) * 0.1;
    }
  });

  const primaryColor = "#CCFF00";
  const bodyColor = "#1a1a1a";
  const muscleColor = showMuscles ? "#CCFF00" : "#2a2a2a";

  return (
    <group ref={groupRef} position={[0, -1.5, 0]}>
      {/* Head */}
      <mesh position={[0, 2.8, 0]}>
        <sphereGeometry args={[0.25, 32, 32]} />
        <meshStandardMaterial color={bodyColor} metalness={0.3} roughness={0.7} />
      </mesh>

      {/* Neck */}
      <mesh position={[0, 2.45, 0]}>
        <cylinderGeometry args={[0.08, 0.1, 0.2, 16]} />
        <meshStandardMaterial color={bodyColor} metalness={0.3} roughness={0.7} />
      </mesh>

      {/* Torso */}
      <mesh position={[0, 1.8, 0]}>
        <capsuleGeometry args={[0.35, 0.8, 8, 16]} />
        <meshStandardMaterial color={bodyColor} metalness={0.3} roughness={0.7} />
      </mesh>

      {/* Chest Muscles */}
      {showMuscles && (
        <>
          <mesh position={[-0.15, 2.1, 0.2]}>
            <sphereGeometry args={[0.12, 16, 16]} />
            <meshStandardMaterial color={muscleColor} metalness={0.5} roughness={0.5} emissive={primaryColor} emissiveIntensity={0.2} />
          </mesh>
          <mesh position={[0.15, 2.1, 0.2]}>
            <sphereGeometry args={[0.12, 16, 16]} />
            <meshStandardMaterial color={muscleColor} metalness={0.5} roughness={0.5} emissive={primaryColor} emissiveIntensity={0.2} />
          </mesh>
        </>
      )}

      {/* Shoulders */}
      <mesh position={[-0.45, 2.2, 0]}>
        <sphereGeometry args={[0.12, 16, 16]} />
        <meshStandardMaterial color={showMuscles ? muscleColor : bodyColor} metalness={0.5} roughness={0.5} emissive={showMuscles ? primaryColor : "#000"} emissiveIntensity={showMuscles ? 0.3 : 0} />
      </mesh>
      <mesh position={[0.45, 2.2, 0]}>
        <sphereGeometry args={[0.12, 16, 16]} />
        <meshStandardMaterial color={showMuscles ? muscleColor : bodyColor} metalness={0.5} roughness={0.5} emissive={showMuscles ? primaryColor : "#000"} emissiveIntensity={showMuscles ? 0.3 : 0} />
      </mesh>

      {/* Arms */}
      <mesh position={[-0.55, 1.7, 0]} rotation={[0, 0, 0.2]}>
        <capsuleGeometry args={[0.08, 0.6, 8, 16]} />
        <meshStandardMaterial color={bodyColor} metalness={0.3} roughness={0.7} />
      </mesh>
      <mesh position={[0.55, 1.7, 0]} rotation={[0, 0, -0.2]}>
        <capsuleGeometry args={[0.08, 0.6, 8, 16]} />
        <meshStandardMaterial color={bodyColor} metalness={0.3} roughness={0.7} />
      </mesh>

      {/* Forearms */}
      <mesh position={[-0.65, 1.1, 0]} rotation={[0, 0, 0.1]}>
        <capsuleGeometry args={[0.06, 0.5, 8, 16]} />
        <meshStandardMaterial color={bodyColor} metalness={0.3} roughness={0.7} />
      </mesh>
      <mesh position={[0.65, 1.1, 0]} rotation={[0, 0, -0.1]}>
        <capsuleGeometry args={[0.06, 0.5, 8, 16]} />
        <meshStandardMaterial color={bodyColor} metalness={0.3} roughness={0.7} />
      </mesh>

      {/* Hip */}
      <mesh position={[0, 1.2, 0]}>
        <capsuleGeometry args={[0.25, 0.2, 8, 16]} />
        <meshStandardMaterial color={bodyColor} metalness={0.3} roughness={0.7} />
      </mesh>

      {/* Thighs */}
      <mesh position={[-0.18, 0.65, 0]}>
        <capsuleGeometry args={[0.12, 0.6, 8, 16]} />
        <meshStandardMaterial color={showMuscles ? muscleColor : bodyColor} metalness={0.5} roughness={0.5} emissive={showMuscles ? primaryColor : "#000"} emissiveIntensity={showMuscles ? 0.15 : 0} />
      </mesh>
      <mesh position={[0.18, 0.65, 0]}>
        <capsuleGeometry args={[0.12, 0.6, 8, 16]} />
        <meshStandardMaterial color={showMuscles ? muscleColor : bodyColor} metalness={0.5} roughness={0.5} emissive={showMuscles ? primaryColor : "#000"} emissiveIntensity={showMuscles ? 0.15 : 0} />
      </mesh>

      {/* Calves */}
      <mesh position={[-0.18, 0, 0]}>
        <capsuleGeometry args={[0.08, 0.5, 8, 16]} />
        <meshStandardMaterial color={bodyColor} metalness={0.3} roughness={0.7} />
      </mesh>
      <mesh position={[0.18, 0, 0]}>
        <capsuleGeometry args={[0.08, 0.5, 8, 16]} />
        <meshStandardMaterial color={bodyColor} metalness={0.3} roughness={0.7} />
      </mesh>

      {/* Feet */}
      <mesh position={[-0.18, -0.35, 0.05]} rotation={[0.3, 0, 0]}>
        <boxGeometry args={[0.1, 0.08, 0.2]} />
        <meshStandardMaterial color={bodyColor} metalness={0.3} roughness={0.7} />
      </mesh>
      <mesh position={[0.18, -0.35, 0.05]} rotation={[0.3, 0, 0]}>
        <boxGeometry args={[0.1, 0.08, 0.2]} />
        <meshStandardMaterial color={bodyColor} metalness={0.3} roughness={0.7} />
      </mesh>

      {/* Core Glow Effect when muscles shown */}
      {showMuscles && (
        <mesh position={[0, 1.8, 0]}>
          <capsuleGeometry args={[0.36, 0.82, 8, 16]} />
          <meshStandardMaterial 
            color={primaryColor} 
            transparent 
            opacity={0.1} 
            emissive={primaryColor} 
            emissiveIntensity={0.3}
          />
        </mesh>
      )}
    </group>
  );
}

interface BodyModel3DViewerProps {
  lastScanDate: Date;
}

export function BodyModel3DViewer({ lastScanDate }: BodyModel3DViewerProps) {
  const [showMuscles, setShowMuscles] = useState(false);
  const controlsRef = useRef<any>(null);

  const handleReset = () => {
    if (controlsRef.current) {
      controlsRef.current.reset();
    }
  };

  const handleZoom = () => {
    if (controlsRef.current) {
      const currentDistance = controlsRef.current.getDistance();
      controlsRef.current.dollyTo(Math.max(currentDistance - 1, 2), true);
    }
  };

  return (
    <div className="space-y-3">
      {/* Last Scan Info */}
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">Son Tarama:</span>
        <span className="text-primary font-mono">
          {lastScanDate.toLocaleDateString('tr-TR', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
          })}
        </span>
      </div>

      {/* 3D Canvas */}
      <div className="relative aspect-[3/4] bg-gradient-to-b from-primary/5 to-background rounded-lg overflow-hidden border border-border">
        <Canvas
          camera={{ position: [0, 0, 5], fov: 50 }}
          style={{ background: "transparent" }}
        >
          <Suspense fallback={null}>
            <ambientLight intensity={0.4} />
            <spotLight
              position={[5, 5, 5]}
              angle={0.3}
              penumbra={1}
              intensity={1}
              color="#CCFF00"
            />
            <pointLight position={[-5, 5, -5]} intensity={0.5} color="#ffffff" />
            
            <HumanModel showMuscles={showMuscles} />
            
            <ContactShadows
              position={[0, -1.9, 0]}
              opacity={0.4}
              scale={5}
              blur={2}
              far={4}
              color="#CCFF00"
            />
            
            <OrbitControls
              ref={controlsRef}
              enablePan={false}
              minDistance={3}
              maxDistance={8}
              minPolarAngle={Math.PI / 4}
              maxPolarAngle={Math.PI / 1.5}
            />
            
            <Environment preset="city" />
          </Suspense>
        </Canvas>

        {/* Corner Markers */}
        <div className="absolute top-2 left-2 w-4 h-4 border-l-2 border-t-2 border-primary/50 pointer-events-none" />
        <div className="absolute top-2 right-2 w-4 h-4 border-r-2 border-t-2 border-primary/50 pointer-events-none" />
        <div className="absolute bottom-2 left-2 w-4 h-4 border-l-2 border-b-2 border-primary/50 pointer-events-none" />
        <div className="absolute bottom-2 right-2 w-4 h-4 border-r-2 border-b-2 border-primary/50 pointer-events-none" />

        {/* Model Loaded Label */}
        <div className="absolute top-3 left-1/2 -translate-x-1/2 px-2 py-1 bg-primary/20 rounded text-[10px] font-mono text-primary border border-primary/30">
          3D MODEL LOADED
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={handleReset}
          className="flex-1 h-8 text-xs border-border hover:bg-primary/10 hover:text-primary hover:border-primary/50"
        >
          <RotateCcw className="w-3 h-3 mr-1" />
          Sıfırla
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={handleZoom}
          className="flex-1 h-8 text-xs border-border hover:bg-primary/10 hover:text-primary hover:border-primary/50"
        >
          <ZoomIn className="w-3 h-3 mr-1" />
          Yakınlaştır
        </Button>
        <Button
          variant={showMuscles ? "default" : "outline"}
          size="sm"
          onClick={() => setShowMuscles(!showMuscles)}
          className={`flex-1 h-8 text-xs ${
            showMuscles
              ? ""
              : "border-border hover:bg-primary/10 hover:text-primary hover:border-primary/50"
          }`}
        >
          <Layers className="w-3 h-3 mr-1" />
          Kaslar
        </Button>
      </div>
    </div>
  );
}

"use client";

import React, { useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import {
  Line,
  Text,
  Sphere,
  Cylinder,
  MeshTransmissionMaterial,
} from "@react-three/drei";
import type { Direction } from "./protein-visualizer";
import type * as THREE from "three";

interface ProteinModelProps {
  sequence: string;
  directions?: Direction[];
  type: "2d" | "3d" | "ribbon" | "space-filling" | "surface";
}

interface Position {
  x: number;
  y: number;
  z: number;
}

const ProteinModel: React.FC<ProteinModelProps> = ({
  sequence,
  directions,
  type,
}) => {
  // Reference for rotation animation
  const groupRef = React.useRef<THREE.Group>(null);

  // Generate positions for each amino acid in the sequence
  const { positions, bonds } = useMemo(() => {
    const positions: Position[] = [];
    const bonds: [number, number][] = [];

    // If no directions provided, generate a default folding pattern
    const defaultDirections: Direction[] = [];
    if (!directions) {
      for (let i = 0; i < sequence.length - 1; i++) {
        // Simple alternating pattern
        defaultDirections.push(
          i % 2 === 0 ? "right" : i % 4 === 1 ? "up" : "down"
        );
      }
    }

    const dirs = directions || defaultDirections;

    // Start with the first amino acid at the origin
    positions.push({ x: 0, y: 0, z: 0 });

    // Place each subsequent amino acid based on the directions
    for (let i = 1; i < sequence.length; i++) {
      const prevPos = positions[i - 1];
      const direction = dirs[i - 1];

      let newPos: Position;

      switch (direction) {
        case "left":
          newPos = { x: prevPos.x - 1, y: prevPos.y, z: prevPos.z };
          break;
        case "right":
          newPos = { x: prevPos.x + 1, y: prevPos.y, z: prevPos.z };
          break;
        case "up":
          newPos = { x: prevPos.x, y: prevPos.y + 1, z: prevPos.z };
          break;
        case "down":
          newPos = { x: prevPos.x, y: prevPos.y - 1, z: prevPos.z };
          break;
        default:
          newPos = { x: prevPos.x + 1, y: prevPos.y, z: prevPos.z };
      }

      positions.push(newPos);
      bonds.push([i - 1, i]);
    }

    // For 3D visualization, add some z-axis variation
    if (type === "3d" || type === "ribbon" || type === "surface") {
      for (let i = 0; i < positions.length; i++) {
        // Add a slight curve to make it more 3D
        positions[i].z = Math.sin(i * 0.5) * 0.5;
      }
    }

    return { positions, bonds };
  }, [sequence, directions, type]);

  // Animate rotation
  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.rotation.y = state.clock.getElapsedTime() * 0.1;
    }
  });

  // Center the model
  const center = useMemo(() => {
    const x = positions.reduce((sum, pos) => sum + pos.x, 0) / positions.length;
    const y = positions.reduce((sum, pos) => sum + pos.y, 0) / positions.length;
    const z = positions.reduce((sum, pos) => sum + pos.z, 0) / positions.length;
    return { x, y, z };
  }, [positions]);

  // Generate a smooth curve for ribbon visualization
  const ribbonPoints = useMemo(() => {
    if (type !== "ribbon") return [];

    // Create a smooth curve through the positions
    const points: [number, number, number][] = [];
    for (let i = 0; i < positions.length; i++) {
      points.push([positions[i].x, positions[i].y, positions[i].z]);
    }
    return points;
  }, [positions, type]);

  return (
    <group ref={groupRef} position={[-center.x, -center.y, -center.z]}>
      {/* Render based on visualization type */}
      {type === "2d" || type === "3d" ? (
        <>
          {/* Render bonds as lines */}
          {bonds.map(([i, j], index) => (
            <Line
              key={`bond-${index}`}
              points={[
                [positions[i].x, positions[i].y, positions[i].z],
                [positions[j].x, positions[j].y, positions[j].z],
              ]}
              color="black"
              lineWidth={1.5}
            />
          ))}

          {/* Render amino acids as spheres */}
          {positions.map((pos, index) => (
            <group key={`amino-${index}`} position={[pos.x, pos.y, pos.z]}>
              <mesh>
                <sphereGeometry args={[0.3, 16, 16]} />
                <meshStandardMaterial
                  color={sequence[index] === "H" ? "#ff6b6b" : "#4dabf7"}
                  roughness={0.5}
                />
              </mesh>
              <Text
                position={[0, 0.5, 0]}
                fontSize={0.3}
                color="black"
                anchorX="center"
                anchorY="middle"
              >
                {sequence[index]}
              </Text>
            </group>
          ))}
        </>
      ) : type === "ribbon" ? (
        <>
          {/* Render a smooth ribbon through the positions */}
          <Line
            points={ribbonPoints}
            color="#4dabf7"
            lineWidth={5}
            dashed={false}
          />

          {/* Add spheres at hydrophobic positions */}
          {positions.map(
            (pos, index) =>
              sequence[index] === "H" && (
                <mesh key={`h-${index}`} position={[pos.x, pos.y, pos.z]}>
                  <sphereGeometry args={[0.2, 16, 16]} />
                  <meshStandardMaterial color="#ff6b6b" roughness={0.5} />
                </mesh>
              )
          )}
        </>
      ) : type === "space-filling" ? (
        <>
          {/* Render amino acids as larger spheres */}
          {positions.map((pos, index) => (
            <Sphere
              key={`sphere-${index}`}
              position={[pos.x, pos.y, pos.z]}
              args={[0.5, 32, 32]}
            >
              <meshStandardMaterial
                color={sequence[index] === "H" ? "#ff6b6b" : "#4dabf7"}
                roughness={0.3}
              />
            </Sphere>
          ))}
        </>
      ) : type === "surface" ? (
        <>
          {/* Render a surface representation */}
          {positions.map((pos, index) => (
            <Sphere
              key={`surface-${index}`}
              position={[pos.x, pos.y, pos.z]}
              args={[0.6, 32, 32]}
            >
              <MeshTransmissionMaterial
                backside
                samples={4}
                thickness={0.5}
                chromaticAberration={0.1}
                anisotropy={0.1}
                distortion={0.1}
                distortionScale={0.1}
                temporalDistortion={0.1}
                color={sequence[index] === "H" ? "#ff6b6b" : "#4dabf7"}
                opacity={0.7}
              />
            </Sphere>
          ))}
        </>
      ) : null}
    </group>
  );
};

export default ProteinModel;

"use client";

import { useRef, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Environment, Float, Sphere, MeshDistortMaterial } from "@react-three/drei";
import * as THREE from "three";

function SoundWaves() {
    const groupRef = useRef<THREE.Group>(null);
    const count = 100;

    // Create an array of particles
    const particles = useMemo(() => {
        const temp = [];
        for (let i = 0; i < count; i++) {
            const x = (Math.random() - 0.5) * 20;
            const y = (Math.random() - 0.5) * 5;
            const z = (Math.random() - 0.5) * 20;
            const speed = Math.random() * 0.02 + 0.01;
            const size = Math.random() * 0.15 + 0.05;
            temp.push({ x, y, z, speed, size, initialY: y });
        }
        return temp;
    }, [count]);

    useFrame((state) => {
        if (!groupRef.current) return;
        const time = state.clock.getElapsedTime();

        groupRef.current.rotation.y = time * 0.05;

        // Animate particles to pulse like sound waves
        groupRef.current.children.forEach((child, i) => {
            const particle = particles[i];
            const waveY = Math.sin(time * particle.speed * 100 + particle.x) * Math.cos(time * particle.speed * 50 + particle.z) * 2;
            child.position.y = particle.initialY + waveY;
        });
    });

    return (
        <group ref={groupRef}>
            {particles.map((particle, i) => (
                <mesh key={i} position={[particle.x, particle.y, particle.z]}>
                    <sphereGeometry args={[particle.size, 16, 16]} />
                    <meshStandardMaterial
                        color={new THREE.Color().setHSL(0.12, 1, Math.random() * 0.5 + 0.3)} // Amber to yellow colors
                        emissive={new THREE.Color().setHSL(0.12, 1, 0.5)}
                        emissiveIntensity={0.5}
                        transparent
                        opacity={0.8}
                    />
                </mesh>
            ))}
        </group>
    );
}

function FloatingShapes() {
    return (
        <>
            <Float speed={2} rotationIntensity={0.5} floatIntensity={2} position={[4, 2, -4]}>
                <Sphere args={[1.5, 32, 32]}>
                    <MeshDistortMaterial
                        color="#f59e0b" // Amber 500
                        emissive="#d97706"
                        distort={0.4}
                        speed={2}
                        roughness={0.2}
                        transparent
                        opacity={0.7}
                    />
                </Sphere>
            </Float>
            <Float speed={1.5} rotationIntensity={1} floatIntensity={1} position={[-5, -1, -2]}>
                <Sphere args={[2, 32, 32]}>
                    <MeshDistortMaterial
                        color="#ca8a04" // Yellow 600
                        emissive="#a16207"
                        distort={0.6}
                        speed={3}
                        roughness={0.1}
                        transparent
                        opacity={0.5}
                    />
                </Sphere>
            </Float>
        </>
    );
}

export function HeroVisualizer() {
    return (
        <div className="absolute inset-0 pointer-events-none z-0">
            <Canvas camera={{ position: [0, 2, 10], fov: 45 }}>
                <ambientLight intensity={0.5} />
                <directionalLight position={[10, 10, 5]} intensity={1} color="#fcd34d" />
                <directionalLight position={[-10, -10, -5]} intensity={0.5} color="#8b5cf6" />

                <SoundWaves />
                <FloatingShapes />

                <Environment preset="city" />
            </Canvas>
        </div>
    );
}

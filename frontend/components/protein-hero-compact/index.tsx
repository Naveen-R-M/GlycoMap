import React, { useRef, useEffect, useState } from 'react';
import * as THREE from 'three';
import { motion } from 'framer-motion';

/**
 * A compact version of the ProteinHero animation that can be more
 * easily integrated with the existing SimBioSys layout
 */
const ProteinHeroCompact = () => {
  const containerRef = useRef(null);
  const mousePosition = useRef({ x: 0, y: 0 });
  
  useEffect(() => {
    if (!containerRef.current) return;
    
    let cleanup = () => {};
    
    const init = async () => {
      try {
        // Basic setup
        const container = containerRef.current;
        const width = container.clientWidth;
        const height = container.clientHeight;
        
        // Scene setup - simpler for better performance
        const scene = new THREE.Scene();
        scene.background = new THREE.Color(0x000000); // Pure black background
        
        // Camera
        const camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 1000);
        camera.position.z = 60;
        camera.position.y = 0;
        
        // Renderer - simplified settings for performance
        const renderer = new THREE.WebGLRenderer({ 
          antialias: true,
          powerPreference: 'high-performance'
        });
        renderer.setSize(width, height);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        
        // Clear container
        while (container.firstChild) {
          container.removeChild(container.firstChild);
        }
        container.appendChild(renderer.domElement);
        
        // Lighting
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.1);
        scene.add(ambientLight);
        
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
        directionalLight.position.set(0, 20, 20);
        scene.add(directionalLight);
        
        // Create protein structure
        const proteinGroup = createProteinStructure();
        scene.add(proteinGroup);
        
        // Create particle system for ambient effect
        const particleSystem = createParticleSystem();
        scene.add(particleSystem);
        
        // Animation loop
        const clock = new THREE.Clock();
        let animationId;
        
        const animate = () => {
          const elapsedTime = clock.getElapsedTime();
          
          // Rotate protein structure
          proteinGroup.rotation.y = elapsedTime * 0.1;
          
          // Apply subtle movement based on mouse position
          const targetRotationX = mousePosition.current.y * 0.2;
          const targetRotationY = mousePosition.current.x * 0.3;
          
          proteinGroup.rotation.x += (targetRotationX - proteinGroup.rotation.x) * 0.03;
          proteinGroup.rotation.y += (targetRotationY - proteinGroup.rotation.y) * 0.03;
          
          // Update particle system
          if (particleSystem.material.uniforms) {
            particleSystem.material.uniforms.time.value = elapsedTime;
          }
          
          // Gentle breathing effect
          const breathScale = 1 + Math.sin(elapsedTime * 0.5) * 0.02;
          proteinGroup.scale.setScalar(breathScale);
          
          // Render
          renderer.render(scene, camera);
          
          animationId = requestAnimationFrame(animate);
        };
        
        animationId = requestAnimationFrame(animate);
        
        // Handle window resize
        const handleResize = () => {
          if (!containerRef.current) return;
          
          const width = containerRef.current.clientWidth;
          const height = containerRef.current.clientHeight;
          
          camera.aspect = width / height;
          camera.updateProjectionMatrix();
          
          renderer.setSize(width, height);
        };
        
        // Handle mouse movement
        const handleMouseMove = (e) => {
          mousePosition.current.x = (e.clientX / window.innerWidth) * 2 - 1;
          mousePosition.current.y = -(e.clientY / window.innerHeight) * 2 + 1;
        };
        
        window.addEventListener('resize', handleResize);
        window.addEventListener('mousemove', handleMouseMove);
        
        // Create function for protein structure
        function createProteinStructure() {
          const group = new THREE.Group();
          
          // Create helix structure
          const helixRadius = 15;
          const helixHeight = 30;
          const helixTurns = 3;
          const helixPoints = 60;
          
          // Helix curve
          const helixCurve = new THREE.CatmullRomCurve3(
            Array(helixPoints).fill().map((_, i) => {
              const t = i / (helixPoints - 1);
              const angle = t * Math.PI * 2 * helixTurns;
              
              return new THREE.Vector3(
                helixRadius * Math.cos(angle),
                t * helixHeight - helixHeight / 2,
                helixRadius * Math.sin(angle)
              );
            })
          );
          
          // Create tube geometry for helix backbone
          const tubeGeometry = new THREE.TubeGeometry(
            helixCurve,
            100, // tubular segments
            0.6,  // tube radius
            8,   // radial segments
            false // closed
          );
          
          const tubeMaterial = new THREE.MeshPhongMaterial({
            color: 0x00AAFF,
            emissive: 0x003366,
            shininess: 100,
            specular: 0x6699FF
          });
          
          const tube = new THREE.Mesh(tubeGeometry, tubeMaterial);
          group.add(tube);
          
          // Add amino acid nodes along the helix
          const nodesGeometry = new THREE.SphereGeometry(0.9, 12, 12);
          
          // Node colors
          const nodeColors = [
            0x00FFFF, // Cyan
            0xFF00FF, // Magenta
            0xFFFF00, // Yellow
            0x00FF99  // Teal
          ];
          
          // Add nodes at intervals
          for (let i = 0; i < helixPoints; i += 4) {
            const point = helixCurve.getPoint(i / (helixPoints - 1));
            
            const material = new THREE.MeshPhongMaterial({
              color: nodeColors[i % nodeColors.length],
              emissive: nodeColors[i % nodeColors.length],
              emissiveIntensity: 0.4,
              shininess: 80
            });
            
            const node = new THREE.Mesh(nodesGeometry, material);
            node.position.copy(point);
            group.add(node);
          }
          
          return group;
        }
        
        // Create ambient particle system
        function createParticleSystem() {
          const count = 200;
          const positions = new Float32Array(count * 3);
          const sizes = new Float32Array(count);
          
          for (let i = 0; i < count; i++) {
            // Random positions within a sphere
            const radius = 25 + Math.random() * 30;
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.acos((Math.random() * 2) - 1);
            
            positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
            positions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta) * 0.6; // Flatten vertically
            positions[i * 3 + 2] = radius * Math.cos(phi);
            
            // Random sizes
            sizes[i] = Math.random() * 1.5 + 0.5;
          }
          
          const geometry = new THREE.BufferGeometry();
          geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
          geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
          
          const material = new THREE.ShaderMaterial({
            uniforms: {
              time: { value: 0 }
            },
            vertexShader: `
              attribute float size;
              uniform float time;
              
              void main() {
                vec3 pos = position;
                
                // Gentle movement
                pos.x += sin(time * 0.3 + position.z * 0.1) * 0.5;
                pos.y += cos(time * 0.2 + position.x * 0.1) * 0.3;
                pos.z += sin(time * 0.4 + position.y * 0.1) * 0.5;
                
                vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
                gl_PointSize = size * (300.0 / -mvPosition.z);
                gl_Position = projectionMatrix * mvPosition;
              }
            `,
            fragmentShader: `
              void main() {
                // Create a circular particle with soft edge
                float d = length(gl_PointCoord - vec2(0.5));
                float alpha = 1.0 - smoothstep(0.4, 0.5, d);
                
                // Color with glow
                vec3 color = vec3(0.0, 0.8, 1.0); // Cyan
                gl_FragColor = vec4(color, alpha * 0.6);
              }
            `,
            transparent: true,
            blending: THREE.AdditiveBlending,
            depthWrite: false
          });
          
          return new THREE.Points(geometry, material);
        }
        
        // Set up cleanup function
        cleanup = () => {
          cancelAnimationFrame(animationId);
          
          scene.traverse(object => {
            if (object.geometry) object.geometry.dispose();
            if (object.material) {
              if (Array.isArray(object.material)) {
                object.material.forEach(material => material.dispose());
              } else {
                object.material.dispose();
              }
            }
          });
          
          renderer.dispose();
          
          window.removeEventListener('resize', handleResize);
          window.removeEventListener('mousemove', handleMouseMove);
          
          if (container.contains(renderer.domElement)) {
            container.removeChild(renderer.domElement);
          }
        };
      } catch (error) {
        console.error('Error initializing 3D scene:', error);
      }
    };
    
    init();
    
    return () => {
      cleanup();
    };
  }, []);
  
  return (
    <div className="relative w-full h-screen">
      {/* 3D Animation */}
      <div
        ref={containerRef}
        className="absolute inset-0"
        style={{ zIndex: 0 }}
      />
      
      {/* Content */}
      <div className="absolute inset-0 flex flex-col items-center justify-center z-10">
        <div className="max-w-4xl px-6">
          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="text-4xl md:text-5xl lg:text-6xl font-light text-white leading-tight mb-8"
            style={{ fontFamily: "'Nothing Font 5x7', system-ui, -apple-system, sans-serif", letterSpacing: "0.02em" }}
          >
            Proteins that are <span className="text-cyan-400">invisible</span> to the immune system.
          </motion.h1>
          
          <motion.p
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="text-lg md:text-xl text-white/90 leading-relaxed font-light"
            style={{ fontFamily: "'Nothing Font 5x7', system-ui, -apple-system, sans-serif" }}
          >
            The Generate Platform enables us to completely recode a therapeutic protein to retain function while
            reducing or eliminating recognition by the immune system.
          </motion.p>
        </div>
      </div>
      
      {/* Bottom logo section */}
      <div className="absolute bottom-12 left-0 right-0 flex items-end justify-between p-6 lg:p-12">
        <motion.div
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8, delay: 0.6 }}
        >
          <h2 className="text-2xl md:text-3xl font-light text-white" style={{ fontFamily: "'Nothing Font 5x7', system-ui, -apple-system, sans-serif" }}>
            SimBioSys Lab
          </h2>
        </motion.div>
      </div>
      
      {/* Scroll Down Animation */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.8 }}
        className="absolute bottom-12 left-1/2 transform -translate-x-1/2 flex flex-col items-center cursor-pointer"
        onClick={() => document.getElementById('form-section')?.scrollIntoView({ behavior: 'smooth' })}
      >
        <motion.div
          animate={{ y: [0, 10, 0] }}
          transition={{ duration: 2, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }}
          className="flex flex-col items-center text-white/80 hover:text-white transition-colors"
        >
          <span className="text-sm font-light mb-2" style={{ fontFamily: "'Nothing Font 5x7', system-ui, -apple-system, sans-serif" }}>Scroll to explore</span>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M7 10L12 15L17 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </motion.div>
      </motion.div>
    </div>
  );
};

export default ProteinHeroCompact;

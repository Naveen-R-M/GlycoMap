'use client'

import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

const ProteinHero = () => {
  const containerRef = useRef(null);
  const mousePosition = useRef({ x: 0, y: 0 });
  
  useEffect(() => {
    // Check if we're in browser environment
    if (typeof window === 'undefined' || !containerRef.current) return;
    
    // Get container dimensions
    const container = containerRef.current;
    const width = container.clientWidth;
    const height = container.clientHeight;
    
    // Scene setup
    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x000510, 0.001);
    
    // Camera setup
    const camera = new THREE.PerspectiveCamera(60, width / height, 1, 1000);
    camera.position.z = 70;
    camera.position.y = 10;
    camera.lookAt(0, 0, 0);
    
    // Renderer setup
    const renderer = new THREE.WebGLRenderer({ 
      antialias: true,
      alpha: true 
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000510, 1);
    
    // Clear container
    while (container.firstChild) {
      container.removeChild(container.firstChild);
    }
    container.appendChild(renderer.domElement);
    
    // Create gradient background
    const vertexShader = `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `;
    
    const fragmentShader = `
      uniform float time;
      varying vec2 vUv;
      
      void main() {
        float pulseSpeed = 0.5;
        float pulseAmplitude = 0.1;
        
        // Gradient from dark blue to cyan
        vec3 colorTop = vec3(0.0, 0.05, 0.1);
        vec3 colorBottom = vec3(0.0, 0.15, 0.3);
        
        // Create pulsing effect
        float pulse = pulseAmplitude * sin(time * pulseSpeed);
        
        // Interpolate between top and bottom colors
        vec3 finalColor = mix(colorTop, colorBottom, vUv.y + pulse);
        
        // Add subtle noise effect
        float noise = fract(sin(dot(vUv, vec2(12.9898, 78.233))) * 43758.5453);
        finalColor += vec3(noise * 0.02);
        
        gl_FragColor = vec4(finalColor, 1.0);
      }
    `;
    
    const uniforms = {
      time: { value: 0 }
    };
    
    const bgMaterial = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms,
    });
    
    const bgGeometry = new THREE.PlaneGeometry(2, 2);
    const bgMesh = new THREE.Mesh(bgGeometry, bgMaterial);
    bgMesh.position.z = -100;
    scene.add(bgMesh);
    
    // Add lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.1);
    scene.add(ambientLight);
    
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
    directionalLight.position.set(0, 10, 10);
    scene.add(directionalLight);
    
    // Create main molecule structure group
    const moleculeGroup = new THREE.Group();
    scene.add(moleculeGroup);
    
    // Create amino acid nodes
    const nodeCount = 120;
    const nodes = [];
    
    // Define "amino acid" colors - using real amino acid colors commonly used in biochemistry
    const aminoAcidColors = [
      0x00FFFF, // Cyan - Arginine
      0xFF0000, // Red - Aspartate
      0x0000FF, // Blue - Lysine
      0xFFFF00, // Yellow - Cysteine
      0x33FF00, // Green - Serine
      0xFF00FF, // Magenta - Glutamine
      0xFFAA00, // Orange - Proline
      0x00FF99, // Teal - Threonine
    ];
    
    // Create sphere geometry for amino acid nodes
    const sphereGeometry = new THREE.SphereGeometry(0.5, 12, 12);
    
    // Create nodes in a protein-like structure - roughly helical with branches
    for (let i = 0; i < nodeCount; i++) {
      // Create complex structure with main backbone and side chains
      let x, y, z;
      
      // ~70% of nodes form the backbone structures
      if (i < nodeCount * 0.7) {
        // Create 3 main helix-like structures
        const helix = Math.floor(i / (nodeCount * 0.7 / 3));
        const t = (i % (nodeCount * 0.7 / 3)) / (nodeCount * 0.7 / 3) * Math.PI * 6;
        const radius = 15 + helix * 5;
        const offset = helix * 120 * (Math.PI/180);
        
        // Parametric helix equation
        x = radius * Math.cos(t + offset);
        y = t * 1.5 - 15 + (helix - 1) * 10;
        z = radius * Math.sin(t + offset);
        
        // Add some randomness
        x += (Math.random() - 0.5) * 3;
        y += (Math.random() - 0.5) * 3;
        z += (Math.random() - 0.5) * 3;
      } else {
        // The rest form side chains or floating nodes
        // Connect to a random backbone node
        const connectTo = Math.floor(Math.random() * (nodeCount * 0.7));
        const backbone = nodes[connectTo];
        
        if (backbone) {
          const distance = 2 + Math.random() * 4;
          const angle = Math.random() * Math.PI * 2;
          const height = (Math.random() - 0.5) * 4;
          
          x = backbone.position.x + Math.cos(angle) * distance;
          y = backbone.position.y + height;
          z = backbone.position.z + Math.sin(angle) * distance;
        } else {
          // Fallback for first iteration when no backbone exists yet
          x = (Math.random() - 0.5) * 30;
          y = (Math.random() - 0.5) * 30;
          z = (Math.random() - 0.5) * 30;
        }
      }
      
      // Create node material with glow effect
      const colorIndex = Math.floor(Math.random() * aminoAcidColors.length);
      const color = aminoAcidColors[colorIndex];
      
      const material = new THREE.MeshPhongMaterial({
        color: color,
        emissive: color,
        emissiveIntensity: 0.3,
        shininess: 100
      });
      
      const sphere = new THREE.Mesh(sphereGeometry, material);
      sphere.position.set(x, y, z);
      
      // Store properties for animation
      const node = {
        mesh: sphere,
        initialPosition: { x, y, z },
        velocity: {
          x: (Math.random() - 0.5) * 0.02,
          y: (Math.random() - 0.5) * 0.02,
          z: (Math.random() - 0.5) * 0.02
        },
        connections: [],
        color: color,
        position: sphere.position
      };
      
      nodes.push(node);
      moleculeGroup.add(sphere);
    }
    
    // Create bonds between nearby nodes
    const bondMaterial = new THREE.MeshPhongMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.3,
      shininess: 50
    });
    
    // Create backbone connections (sequential along each helix)
    for (let helix = 0; helix < 3; helix++) {
      const startIndex = Math.floor(helix * nodeCount * 0.7 / 3);
      const endIndex = Math.floor((helix + 1) * nodeCount * 0.7 / 3) - 1;
      
      for (let i = startIndex; i < endIndex; i++) {
        createBond(nodes[i], nodes[i + 1]);
      }
    }
    
    // Create additional connections for side chains and cross-linking
    const maxConnections = 300; // Limit total connections for performance
    let connectionCount = nodes.filter(n => n.connections.length > 0).length;
    
    // Side chain connections
    for (let i = Math.floor(nodeCount * 0.7); i < nodeCount; i++) {
      // Find closest backbone node to connect to
      let closestNode = null;
      let minDistance = Infinity;
      
      for (let j = 0; j < nodeCount * 0.7; j++) {
        const dx = nodes[i].position.x - nodes[j].position.x;
        const dy = nodes[i].position.y - nodes[j].position.y;
        const dz = nodes[i].position.z - nodes[j].position.z;
        const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
        
        if (distance < minDistance && distance < 7) {
          minDistance = distance;
          closestNode = nodes[j];
        }
      }
      
      if (closestNode && connectionCount < maxConnections) {
        createBond(nodes[i], closestNode);
        connectionCount++;
      }
    }
    
    // Create additional cross-linking connections
    for (let i = 0; i < nodeCount * 0.7 && connectionCount < maxConnections; i++) {
      // Only make additional connections for backbone nodes
      for (let j = i + 2; j < nodeCount * 0.7; j++) {
        // Skip adjacent nodes (already connected in backbone)
        if (j === i + 1) continue;
        
        // Calculate distance
        const dx = nodes[i].position.x - nodes[j].position.x;
        const dy = nodes[i].position.y - nodes[j].position.y;
        const dz = nodes[i].position.z - nodes[j].position.z;
        const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
        
        // Connect if close enough and not too many connections
        if (distance < 6 && Math.random() < 0.1 && connectionCount < maxConnections) {
          createBond(nodes[i], nodes[j]);
          connectionCount++;
        }
      }
    }
    
    // Function to create a bond between two nodes
    function createBond(node1, node2) {
      const pos1 = node1.position;
      const pos2 = node2.position;
      
      // Calculate bond properties
      const dx = pos2.x - pos1.x;
      const dy = pos2.y - pos1.y;
      const dz = pos2.z - pos1.z;
      
      const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
      
      // Create bond cylinder
      const bondGeometry = new THREE.CylinderGeometry(0.15, 0.15, distance, 6, 1);
      bondGeometry.rotateX(Math.PI / 2);
      
      const bond = new THREE.Mesh(bondGeometry, bondMaterial);
      
      // Position at midpoint
      bond.position.x = (pos1.x + pos2.x) / 2;
      bond.position.y = (pos1.y + pos2.y) / 2;
      bond.position.z = (pos1.z + pos2.z) / 2;
      
      // Orient along the line between nodes
      bond.lookAt(pos2);
      
      // Store the connection
      node1.connections.push({ node: node2, mesh: bond });
      node2.connections.push({ node: node1, mesh: bond });
      
      moleculeGroup.add(bond);
      return bond;
    }
    
    // Add floating particles to represent water molecules or ions
    const particleCount = 300;
    const particleGeometry = new THREE.BufferGeometry();
    const particlePositions = new Float32Array(particleCount * 3);
    const particleSizes = new Float32Array(particleCount);
    
    for (let i = 0; i < particleCount; i++) {
      // Random positions within a larger sphere
      const radius = 40 + Math.random() * 30;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos((Math.random() * 2) - 1);
      
      particlePositions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
      particlePositions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
      particlePositions[i * 3 + 2] = radius * Math.cos(phi);
      
      // Random sizes
      particleSizes[i] = Math.random() * 1.5 + 0.5;
    }
    
    particleGeometry.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));
    particleGeometry.setAttribute('size', new THREE.BufferAttribute(particleSizes, 1));
    
    // Custom shader material for particles
    const particleMaterial = new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 }
      },
      vertexShader: `
        attribute float size;
        uniform float time;
        
        void main() {
          vec3 pos = position;
          
          // Add some movement
          pos.x += sin(time * 0.5 + position.z * 0.1) * 1.0;
          pos.y += cos(time * 0.5 + position.x * 0.1) * 1.0;
          pos.z += sin(time * 0.3 + position.y * 0.1) * 1.0;
          
          vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
          gl_PointSize = size * (300.0 / -mvPosition.z);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        void main() {
          // Calculate distance from center (0.5, 0.5)
          vec2 center = vec2(0.5);
          float d = length(gl_PointCoord - center);
          
          // Soft circle with glow
          float alpha = 1.0 - smoothstep(0.4, 0.5, d);
          
          // Glow effect
          float glow = exp(-d * 5.0);
          vec3 color = vec3(0.1, 0.6, 0.9); // Light blue
          
          // Final color with glow
          gl_FragColor = vec4(mix(color, color * 1.5, glow), alpha);
        }
      `,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      transparent: true
    });
    
    const particleSystem = new THREE.Points(particleGeometry, particleMaterial);
    scene.add(particleSystem);
    
    // Animation loop
    const clock = new THREE.Clock();
    
    const animate = () => {
      const elapsedTime = clock.getElapsedTime();
      
      // Update background shader time uniform
      uniforms.time.value = elapsedTime;
      
      // Update particle shader time uniform
      particleMaterial.uniforms.time.value = elapsedTime;
      
      // Animate molecule - gentle breathing and rotation
      moleculeGroup.rotation.y = elapsedTime * 0.1;
      const breathScale = 1 + Math.sin(elapsedTime * 0.5) * 0.02;
      moleculeGroup.scale.set(breathScale, breathScale, breathScale);
      
      // Apply subtle mouse-based rotation
      const targetRotationX = mousePosition.current.y * 0.3;
      const targetRotationY = mousePosition.current.x * 0.5;
      
      moleculeGroup.rotation.x += (targetRotationX - moleculeGroup.rotation.x) * 0.05;
      moleculeGroup.rotation.y += (targetRotationY - moleculeGroup.rotation.y) * 0.05;
      
      // Animate individual nodes
      nodes.forEach((node, i) => {
        // Small random movement
        node.mesh.position.x += Math.sin(elapsedTime * 0.5 + i) * 0.01;
        node.mesh.position.y += Math.cos(elapsedTime * 0.5 + i * 0.7) * 0.01;
        node.mesh.position.z += Math.sin(elapsedTime * 0.3 + i * 0.3) * 0.01;
        
        // Limit movement range
        const dx = node.mesh.position.x - node.initialPosition.x;
        const dy = node.mesh.position.y - node.initialPosition.y;
        const dz = node.mesh.position.z - node.initialPosition.z;
        
        if (Math.abs(dx) > 1) node.mesh.position.x = node.initialPosition.x + (dx > 0 ? 1 : -1);
        if (Math.abs(dy) > 1) node.mesh.position.y = node.initialPosition.y + (dy > 0 ? 1 : -1);
        if (Math.abs(dz) > 1) node.mesh.position.z = node.initialPosition.z + (dz > 0 ? 1 : -1);
        
        // Update connections
        node.connections.forEach(connection => {
          // Update bond position and orientation
          const pos1 = node.mesh.position;
          const pos2 = connection.node.mesh.position;
          
          connection.mesh.position.set(
            (pos1.x + pos2.x) / 2,
            (pos1.y + pos2.y) / 2,
            (pos1.z + pos2.z) / 2
          );
          
          connection.mesh.lookAt(pos2);
          
          // Update bond length
          const distance = pos1.distanceTo(pos2);
          connection.mesh.scale.set(1, 1, distance);
        });
      });
      
      // Render
      renderer.render(scene, camera);
      
      requestAnimationFrame(animate);
    };
    
    const animationId = requestAnimationFrame(animate);
    
    // Handle mouse movement
    const handleMouseMove = (event) => {
      // Convert mouse position to normalized device coordinates (-1 to +1)
      mousePosition.current.x = (event.clientX / window.innerWidth) * 2 - 1;
      mousePosition.current.y = -(event.clientY / window.innerHeight) * 2 + 1;
    };
    
    window.addEventListener('mousemove', handleMouseMove);
    
    // Handle resize
    const handleResize = () => {
      if (!containerRef.current) return;
      
      const width = containerRef.current.clientWidth;
      const height = containerRef.current.clientHeight;
      
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      
      renderer.setSize(width, height);
    };
    
    window.addEventListener('resize', handleResize);
    
    // Cleanup
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('resize', handleResize);
      
      cancelAnimationFrame(animationId);
      
      // Dispose of geometries and materials
      sphereGeometry.dispose();
      bondMaterial.dispose();
      bgGeometry.dispose();
      bgMaterial.dispose();
      particleGeometry.dispose();
      particleMaterial.dispose();
      
      // Remove all objects from the scene
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
      
      // Dispose of renderer
      renderer.dispose();
      
      // Remove canvas from DOM
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);
  
  return (
    <div className="relative w-full h-screen">
      {/* 3D Animation Background */}
      <div
        ref={containerRef}
        className="absolute inset-0 w-full h-full"
        style={{ zIndex: 0 }}
      />
      
      {/* Content Overlay */}
      <div className="absolute inset-0 flex items-center justify-center z-10 p-8">
        <div className="text-center max-w-4xl mx-auto">
          <div className="inline-block mb-6 px-3 py-1 rounded-full bg-cyan-900/30 backdrop-blur-sm border border-cyan-500/20">
            <span className="text-cyan-400 text-sm font-light tracking-wider">PIONEERING COMPUTATIONAL BIOLOGY</span>
          </div>
          <h1 className="text-5xl md:text-7xl font-thin mb-8 text-white">
            Proteins that are <span className="text-cyan-400">invisible</span> to the immune system
          </h1>
          <p className="text-xl text-white/80 mb-12 font-light max-w-3xl mx-auto">
            The Generate Platform enables us to completely recode a therapeutic protein to retain function while
            reducing or eliminating recognition by the immune system.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button className="px-10 py-4 bg-gradient-to-r from-blue-600 to-cyan-500 rounded-lg text-white font-medium transition-all duration-300 hover:shadow-lg hover:shadow-cyan-500/20">
              Get Started
            </button>
            <button className="px-10 py-4 bg-transparent border border-cyan-400/30 rounded-lg text-cyan-300 transition-all duration-300 hover:bg-cyan-900/20">
              Learn More
            </button>
          </div>
        </div>
      </div>
      
      {/* Scroll Down Button */}
      <div className="absolute bottom-10 left-1/2 transform -translate-x-1/2 z-10">
        <button 
          className="flex flex-col items-center text-white/60 hover:text-white/90 transition-colors"
          onClick={() => document.getElementById('form-section')?.scrollIntoView({ behavior: 'smooth' })}
        >
          <span className="text-sm mb-2">Scroll to explore</span>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M7 10L12 15L17 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
      </div>
    </div>
  );
};

export default ProteinHero;

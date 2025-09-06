'use client'

import React, { useState, useEffect, useRef } from 'react';

/**
 * Ultra-lightweight ProteinViewer with improved visibility
 */
const ProteinViewer = ({ 
  pdbData,
  width = '100%', 
  height = '400px',
  backgroundColor = '#000000',
  showControls = true,
  autoRotate = true,
  initialStyle = 'cartoon'
}) => {
  const containerRef = useRef(null);
  const rendererRef = useRef(null);
  const sceneRef = useRef(null);
  const cameraRef = useRef(null);
  const controlsRef = useRef(null);
  const animationRef = useRef(null);
  const moleculeRef = useRef(null);
  
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [proteinInfo, setProteinInfo] = useState(null);
  const [currentStyle, setCurrentStyle] = useState(initialStyle);
  const [showLegend, setShowLegend] = useState(true);

  // Color scheme for rainbow coloring (N to C terminus)
  const getRainbowColor = (index, total) => {
    const hue = (index / total) * 240; // From red (0) to blue (240)
    return `hsl(${hue}, 100%, 50%)`;
  };

  // Convert HSL to hex
  const hslToHex = (h, s, l) => {
    s /= 100;
    l /= 100;
    const a = s * Math.min(l, 1 - l);
    const f = n => {
      const k = (n + h / 30) % 12;
      const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
      return Math.round(255 * color).toString(16).padStart(2, '0');
    };
    return `#${f(0)}${f(8)}${f(4)}`;
  };

  // Super minimal visualization with better lighting
  useEffect(() => {
    if (typeof window === 'undefined' || !containerRef.current) return;
    
    let mounted = true;
    let cleanup = () => {};
    
    const initScene = async () => {
      try {
        // Import Three.js
        const THREE = await import('three');
        const { OrbitControls } = await import('three/examples/jsm/controls/OrbitControls');
        
        // Set up scene with darker background for better contrast
        const scene = new THREE.Scene();
        scene.background = new THREE.Color(backgroundColor);
        sceneRef.current = scene;
        
        // Set up camera
        const container = containerRef.current;
        const width = container.clientWidth;
        const height = container.clientHeight;
        const camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 1000);
        camera.position.z = 50;
        cameraRef.current = camera;
        
        // Set up renderer
        const renderer = new THREE.WebGLRenderer({ 
          antialias: false, // Disable antialiasing to reduce memory usage
          precision: 'lowp',
          powerPreference: 'low-power', // Use low-power to prevent context loss
          preserveDrawingBuffer: false,
          failIfMajorPerformanceCaveat: false // Don't fail on performance issues
        });
        
        renderer.setSize(width, height);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5)); // Limit pixel ratio
        
        // Clear container
        while (container.firstChild) {
          container.removeChild(container.firstChild);
        }
        container.appendChild(renderer.domElement);
        rendererRef.current = renderer;
        
        // Set up controls
        const controls = new OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;
        controls.dampingFactor = 0.05;
        controls.rotateSpeed = 0.8;
        controls.autoRotate = autoRotate;
        controls.autoRotateSpeed = 1;
        controlsRef.current = controls;
        
        // Setup enhanced lighting
        // Ambient light
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
        scene.add(ambientLight);
        
        // Multiple directional lights for better illumination
        const createLight = (x, y, z, intensity) => {
          const light = new THREE.DirectionalLight(0xffffff, intensity);
          light.position.set(x, y, z);
          scene.add(light);
          return light;
        };
        
        // Add lights from multiple directions
        const mainLight = createLight(10, 10, 10, 0.8);
        createLight(-10, 10, 10, 0.5);
        createLight(0, -10, 0, 0.3);
        createLight(0, 0, -10, 0.4);
        
        // Extract protein info and render visualization
        if (pdbData) {
          try {
            // Extract detailed info including secondary structure
            const proteinData = extractProteinData(pdbData);
            
            // Store protein info
            setProteinInfo({
              title: proteinData.title || 'Protein Structure',
              atomCount: proteinData.atomCount,
              residueCount: proteinData.residueCount
            });
            
            // Create the visualization
            createVisualization(scene, proteinData, THREE, currentStyle);
          } catch (err) {
            console.error('Error processing PDB:', err);
            createFallbackObject(scene, THREE);
          }
        } else {
          createFallbackObject(scene, THREE);
        }
        
        // Animation loop
        const animate = () => {
          if (!mounted) return;
          
          try {
            animationRef.current = requestAnimationFrame(animate);
            
            if (controlsRef.current) {
              controlsRef.current.update();
            }
            
            if (rendererRef.current && sceneRef.current && cameraRef.current) {
              rendererRef.current.render(sceneRef.current, cameraRef.current);
            }
          } catch (err) {
            console.error('Animation error:', err);
          }
        };
        
        animate();
        setIsLoading(false);
        
        // Handle resize
        const handleResize = () => {
          if (!containerRef.current || !cameraRef.current || !rendererRef.current) return;
          
          const width = containerRef.current.clientWidth;
          const height = containerRef.current.clientHeight;
          
          cameraRef.current.aspect = width / height;
          cameraRef.current.updateProjectionMatrix();
          
          rendererRef.current.setSize(width, height);
        };
        
        window.addEventListener('resize', handleResize);
        
        // Setup cleanup
        cleanup = () => {
          window.removeEventListener('resize', handleResize);
          
          if (animationRef.current) {
            cancelAnimationFrame(animationRef.current);
          }
          
          if (controlsRef.current) {
            controlsRef.current.dispose();
          }
          
          if (rendererRef.current) {
            if (containerRef.current && containerRef.current.contains(rendererRef.current.domElement)) {
              containerRef.current.removeChild(rendererRef.current.domElement);
            }
            rendererRef.current.dispose();
          }
          
          // Clean up materials and geometries
          if (sceneRef.current) {
            sceneRef.current.traverse(object => {
              if (object.geometry) object.geometry.dispose();
              if (object.material) {
                if (Array.isArray(object.material)) {
                  object.material.forEach(m => m.dispose());
                } else {
                  object.material.dispose();
                }
              }
            });
          }
        };
      } catch (err) {
        console.error('Initialization error:', err);
        setError(err.message);
        setIsLoading(false);
      }
    };
    
    initScene();
    
    return () => {
      mounted = false;
      cleanup();
    };
  }, [backgroundColor, autoRotate, pdbData]);
  
  // Update style when initialStyle changes
  useEffect(() => {
    setCurrentStyle(initialStyle);
  }, [initialStyle]);
  
  // Update visualization when style changes
  useEffect(() => {
    if (isLoading || !sceneRef.current || !pdbData) return;
    
    const updateVisualization = async () => {
      try {
        // Remove existing molecule
        if (moleculeRef.current) {
          sceneRef.current.remove(moleculeRef.current);
          if (moleculeRef.current.geometry) moleculeRef.current.geometry.dispose();
          if (moleculeRef.current.material) {
            if (Array.isArray(moleculeRef.current.material)) {
              moleculeRef.current.material.forEach(m => m.dispose());
            } else {
              moleculeRef.current.material.dispose();
            }
          }
        }
        
        // Import Three.js
        const THREE = await import('three');
        
        // Extract protein data
        const proteinData = extractProteinData(pdbData);
        
        // Create new visualization
        createVisualization(sceneRef.current, proteinData, THREE, currentStyle);
      } catch (err) {
        console.error('Error updating visualization:', err);
      }
    };
    
    updateVisualization();
  }, [currentStyle, pdbData, isLoading]);
  
  // Extract detailed protein data including secondary structure hints
  const extractProteinData = (pdbData) => {
    const lines = pdbData.split('\n');
    let atomCount = 0;
    const residues = new Set();
    const atoms = [];
    const helixRegions = [];
    const sheetRegions = [];
    let title = '';
    
    for (const line of lines) {
      if (line.startsWith('TITLE')) {
        title = line.substring(10).trim();
      } else if (line.startsWith('HELIX')) {
        // Extract helix information
        try {
          const startRes = parseInt(line.substring(21, 25));
          const endRes = parseInt(line.substring(33, 37));
          const chainId = line.substring(19, 20).trim();
          helixRegions.push({ start: startRes, end: endRes, chain: chainId });
        } catch (e) {
          // Skip malformed lines
        }
      } else if (line.startsWith('SHEET')) {
        // Extract sheet information
        try {
          const startRes = parseInt(line.substring(22, 26));
          const endRes = parseInt(line.substring(33, 37));
          const chainId = line.substring(21, 22).trim();
          sheetRegions.push({ start: startRes, end: endRes, chain: chainId });
        } catch (e) {
          // Skip malformed lines
        }
      } else if (line.startsWith('ATOM') || line.startsWith('HETATM')) {
        atomCount++;
        
        try {
          const atomName = line.substring(12, 16).trim();
          const resName = line.substring(17, 20).trim();
          const chainId = line.substring(21, 22).trim();
          const resSeq = parseInt(line.substring(22, 26));
          const x = parseFloat(line.substring(30, 38));
          const y = parseFloat(line.substring(38, 46));
          const z = parseFloat(line.substring(46, 54));
          
          residues.add(`${chainId}_${resSeq}`);
          
          if (!isNaN(x) && !isNaN(y) && !isNaN(z)) {
            atoms.push({
              name: atomName,
              resName,
              chainId,
              resSeq,
              x, y, z
            });
          }
        } catch (e) {
          // Skip problematic lines
        }
      }
    }
    
    // Extract CA atoms and organize by chain
    const chains = {};
    atoms.forEach(atom => {
      if (atom.name === 'CA') {
        if (!chains[atom.chainId]) {
          chains[atom.chainId] = [];
        }
        chains[atom.chainId].push(atom);
      }
    });
    
    // Sort atoms within each chain by residue number
    Object.values(chains).forEach(chain => {
      chain.sort((a, b) => a.resSeq - b.resSeq);
    });
    
    return {
      atomCount,
      residueCount: residues.size,
      title,
      chains,
      helixRegions,
      sheetRegions,
      allAtoms: atoms
    };
  };
  
  // Determine secondary structure for a residue
  const getSecondaryStructure = (resSeq, chainId, helixRegions, sheetRegions) => {
    // Check if residue is in a helix
    for (const helix of helixRegions) {
      if (helix.chain === chainId && resSeq >= helix.start && resSeq <= helix.end) {
        return 'helix';
      }
    }
    
    // Check if residue is in a sheet
    for (const sheet of sheetRegions) {
      if (sheet.chain === chainId && resSeq >= sheet.start && resSeq <= sheet.end) {
        return 'sheet';
      }
    }
    
    return 'coil';
  };
  
  // Create visualization based on style
  const createVisualization = (scene, proteinData, THREE, style) => {
    // Center the atoms
    const centeredData = centerProteinData(proteinData, THREE);
    
    // Create visualization based on style
    switch(style) {
      case 'cartoon':
        createAdvancedCartoonVisualization(scene, centeredData, THREE);
        break;
      case 'backbone':
        createBackboneVisualization(scene, centeredData.chains, THREE);
        break;
      case 'ballAndStick':
        createBallAndStickVisualization(scene, centeredData.chains, THREE);
        break;
      case 'spacefill':
        createSpacefillVisualization(scene, centeredData.allAtoms, THREE);
        break;
      default:
        createAdvancedCartoonVisualization(scene, centeredData, THREE);
    }
  };
  
  // Create advanced cartoon visualization with secondary structures
  const createAdvancedCartoonVisualization = (scene, proteinData, THREE) => {
    const group = new THREE.Group();
    
    let globalResidueIndex = 0;
    const totalResidues = Object.values(proteinData.chains).reduce((sum, chain) => sum + chain.length, 0);
    
    // Process each chain
    Object.entries(proteinData.chains).forEach(([chainId, atoms]) => {
      if (atoms.length < 2) return;
      
      // Create segments based on secondary structure
      const segments = [];
      let currentSegment = {
        type: null,
        atoms: []
      };
      
      atoms.forEach((atom, i) => {
        const ssType = getSecondaryStructure(atom.resSeq, chainId, proteinData.helixRegions, proteinData.sheetRegions);
        
        if (currentSegment.type !== ssType) {
          if (currentSegment.atoms.length > 0) {
            segments.push(currentSegment);
          }
          currentSegment = {
            type: ssType,
            atoms: [atom],
            startIndex: globalResidueIndex + i
          };
        } else {
          currentSegment.atoms.push(atom);
        }
      });
      
      if (currentSegment.atoms.length > 0) {
        segments.push(currentSegment);
      }
      
      // Render each segment based on its type
      segments.forEach((segment, segIndex) => {
        const points = segment.atoms.map(atom => new THREE.Vector3(atom.x, atom.y, atom.z));
        
        if (points.length < 2) return;
        
        // Get color based on position in the chain (rainbow coloring)
        const segmentColor = new THREE.Color(hslToHex(
          (segment.startIndex / totalResidues) * 240,
          100,
          50
        ));
        
        try {
          if (segment.type === 'helix') {
            // Create helix representation
            createHelixSegment(group, points, segmentColor, THREE);
          } else if (segment.type === 'sheet') {
            // Create sheet representation
            createSheetSegment(group, points, segmentColor, THREE);
          } else {
            // Create coil/loop representation
            createCoilSegment(group, points, segmentColor, THREE);
          }
        } catch (err) {
          console.warn(`Error creating ${segment.type} segment:`, err);
          // Fallback to simple line
          createCoilSegment(group, points, segmentColor, THREE);
        }
      });
      
      globalResidueIndex += atoms.length;
    });
    
    scene.add(group);
    moleculeRef.current = group;
  };
  
  // Create helix segment (spiral)
  const createHelixSegment = (group, points, color, THREE) => {
    if (points.length < 2) return;
    
    // Create a smooth curve through the points
    const curve = new THREE.CatmullRomCurve3(points, false, 'catmullrom', 0.5);
    
    // Create helix geometry - wider tube for helices
    const tubeGeometry = new THREE.TubeGeometry(
      curve,
      points.length * 8,  // More segments for smoothness
      1.2,                 // Wider radius for helix
      12,                  // More radial segments
      false
    );
    
    // Create material with good lighting
    const material = new THREE.MeshPhongMaterial({
      color: color,
      shininess: 100,
      specular: 0xffffff,
      emissive: color,
      emissiveIntensity: 0.1
    });
    
    const mesh = new THREE.Mesh(tubeGeometry, material);
    group.add(mesh);
  };
  
  // Create sheet segment (flat ribbon with arrow)
  const createSheetSegment = (group, points, color, THREE) => {
    if (points.length < 2) return;
    
    // Create a smooth curve
    const curve = new THREE.CatmullRomCurve3(points, false, 'catmullrom', 0.5);
    
    // Sample points along the curve
    const numSamples = Math.max(points.length * 4, 20);
    const curvePoints = curve.getPoints(numSamples);
    
    // Create ribbon shape for sheets - flat and wide
    const shape = new THREE.Shape();
    const width = 2.0;
    const thickness = 0.3;
    
    shape.moveTo(-width, 0);
    shape.lineTo(width, 0);
    shape.lineTo(width, thickness);
    shape.lineTo(-width, thickness);
    shape.lineTo(-width, 0);
    
    // Create path for extrusion
    const path = new THREE.CatmullRomCurve3(curvePoints);
    
    // Extrude settings
    const extrudeSettings = {
      steps: curvePoints.length,
      bevelEnabled: false,
      extrudePath: path
    };
    
    try {
      // Create ribbon geometry
      const geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);
      
      // Create material
      const material = new THREE.MeshPhongMaterial({
        color: color,
        shininess: 100,
        specular: 0xffffff,
        emissive: color,
        emissiveIntensity: 0.1,
        side: THREE.DoubleSide
      });
      
      const mesh = new THREE.Mesh(geometry, material);
      group.add(mesh);
      
      // Add arrow head at the end for beta sheets
      if (points.length > 1) {
        const lastPoint = points[points.length - 1];
        const secondLastPoint = points[points.length - 2];
        
        // Create arrow head
        const arrowGeometry = new THREE.ConeGeometry(2.5, 4, 4);
        const arrowMaterial = new THREE.MeshPhongMaterial({
          color: color,
          shininess: 100,
          specular: 0xffffff,
          emissive: color,
          emissiveIntensity: 0.1
        });
        
        const arrow = new THREE.Mesh(arrowGeometry, arrowMaterial);
        arrow.position.copy(lastPoint);
        
        // Orient arrow
        const direction = new THREE.Vector3().subVectors(lastPoint, secondLastPoint).normalize();
        arrow.lookAt(lastPoint.clone().add(direction));
        arrow.rotateX(Math.PI / 2);
        
        group.add(arrow);
      }
    } catch (err) {
      // Fallback to simple tube
      const tubeGeometry = new THREE.TubeGeometry(curve, numSamples, 0.8, 8, false);
      const material = new THREE.MeshPhongMaterial({
        color: color,
        shininess: 100,
        specular: 0xffffff
      });
      const mesh = new THREE.Mesh(tubeGeometry, material);
      group.add(mesh);
    }
  };
  
  // Create coil/loop segment (thin tube)
  const createCoilSegment = (group, points, color, THREE) => {
    if (points.length < 2) return;
    
    // Create smooth curve
    const curve = new THREE.CatmullRomCurve3(points, false, 'catmullrom', 0.5);
    
    // Create thin tube for coils
    const tubeGeometry = new THREE.TubeGeometry(
      curve,
      points.length * 4,
      0.4,  // Thinner for coils
      6,
      false
    );
    
    // Create material
    const material = new THREE.MeshPhongMaterial({
      color: color,
      shininess: 80,
      specular: 0xffffff,
      emissive: color,
      emissiveIntensity: 0.05
    });
    
    const mesh = new THREE.Mesh(tubeGeometry, material);
    group.add(mesh);
  };
  
  // Create backbone visualization
  const createBackboneVisualization = (scene, chains, THREE) => {
    const group = new THREE.Group();
    
    let globalIndex = 0;
    const totalAtoms = Object.values(chains).reduce((sum, chain) => sum + chain.length, 0);
    
    Object.entries(chains).forEach(([chainId, atoms]) => {
      atoms.sort((a, b) => a.resSeq - b.resSeq);
      
      const points = atoms.map(atom => new THREE.Vector3(atom.x, atom.y, atom.z));
      
      if (points.length > 0) {
        // Create line
        const lineGeometry = new THREE.BufferGeometry().setFromPoints(points);
        
        // Create gradient colors
        const colors = [];
        for (let i = 0; i < points.length; i++) {
          const color = new THREE.Color(hslToHex((globalIndex + i) / totalAtoms * 240, 100, 50));
          colors.push(color.r, color.g, color.b);
        }
        
        lineGeometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
        
        const lineMaterial = new THREE.LineBasicMaterial({
          vertexColors: true,
          linewidth: 2
        });
        
        const line = new THREE.Line(lineGeometry, lineMaterial);
        group.add(line);
        
        // Add spheres at CA positions
        const sphereGeometry = new THREE.SphereGeometry(0.5, 8, 8);
        
        points.forEach((point, i) => {
          const sphereMaterial = new THREE.MeshPhongMaterial({
            color: new THREE.Color(hslToHex((globalIndex + i) / totalAtoms * 240, 100, 50)),
            shininess: 80,
            specular: 0xffffff
          });
          
          const sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
          sphere.position.copy(point);
          group.add(sphere);
        });
      }
      
      globalIndex += atoms.length;
    });
    
    scene.add(group);
    moleculeRef.current = group;
  };
  
  // Create ball and stick visualization
  const createBallAndStickVisualization = (scene, chains, THREE) => {
    const group = new THREE.Group();
    
    Object.entries(chains).forEach(([chainId, atoms]) => {
      atoms.sort((a, b) => a.resSeq - b.resSeq);
      
      if (atoms.length > 0) {
        const sphereGeometry = new THREE.SphereGeometry(0.8, 12, 12);
        
        atoms.forEach(atom => {
          const sphereMaterial = new THREE.MeshPhongMaterial({
            color: 0xffffff,
            shininess: 100,
            specular: 0xffffff
          });
          
          const sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
          sphere.position.set(atom.x, atom.y, atom.z);
          group.add(sphere);
        });
        
        // Create bonds
        for (let i = 0; i < atoms.length - 1; i++) {
          if (atoms[i].resSeq + 1 === atoms[i+1].resSeq) {
            const start = new THREE.Vector3(atoms[i].x, atoms[i].y, atoms[i].z);
            const end = new THREE.Vector3(atoms[i+1].x, atoms[i+1].y, atoms[i+1].z);
            
            const direction = end.clone().sub(start);
            const length = direction.length();
            
            const cylinderGeometry = new THREE.CylinderGeometry(0.2, 0.2, length, 6);
            const cylinderMaterial = new THREE.MeshPhongMaterial({
              color: 0xcccccc,
              shininess: 70
            });
            
            const cylinder = new THREE.Mesh(cylinderGeometry, cylinderMaterial);
            cylinder.position.copy(start.clone().add(end).multiplyScalar(0.5));
            cylinder.lookAt(end);
            cylinder.rotateX(Math.PI / 2);
            
            group.add(cylinder);
          }
        }
      }
    });
    
    scene.add(group);
    moleculeRef.current = group;
  };
  
  // Create spacefill visualization
  const createSpacefillVisualization = (scene, atoms, THREE) => {
    const group = new THREE.Group();
    
    const maxAtoms = Math.min(atoms.length, 500);
    const step = Math.max(1, Math.floor(atoms.length / maxAtoms));
    
    const sphereGeometry = new THREE.SphereGeometry(1.5, 12, 12);
    
    for (let i = 0; i < atoms.length; i += step) {
      const atom = atoms[i];
      
      const color = atom.name === 'N' ? 0x3333ff :
                   atom.name === 'O' ? 0xff3333 :
                   atom.name === 'S' ? 0xffff33 :
                   atom.name === 'C' ? 0xcccccc : 0xffffff;
      
      const sphereMaterial = new THREE.MeshPhongMaterial({
        color: color,
        shininess: 100,
        specular: 0xffffff
      });
      
      const sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
      sphere.position.set(atom.x, atom.y, atom.z);
      group.add(sphere);
    }
    
    scene.add(group);
    moleculeRef.current = group;
  };
  
  // Center protein data
  const centerProteinData = (proteinData, THREE) => {
    const allAtoms = [];
    Object.values(proteinData.chains).forEach(chain => {
      allAtoms.push(...chain);
    });
    
    if (allAtoms.length === 0) return proteinData;
    
    // Calculate center
    let sumX = 0, sumY = 0, sumZ = 0;
    allAtoms.forEach(atom => {
      sumX += atom.x;
      sumY += atom.y;
      sumZ += atom.z;
    });
    
    const centerX = sumX / allAtoms.length;
    const centerY = sumY / allAtoms.length;
    const centerZ = sumZ / allAtoms.length;
    
    // Find max distance
    let maxDist = 0;
    allAtoms.forEach(atom => {
      const dx = atom.x - centerX;
      const dy = atom.y - centerY;
      const dz = atom.z - centerZ;
      const dist = Math.sqrt(dx*dx + dy*dy + dz*dz);
      if (dist > maxDist) maxDist = dist;
    });
    
    // Scale factor
    const scaleFactor = 25 / Math.max(1, maxDist);
    
    // Center and scale all data
    const centeredData = {
      ...proteinData,
      chains: {},
      allAtoms: []
    };
    
    Object.entries(proteinData.chains).forEach(([chainId, atoms]) => {
      centeredData.chains[chainId] = atoms.map(atom => ({
        ...atom,
        x: (atom.x - centerX) * scaleFactor,
        y: (atom.y - centerY) * scaleFactor,
        z: (atom.z - centerZ) * scaleFactor
      }));
    });
    
    centeredData.allAtoms = proteinData.allAtoms.map(atom => ({
      ...atom,
      x: (atom.x - centerX) * scaleFactor,
      y: (atom.y - centerY) * scaleFactor,
      z: (atom.z - centerZ) * scaleFactor
    }));
    
    return centeredData;
  };
  
  // Create a fallback object
  const createFallbackObject = (scene, THREE) => {
    const geometry = new THREE.IcosahedronGeometry(10, 1);
    const material = new THREE.MeshPhongMaterial({ 
      color: 0x44aaff,
      shininess: 100,
      specular: 0xffffff
    });
    const mesh = new THREE.Mesh(geometry, material);
    scene.add(mesh);
    moleculeRef.current = mesh;
  };

  // Render component
  return (
    <div 
      style={{ 
        width, 
        height,
        position: 'relative',
        backgroundColor: '#111111',
        borderRadius: '0.5rem',
        overflow: 'hidden'
      }}
    >
      {isLoading && (
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          color: 'white',
          textAlign: 'center'
        }}>
          Loading protein structure...
        </div>
      )}
      
      {error && (
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          color: 'white',
          textAlign: 'center',
          maxWidth: '80%'
        }}>
          <div>Error loading 3D viewer:</div>
          <div style={{ marginTop: '8px', color: '#ff6b6b' }}>{error}</div>
        </div>
      )}
      
      {proteinInfo && !isLoading && (
        <>
          <div style={{
            position: 'absolute',
            bottom: '10px',
            left: '10px',
            padding: '8px',
            background: 'rgba(0, 0, 0, 0.7)',
            color: 'white',
            borderRadius: '4px',
            fontSize: '12px',
            zIndex: 5
          }}>
            <div><strong>{proteinInfo.title || 'Protein Structure'}</strong></div>
            <div>Atoms: {proteinInfo.atomCount}</div>
            <div>Residues: {proteinInfo.residueCount}</div>
          </div>
          
          {/* Color Legend */}
          {showLegend && currentStyle === 'cartoon' && (
            <div style={{
              position: 'absolute',
              top: '10px',
              left: '10px',
              padding: '10px',
              background: 'rgba(0, 0, 0, 0.8)',
              color: 'white',
              borderRadius: '6px',
              fontSize: '11px',
              zIndex: 5,
              maxWidth: '180px',
              border: '1px solid rgba(255, 255, 255, 0.1)'
            }}>
              <div style={{ 
                marginBottom: '8px', 
                fontWeight: 'bold',
                fontSize: '12px',
                borderBottom: '1px solid rgba(255, 255, 255, 0.2)',
                paddingBottom: '4px'
              }}>
                Color Legend
              </div>
              
              {/* Rainbow gradient explanation */}
              <div style={{ marginBottom: '8px' }}>
                <div style={{
                  background: 'linear-gradient(90deg, #ff0000, #ff8800, #ffff00, #00ff00, #00ffff, #0000ff)',
                  height: '12px',
                  borderRadius: '2px',
                  marginBottom: '4px'
                }}></div>
                <div style={{ fontSize: '10px', display: 'flex', justifyContent: 'space-between' }}>
                  <span>N-term</span>
                  <span>→</span>
                  <span>C-term</span>
                </div>
                <div style={{ fontSize: '9px', color: 'rgba(255, 255, 255, 0.7)', marginTop: '2px' }}>
                  Chain direction from start to end
                </div>
              </div>
              
              {/* Secondary structure indicators if visible */}
              <div style={{ 
                marginTop: '10px',
                paddingTop: '8px',
                borderTop: '1px solid rgba(255, 255, 255, 0.1)'
              }}>
                <div style={{ fontSize: '10px', fontWeight: 'bold', marginBottom: '4px' }}>Structures:</div>
                <div style={{ fontSize: '10px', display: 'flex', alignItems: 'center', marginBottom: '3px' }}>
                  <div style={{
                    width: '20px',
                    height: '8px',
                    background: '#888',
                    borderRadius: '4px',
                    marginRight: '6px'
                  }}></div>
                  <span>α-Helix (coiled)</span>
                </div>
                <div style={{ fontSize: '10px', display: 'flex', alignItems: 'center', marginBottom: '3px' }}>
                  <div style={{
                    width: '20px',
                    height: '4px',
                    background: '#888',
                    marginRight: '6px',
                    position: 'relative'
                  }}>
                    <div style={{
                      position: 'absolute',
                      right: '-3px',
                      top: '-3px',
                      width: 0,
                      height: 0,
                      borderLeft: '6px solid #888',
                      borderTop: '5px solid transparent',
                      borderBottom: '5px solid transparent'
                    }}></div>
                  </div>
                  <span>β-Sheet (arrow)</span>
                </div>
                <div style={{ fontSize: '10px', display: 'flex', alignItems: 'center' }}>
                  <div style={{
                    width: '20px',
                    height: '2px',
                    background: '#888',
                    marginRight: '6px'
                  }}></div>
                  <span>Loop/Coil (thin)</span>
                </div>
              </div>
              
              {/* Toggle button */}
              <button
                onClick={() => setShowLegend(false)}
                style={{
                  position: 'absolute',
                  top: '4px',
                  right: '4px',
                  background: 'transparent',
                  border: 'none',
                  color: 'rgba(255, 255, 255, 0.5)',
                  cursor: 'pointer',
                  fontSize: '12px',
                  padding: '2px'
                }}
                title="Hide legend"
              >
                ×
              </button>
            </div>
          )}
          
          {/* Show legend button when hidden */}
          {!showLegend && currentStyle === 'cartoon' && (
            <button
              onClick={() => setShowLegend(true)}
              style={{
                position: 'absolute',
                top: '10px',
                left: '10px',
                padding: '6px 10px',
                background: 'rgba(0, 0, 0, 0.7)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                color: 'white',
                borderRadius: '4px',
                fontSize: '11px',
                cursor: 'pointer',
                zIndex: 5
              }}
              title="Show color legend"
            >
              🎨 Legend
            </button>
          )}
        </>
      )}
      
      <div 
        ref={containerRef}
        style={{
          width: '100%',
          height: '100%'
        }}
      ></div>
      
      {showControls && !isLoading && !error && (
        <div style={{
          position: 'absolute',
          top: showLegend && currentStyle === 'cartoon' ? '10px' : '10px',
          right: '10px',
          padding: '8px',
          background: 'rgba(0, 0, 0, 0.7)',
          borderRadius: '4px',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          zIndex: 10
        }}>
          <select 
            value={currentStyle}
            onChange={(e) => setCurrentStyle(e.target.value)}
            style={{
              backgroundColor: 'rgba(30, 30, 30, 0.9)',
              color: 'white',
              border: '1px solid rgba(100, 100, 255, 0.5)',
              borderRadius: '4px',
              padding: '4px 8px',
              fontSize: '12px'
            }}
          >
            <option value="cartoon">Cartoon</option>
            <option value="backbone">Backbone</option>
            <option value="ballAndStick">Ball & Stick</option>
            <option value="spacefill">Space Filling</option>
          </select>
        </div>
      )}
    </div>
  );
};

export default ProteinViewer;

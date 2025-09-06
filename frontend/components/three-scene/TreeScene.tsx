"use client"

import { useEffect, useRef } from "react"

let globalRenderer = null // Share renderer across instances
let globalScene = null
let globalCamera = null

export default function TreeScene() {
  const sceneRef = useRef<HTMLDivElement>(null)
  const animationIdRef = useRef<number>(null)
  const cleanupRef = useRef<(() => void) | null>(null)

  useEffect(() => {
    if (typeof window === 'undefined' || !sceneRef.current) return

    const initThreeScene = async () => {
      try {
        const THREE = await import('three')
        
        // Clean up any existing renderer first
        if (globalRenderer) {
          globalRenderer.dispose()
          globalRenderer = null
        }
        
        const scene = new THREE.Scene()
        globalScene = scene
        
        const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000)
        globalCamera = camera
        
        // Create renderer with error handling
        try {
          const renderer = new THREE.WebGLRenderer({ 
            antialias: true, 
            alpha: true,
            powerPreference: "low-power", // Use low-power to reduce context loss
            preserveDrawingBuffer: false,
            failIfMajorPerformanceCaveat: false // Don't fail on performance issues
          })
          
          renderer.setSize(window.innerWidth, window.innerHeight)
          renderer.setClearColor(0x000000, 0)
          renderer.shadowMap.enabled = true
          renderer.shadowMap.type = THREE.PCFSoftShadowMap
          
          // Only append if container exists and is empty
          if (sceneRef.current && sceneRef.current.children.length === 0) {
            sceneRef.current.appendChild(renderer.domElement)
          }
          
          globalRenderer = renderer
        } catch (renderError) {
          console.error('Failed to create WebGL renderer:', renderError)
          // Fallback - could implement Canvas renderer or show error message
          return
        }

        // Create rocky ground base
        const groundGeometry = new THREE.ConeGeometry(3, 1.5, 8, 1, false, 0, Math.PI * 2)
        const groundMaterial = new THREE.MeshLambertMaterial({ 
          color: 0xD4C5B9
        })
        const ground = new THREE.Mesh(groundGeometry, groundMaterial)
        ground.position.y = -2
        ground.castShadow = true
        ground.receiveShadow = true
        scene.add(ground)

        // Create detailed tree trunk with multiple branches
        const trunkGroup = new THREE.Group()
        
        // Main trunk
        const mainTrunkGeometry = new THREE.CylinderGeometry(0.15, 0.25, 3, 12)
        const trunkMaterial = new THREE.MeshLambertMaterial({ color: 0x4A3728 })
        const mainTrunk = new THREE.Mesh(mainTrunkGeometry, trunkMaterial)
        mainTrunk.position.y = 0.5
        mainTrunk.castShadow = true
        trunkGroup.add(mainTrunk)

        // Branch system
        for (let i = 0; i < 8; i++) {
          const branchGeometry = new THREE.CylinderGeometry(0.03, 0.08, 1 + Math.random() * 0.5, 6)
          const branch = new THREE.Mesh(branchGeometry, trunkMaterial)
          branch.position.y = 1.5 + Math.random() * 0.5
          branch.position.x = (Math.random() - 0.5) * 0.8
          branch.position.z = (Math.random() - 0.5) * 0.8
          branch.rotation.z = (Math.random() - 0.5) * 0.8
          branch.rotation.x = (Math.random() - 0.5) * 0.5
          branch.castShadow = true
          trunkGroup.add(branch)
        }
        
        scene.add(trunkGroup)

        // Create particle system for foliage
        const particleCount = 2000
        const particles = new THREE.BufferGeometry()
        const positions = new Float32Array(particleCount * 3)
        const colors = new Float32Array(particleCount * 3)
        const sizes = new Float32Array(particleCount)

        for (let i = 0; i < particleCount; i++) {
          // Create spherical distribution around tree top
          const radius = 2 + Math.random() * 1.5
          const theta = Math.random() * Math.PI * 2
          const phi = Math.random() * Math.PI
          
          positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta)
          positions[i * 3 + 1] = 2.5 + radius * Math.cos(phi) * 0.8
          positions[i * 3 + 2] = radius * Math.sin(phi) * Math.sin(theta)

          // Color variations - white to light purple/pink
          const colorVariation = Math.random()
          if (colorVariation < 0.3) {
            colors[i * 3] = 1.0     // R
            colors[i * 3 + 1] = 1.0 // G  
            colors[i * 3 + 2] = 1.0 // B - Pure white
          } else if (colorVariation < 0.6) {
            colors[i * 3] = 1.0     // R
            colors[i * 3 + 1] = 0.9 // G
            colors[i * 3 + 2] = 1.0 // B - Light purple
          } else {
            colors[i * 3] = 1.0     // R
            colors[i * 3 + 1] = 0.85 // G
            colors[i * 3 + 2] = 0.9  // B - Light pink
          }

          sizes[i] = Math.random() * 3 + 1
        }

        particles.setAttribute('position', new THREE.BufferAttribute(positions, 3))
        particles.setAttribute('color', new THREE.BufferAttribute(colors, 3))
        particles.setAttribute('size', new THREE.BufferAttribute(sizes, 1))

        const particleMaterial = new THREE.ShaderMaterial({
          vertexColors: true,
          transparent: true,
          blending: THREE.AdditiveBlending,
          vertexShader: `
            attribute float size;
            varying vec3 vColor;
            void main() {
              vColor = color;
              vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
              gl_PointSize = size * (300.0 / -mvPosition.z);
              gl_Position = projectionMatrix * mvPosition;
            }
          `,
          fragmentShader: `
            varying vec3 vColor;
            void main() {
              float distanceToCenter = distance(gl_PointCoord, vec2(0.5));
              if (distanceToCenter > 0.5) discard;
              float alpha = 1.0 - smoothstep(0.0, 0.5, distanceToCenter);
              gl_FragColor = vec4(vColor, alpha * 0.8);
            }
          `
        })

        const particleSystem = new THREE.Points(particles, particleMaterial)
        scene.add(particleSystem)

        // Create hanging string elements
        const stringGroup = new THREE.Group()
        for (let i = 0; i < 15; i++) {
          const stringGeometry = new THREE.CylinderGeometry(0.005, 0.005, 0.8 + Math.random() * 0.4, 4)
          const stringMaterial = new THREE.MeshBasicMaterial({ 
            color: 0xE8D5A3,
            transparent: true,
            opacity: 0.7
          })
          const string = new THREE.Mesh(stringGeometry, stringMaterial)
          
          // Position strings around the tree
          const angle = (i / 15) * Math.PI * 2
          string.position.x = Math.cos(angle) * (1.5 + Math.random() * 0.5)
          string.position.z = Math.sin(angle) * (1.5 + Math.random() * 0.5)
          string.position.y = 2.8
          
          stringGroup.add(string)
        }
        scene.add(stringGroup)

        // Create large cicada wings (wireframe)
        const wingGroup = new THREE.Group()
        
        // Wing shape using more detailed geometry
        const wingShape = new THREE.Shape()
        wingShape.moveTo(0, 0)
        wingShape.bezierCurveTo(0, 2, 4, 3, 6, 2.5)
        wingShape.bezierCurveTo(8, 2, 8, 1, 7, 0.5)
        wingShape.bezierCurveTo(6, 0, 3, 0, 0, 0)

        const extrudeSettings = {
          depth: 0.02,
          bevelEnabled: false
        }

        const wingGeometry = new THREE.ExtrudeGeometry(wingShape, extrudeSettings)
        const wingMaterial = new THREE.MeshBasicMaterial({
          color: 0xE1D5E7,
          transparent: true,
          opacity: 0.15,
          wireframe: true,
          wireframeLinewidth: 1
        })

        // Left wing
        const leftWing = new THREE.Mesh(wingGeometry, wingMaterial)
        leftWing.position.set(-4, 1.5, -2)
        leftWing.rotation.y = Math.PI * 0.2
        leftWing.rotation.z = Math.PI * 0.1
        leftWing.scale.set(0.8, 0.8, 1)
        wingGroup.add(leftWing)

        // Right wing
        const rightWing = new THREE.Mesh(wingGeometry, wingMaterial)
        rightWing.position.set(4, 1.5, -2)
        rightWing.rotation.y = -Math.PI * 0.2
        rightWing.rotation.z = -Math.PI * 0.1
        rightWing.scale.set(-0.8, 0.8, 1)
        wingGroup.add(rightWing)

        scene.add(wingGroup)

        // Enhanced lighting setup
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.4)
        scene.add(ambientLight)
        
        const mainLight = new THREE.DirectionalLight(0xffffff, 0.8)
        mainLight.position.set(10, 10, 5)
        mainLight.castShadow = true
        mainLight.shadow.mapSize.width = 2048
        mainLight.shadow.mapSize.height = 2048
        scene.add(mainLight)

        const fillLight = new THREE.DirectionalLight(0xE1D5E7, 0.3)
        fillLight.position.set(-5, 5, -5)
        scene.add(fillLight)

        // Position camera
        camera.position.set(0, 2, 12)
        camera.lookAt(0, 1, 0)

        // Animation loop with enhanced effects
        let time = 0
        const animate = () => {
          if (!globalRenderer || !globalScene || !globalCamera) return
          
          animationIdRef.current = requestAnimationFrame(animate)
          time += 0.01
          
          // Gentle tree movement
          trunkGroup.rotation.y = Math.sin(time * 0.5) * 0.02
          trunkGroup.children.forEach((branch, index) => {
            if (index > 0) { // Skip main trunk
              branch.rotation.z += Math.sin(time * 2 + index) * 0.001
            }
          })

          // Particle animation
          const positions = particleSystem.geometry.attributes.position.array
          for (let i = 0; i < particleCount; i++) {
            positions[i * 3 + 1] += Math.sin(time * 2 + i * 0.1) * 0.005
          }
          particleSystem.geometry.attributes.position.needsUpdate = true
          particleSystem.rotation.y += 0.002

          // String swaying
          stringGroup.children.forEach((string, index) => {
            string.rotation.z = Math.sin(time * 1.5 + index * 0.5) * 0.1
          })

          // Wing animation
          leftWing.rotation.y = Math.PI * 0.2 + Math.sin(time * 0.8) * 0.05
          rightWing.rotation.y = -Math.PI * 0.2 - Math.sin(time * 0.8) * 0.05
          leftWing.position.y = 1.5 + Math.sin(time * 0.6) * 0.1
          rightWing.position.y = 1.5 + Math.sin(time * 0.6 + Math.PI) * 0.1

          // Subtle camera movement
          globalCamera.position.x = Math.sin(time * 0.3) * 0.5
          globalCamera.position.y = 2 + Math.cos(time * 0.2) * 0.2
          globalCamera.lookAt(0, 1, 0)
          
          globalRenderer.render(globalScene, globalCamera)
        }
        animate()

        // Handle resize
        const handleResize = () => {
          if (!globalCamera || !globalRenderer) return
          
          globalCamera.aspect = window.innerWidth / window.innerHeight
          globalCamera.updateProjectionMatrix()
          globalRenderer.setSize(window.innerWidth, window.innerHeight)
        }
        window.addEventListener('resize', handleResize)

        // Store cleanup function
        cleanupRef.current = () => {
          window.removeEventListener('resize', handleResize)
          
          if (animationIdRef.current) {
            cancelAnimationFrame(animationIdRef.current)
            animationIdRef.current = null
          }
          
          // Clean up Three.js objects
          if (globalScene) {
            globalScene.traverse((object) => {
              if (object.geometry) object.geometry.dispose()
              if (object.material) {
                if (Array.isArray(object.material)) {
                  object.material.forEach(material => material.dispose())
                } else {
                  object.material.dispose()
                }
              }
            })
            globalScene.clear()
          }
          
          // Remove renderer DOM element
          if (globalRenderer && sceneRef.current?.contains(globalRenderer.domElement)) {
            sceneRef.current.removeChild(globalRenderer.domElement)
          }
          
          // Dispose renderer
          if (globalRenderer) {
            globalRenderer.dispose()
            globalRenderer = null
          }
          
          globalScene = null
          globalCamera = null
        }
      } catch (error) {
        console.error('Error initializing 3D scene:', error)
      }
    }

    initThreeScene()
    
    // Cleanup on unmount
    return () => {
      if (cleanupRef.current) {
        cleanupRef.current()
      }
    }
  }, [])

  return (
    <div 
      ref={sceneRef} 
      className="absolute inset-0 z-0"
      style={{ 
        width: '100%', 
        height: '100%',
        pointerEvents: 'none'
      }}
    />
  )
}

"use client"

import { useEffect, useRef } from "react"

let globalRenderer: any = null
let globalScene: any = null
let globalCamera: any = null

export default function MolecularScene() {
  const sceneRef = useRef<HTMLDivElement>(null)
  const animationIdRef = useRef<number | null>(null)
  const cleanupRef = useRef<(() => void) | null>(null)

  useEffect(() => {
    if (typeof window === "undefined" || !sceneRef.current) return

    const initThreeScene = async () => {
      try {
        const THREE = await import("three")

        // ===== Knobs =====
        const CLUSTER_RADIUS = 5.2
        const PARTICLE_COUNT = 720
        const SUBCLUSTERS = 3
        const MOL_COUNT = 28 + ((Math.random() * 8) | 0)
        // =================

        if (globalRenderer) { globalRenderer.dispose(); globalRenderer = null }

        const scene = new THREE.Scene()
        globalScene = scene
        scene.fog = new THREE.FogExp2(0xf3f0ff, 0.055)

        const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 240)
        camera.position.set(7.2, 2.7, 15.2)
        globalCamera = camera

        const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" })
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
        renderer.setSize(window.innerWidth, window.innerHeight)
        renderer.setClearColor(0x000000, 0)
        renderer.outputColorSpace = THREE.SRGBColorSpace
        renderer.toneMapping = THREE.ACESFilmicToneMapping
        renderer.toneMappingExposure = 1.05
        if (sceneRef.current && sceneRef.current.children.length === 0) sceneRef.current.appendChild(renderer.domElement)
        globalRenderer = renderer

        // use real elapsed time for stable motion
        const clock = new THREE.Clock()

        // === Lights
        scene.add(new THREE.AmbientLight(0xffffff, 0.26))
        const hemi = new THREE.HemisphereLight(0xdedcff, 0x8a7aff, 0.66); hemi.position.set(0, 1, 0); scene.add(hemi)
        const pointA = new THREE.PointLight(0x9f8cff, 1.08, 42, 2)
        const pointB = new THREE.PointLight(0xffffff, 0.85, 42, 2)
        pointA.position.set(8, 6, 2); pointB.position.set(-6, -2, -4); scene.add(pointA, pointB)

        // === Materials
        const baseMat = new THREE.MeshPhysicalMaterial({
          color: 0x8b7dff, transparent: true, opacity: 0.86, roughness: 0.12, metalness: 0.08,
          clearcoat: 1, clearcoatRoughness: 0.08, transmission: 0.3, thickness: 0.6
        })
        const altMat = new THREE.MeshPhysicalMaterial({
          color: 0xa594ff, transparent: true, opacity: 0.75, roughness: 0.22, metalness: 0.02,
          clearcoat: 0.9, clearcoatRoughness: 0.12, transmission: 0.36, thickness: 0.36
        })
        const vary = (hex: number) => {
          const c = new THREE.Color(hex).convertSRGBToLinear()
          const hsl = { h: 0, s: 0, l: 0 }; c.getHSL(hsl)
          hsl.h = (hsl.h + (Math.random() - 0.5) * 0.12 + 1) % 1
          hsl.s = Math.min(1, Math.max(0, hsl.s + (Math.random() - 0.5) * 0.15))
          hsl.l = Math.min(1, Math.max(0, hsl.l + (Math.random() - 0.5) * 0.08))
          return new THREE.Color().setHSL(hsl.h, hsl.s, hsl.l)
        }

        // === Ribbons
        const ribbons = new THREE.Group(); scene.add(ribbons)
        const makeProteinRibbon = () => {
          const pts: THREE.Vector3[] = []; const len = 26
          for (let i = 0; i < len; i++) {
            const t = i / (len - 1)
            const x = -4 + t * 8
            const y = Math.sin(t * Math.PI * 3.8) * 1.25 + Math.cos(t * 2.7) * 0.35
            const z = Math.cos(t * Math.PI * 2.9) * 1.55
            pts.push(new THREE.Vector3(x, y, z))
          }
          const curve = new THREE.CatmullRomCurve3(pts, false, "catmullrom", 0.25)
          const geom = new THREE.TubeGeometry(curve, 320, 0.18, 12, false)
          const m = altMat.clone(); m.color = vary(0xa594ff)
          const mesh = new THREE.Mesh(geom, m); mesh.position.set(2.1, 0.3, -1.6)
          return mesh
        }
        const makeBetaSheet = () => {
          const w = 0.85, segs = 180
          const geo = new THREE.PlaneGeometry(w, 8.4, 1, segs)
          const pos = geo.attributes.position as THREE.BufferAttribute
          for (let i = 0; i < pos.count; i++) {
            const y = pos.getY(i); const t = (y + 4.2) / 8.4
            const twist = Math.sin(t * Math.PI * 3.8) * 0.65
            const z = Math.sin(t * Math.PI * 7.0) * 0.16
            const x = pos.getX(i) * Math.cos(twist) - z * Math.sin(twist)
            const z2 = pos.getX(i) * Math.sin(twist) + z * Math.cos(twist)
            pos.setX(i, x); pos.setZ(i, z2)
          }
          pos.needsUpdate = true; geo.computeVertexNormals()
          const m = baseMat.clone(); m.color = vary(0x8b7dff)
          const mesh = new THREE.Mesh(geo, m)
          mesh.rotation.set(0, Math.PI / 6, Math.PI / 12); mesh.position.set(-2.2, -0.25, 0.7)
          return mesh
        }
        const ribbonA = makeProteinRibbon()
        const ribbonB = makeBetaSheet()
        ribbons.add(ribbonA, ribbonB)

        // === Molecules (incl. glycans)
        const moleculeGroup = new THREE.Group(); scene.add(moleculeGroup)
        type MolType = "antibody" | "protein" | "dna" | "ring" | "globular" | "nanotube" | "capsid" | "glycan"
        const weighted: [MolType, number][] = [
          ["protein", 2.2], ["globular", 1.8], ["dna", 1.1], ["ring", 1.0],
          ["antibody", 1.2], ["nanotube", 0.9], ["capsid", 0.8], ["glycan", 1.3]
        ]
        const pickType = (): MolType => {
          const sum = weighted.reduce((s, [, w]) => s + w, 0)
          let r = Math.random() * sum
          for (const [t, w] of weighted) { if ((r -= w) <= 0) return t }
          return "protein"
        }

        const createMolecule = (type: MolType) => {
          const g = new THREE.Group()
          const mat = baseMat.clone(); mat.color = vary(0x8b7dff)

          if (type === "antibody") {
            const body = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 1.25, 16), mat)
            const armGeo = new THREE.CylinderGeometry(0.12, 0.12, 0.85, 16)
            const l = new THREE.Mesh(armGeo, mat), r = new THREE.Mesh(armGeo, mat)
            l.position.set(-0.42, 0.42, 0); l.rotation.z = Math.PI / 6
            r.position.set(0.42, 0.42, 0); r.rotation.z = -Math.PI / 6
            const site = new THREE.SphereGeometry(0.16, 18, 18)
            const sl = new THREE.Mesh(site, mat); sl.position.set(-0.74, 0.74, 0)
            const sr = new THREE.Mesh(site, mat); sr.position.set(0.74, 0.74, 0)
            g.add(body, l, r, sl, sr)
          } else if (type === "protein") {
            const core = new THREE.Mesh(new THREE.SphereGeometry(0.34, 22, 22), mat); g.add(core)
            for (let i = 0; i < 5; i++) {
              const helix = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.9, 10), mat)
              const a = (i / 5) * Math.PI * 2
              helix.position.set(Math.cos(a) * 0.45, Math.sin(i * 0.5) * 0.35, Math.sin(a) * 0.45)
              helix.rotation.set(Math.random() * 1.2, a, Math.random() * 0.8)
              g.add(helix)
            }
          } else if (type === "dna") {
            const R = 0.34, H = 1.7, turns = 3.2, steps = 24
            for (let s = 0; s < 2; s++) {
              for (let i = 0; i < steps; i++) {
                const t = (i / (steps - 1)) * turns * Math.PI * 2
                const y = (i / (steps - 1)) * H - H / 2
                const nuc = new THREE.Mesh(new THREE.SphereGeometry(0.065, 10, 10), mat)
                nuc.position.set(Math.cos(t + s * Math.PI) * R, y, Math.sin(t + s * Math.PI) * R)
                g.add(nuc)
                if (i % 2 === 0) {
                  const bp = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, R * 1.9, 8), mat)
                  bp.position.set(0, y, 0); bp.rotation.y = t; bp.rotation.z = Math.PI / 2
                  g.add(bp)
                }
              }
            }
          } else if (type === "ring") {
            const torus = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.09, 16, 48), altMat)
            g.add(torus)
            for (let i = 0; i < 10; i++) {
              const chain = new THREE.Mesh(new THREE.SphereGeometry(0.055, 10, 10), mat)
              const a = (i / 10) * Math.PI * 2
              chain.position.set(Math.cos(a) * 0.56, 0, Math.sin(a) * 0.56)
              g.add(chain)
            }
          } else if (type === "globular") {
            const main = new THREE.Mesh(new THREE.SphereGeometry(0.28, 18, 18), mat); g.add(main)
            for (let i = 0; i < 7; i++) {
              const f = new THREE.Mesh(new THREE.SphereGeometry(0.085, 12, 12), mat)
              const phi = Math.random() * Math.PI * 2, theta = Math.random() * Math.PI
              f.position.set(0.36 * Math.sin(theta) * Math.cos(phi), 0.36 * Math.cos(theta), 0.36 * Math.sin(theta) * Math.sin(phi))
              g.add(f)
            }
          } else if (type === "nanotube") {
            const tube = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 1.1, 24, 1, true), altMat)
            const cap1 = new THREE.Mesh(new THREE.RingGeometry(0.18, 0.22, 24), altMat)
            const cap2 = cap1.clone(); cap1.rotation.x = Math.PI / 2; cap2.rotation.x = Math.PI / 2
            cap1.position.y = 0.55; cap2.position.y = -0.55; g.add(tube, cap1, cap2)
          } else if (type === "capsid") {
            const shell = new THREE.Mesh(new THREE.IcosahedronGeometry(0.45, 0), altMat)
            const inner = new THREE.Mesh(new THREE.IcosahedronGeometry(0.25, 1), baseMat); inner.scale.setScalar(0.9)
            g.add(shell, inner)
          } else if (type === "glycan") {
            const spike = new THREE.Group()
            const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.14, 1.2, 14), altMat)
            stem.position.y = 0.6; spike.add(stem)
            const head = new THREE.Mesh(new THREE.SphereGeometry(0.22, 16, 16), altMat); head.position.y = 1.2; spike.add(head)
            const residues = 8 + ((Math.random() * 6) | 0)
            for (let i = 0; i < residues; i++) {
              const ang = (i / residues) * Math.PI * 2 + Math.random() * 0.3
              const len = 0.35 + Math.random() * 0.35
              const branch = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.03, len, 10), baseMat)
              branch.position.set(Math.cos(ang) * 0.18, 1.2 + len / 2, Math.sin(ang) * 0.18)
              branch.lookAt(Math.cos(ang) * 0.18, 1.2 + len, Math.sin(ang) * 0.18)
              spike.add(branch)
              const balls = 2 + (Math.random() * 3) | 0
              for (let b = 0; b < balls; b++) {
                const s = 0.05 + Math.random() * 0.05
                const bead = new THREE.Mesh(new THREE.SphereGeometry(s, 10, 10), baseMat.clone())
                ;(bead.material as any).color = vary(0x9fa6ff)
                const t = (b + 1) / (balls + 1)
                bead.position.set(Math.cos(ang) * 0.18, 1.2 + t * len, Math.sin(ang) * 0.18)
                spike.add(bead)
              }
            }
            g.add(spike)
          }

          return g
        }

        // Molecule params (real-time roaming)
        const molecules: {
          mesh: any
          anchor: THREE.Vector3
          phase: number
          speedA: number
          speedB: number
          ampA: number
          ampB: number
          rot: { x: number; y: number; z: number }
          anchorAxis: THREE.Vector3
          anchorSpeed: number
          anchorAmp: number
        }[] = []

        for (let i = 0; i < MOL_COUNT; i++) {
          const m = createMolecule(pickType())
          const anchor = new THREE.Vector3(
            (Math.random() - 0.25) * 26,
            (Math.random() - 0.5) * 12,
            (Math.random() - 0.5) * 22
          )
          m.position.copy(anchor)
          m.rotation.set(Math.random() * Math.PI * 2, Math.random() * Math.PI * 2, Math.random() * Math.PI * 2)
          m.scale.setScalar(0.5 + Math.random() * 1.0)

          molecules.push({
            mesh: m,
            anchor,
            phase: Math.random() * Math.PI * 2,
            speedA: 0.6 + Math.random() * 0.8,   // rad/s
            speedB: 0.4 + Math.random() * 0.7,   // rad/s
            ampA: 1.2 + Math.random() * 1.4,     // world units
            ampB: 0.9 + Math.random() * 1.1,
            rot: {
              x: (Math.random() - 0.5) * 0.028,
              y: (Math.random() - 0.5) * 0.028,
              z: (Math.random() - 0.5) * 0.028
            },
            anchorAxis: new THREE.Vector3(Math.random()-0.5, Math.random()-0.5, Math.random()-0.5).normalize(),
            anchorSpeed: 0.05 + Math.random() * 0.08, // rad/s
            anchorAmp: 1.2 + Math.random() * 2.0
          })
          moleculeGroup.add(m)
        }

        // === Clustered particles (absolute, evolving)
        const cluster = new THREE.Group(); scene.add(cluster)
        const pGeo = new THREE.SphereGeometry(0.018, 6, 6)
        const pMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.68 })
        const particles = new THREE.InstancedMesh(pGeo, pMat, PARTICLE_COUNT)
        const dummy = new THREE.Object3D()

        // Subcluster centers (anchors + motion params)
        const centers: {
          anchor: THREE.Vector3
          phase: number
          freq: number
          amp: number
        }[] = Array.from({ length: SUBCLUSTERS }, () => ({
          anchor: new THREE.Vector3(
            (Math.random() - 0.5) * CLUSTER_RADIUS * 0.9,
            (Math.random() - 0.3) * CLUSTER_RADIUS * 0.6,
            (Math.random() - 0.5) * CLUSTER_RADIUS * 0.9
          ),
          phase: Math.random() * Math.PI * 2,
          freq: 0.03 + Math.random() * 0.03,
          amp: 0.6 + Math.random() * 1.0
        }))

        // Particle anchors + motion params
        const pDir: THREE.Vector3[] = []
        const pAxis: THREE.Vector3[] = []
        const pFreqDir: number[] = []
        const pFreqRad: number[] = []
        const pPhaseDir: number[] = []
        const pPhaseRad: number[] = []
        const pRadBase: number[] = []
        const pRadAmp: number[] = []
        const pCenterIdx: number[] = []

        const randNorm = () => {
          const v = new THREE.Vector3(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5)
          v.normalize(); return v
        }

        for (let i = 0; i < PARTICLE_COUNT; i++) {
          const ci = (Math.random() * centers.length) | 0
          pCenterIdx[i] = ci
          const baseR = CLUSTER_RADIUS * (0.35 + Math.random() * 0.35)
          const dir = randNorm()
          pDir[i] = dir.clone()
          pAxis[i] = randNorm()
          pFreqDir[i] = 0.2 + Math.random() * 0.4
          pFreqRad[i] = 0.4 + Math.random() * 0.9
          pPhaseDir[i] = Math.random() * Math.PI * 2
          pPhaseRad[i] = Math.random() * Math.PI * 2
          pRadBase[i] = baseR
          pRadAmp[i] = baseR * (0.08 + Math.random() * 0.16)
        }

        // Initial fill
        for (let i = 0; i < PARTICLE_COUNT; i++) {
          dummy.position.set(0, 0, 0); dummy.updateMatrix()
          particles.setMatrixAt(i, dummy.matrix)
        }
        particles.instanceMatrix.needsUpdate = true
        cluster.add(particles)

        // === Pointer parallax
        const mouse = { x: 0, y: 0 }
        const target = new THREE.Vector3(3, 0, 0)
        const onPointerMove = (e: PointerEvent) => {
          mouse.x = (e.clientX / window.innerWidth) * 2 - 1
          mouse.y = (e.clientY / window.innerHeight) * 2 - 1
        }
        window.addEventListener("pointermove", onPointerMove, { passive: true })

        // === Animate
        const animate = () => {
          if (!globalRenderer || !globalScene || !globalCamera) return
          animationIdRef.current = requestAnimationFrame(animate)

          const elapsed = clock.getElapsedTime()

          // moving lights
          pointA.position.x = Math.sin(elapsed * 0.85) * 9
          pointA.position.y = 5 + Math.cos(elapsed * 0.6) * 2
          pointA.position.z = 3 + Math.sin(elapsed * 0.45) * 4
          pointB.position.x = -6 + Math.cos(elapsed * 0.7) * 6
          pointB.position.y = -1 + Math.sin(elapsed * 0.55) * 2
          pointB.position.z = -5 + Math.cos(elapsed * 0.35) * 5

          // ribbons — gentle breathing
          ribbons.children.forEach((r, i) => {
            r.rotation.y = Math.sin(elapsed * 0.22 + i) * 0.11
            r.position.y = Math.sin(elapsed * 0.28 + i) * 0.16
          })

          // molecules — roaming (anchor drift + Lissajous offsets)
          molecules.forEach((m) => {
            const tt = elapsed + m.phase

            // anchor slow drift
            const driftAngle = tt * m.anchorSpeed
            const driftVec = m.anchorAxis.clone().multiplyScalar(m.anchorAmp * 0.5)
            const drift = new THREE.Vector3(
              Math.cos(driftAngle) * driftVec.x,
              Math.sin(driftAngle * 0.7) * driftVec.y,
              Math.sin(driftAngle) * driftVec.z
            )
            const anchorNow = m.anchor.clone().add(drift)

            // lively offsets
            const dx = Math.sin(tt * m.speedA) * m.ampA + Math.sin(tt * (m.speedA * 1.31)) * (m.ampA * 0.35)
            const dy = Math.cos(tt * m.speedB) * m.ampB + Math.sin(tt * (m.speedB * 1.19)) * (m.ampB * 0.3)
            const dz = Math.sin(tt * (m.speedA * 0.87)) * (m.ampA * 0.6) + Math.cos(tt * (m.speedB * 0.73)) * (m.ampB * 0.45)

            m.mesh.position.set(anchorNow.x + dx * 0.7, anchorNow.y + dy * 0.7, anchorNow.z + dz * 0.7)

            // spin
            m.mesh.rotation.x += m.rot.x
            m.mesh.rotation.y += m.rot.y
            m.mesh.rotation.z += m.rot.z
          })

          // subcluster centers — absolute orbits around anchors
          const centerPosNow: THREE.Vector3[] = []
          for (let i = 0; i < centers.length; i++) {
            const c = centers[i]
            const ang = (elapsed + c.phase) * (0.12 + c.freq * 0.6)
            const sway = Math.sin((elapsed + c.phase) * c.freq) * c.amp * 0.2
            const offset = new THREE.Vector3(Math.cos(ang), 0, Math.sin(ang)).multiplyScalar(c.amp * 0.4)
            const pos = c.anchor.clone().add(offset)
            pos.y += sway
            centerPosNow[i] = pos
          }

          // particles — absolute recompute (direction rotation + breathing radius)
          const breathe = 0.15 + Math.sin(elapsed * 0.7) * 0.05
          for (let i = 0; i < PARTICLE_COUNT; i++) {
            const ci = pCenterIdx[i]
            const center = centerPosNow[ci]
            const theta = pPhaseDir[i] + elapsed * pFreqDir[i]
            const dir = pDir[i].clone().applyAxisAngle(pAxis[i], theta)
            const rad = pRadBase[i] + Math.sin(pPhaseRad[i] + elapsed * pFreqRad[i]) * pRadAmp[i] * breathe
            const pos = center.clone().add(dir.multiplyScalar(rad))
            dummy.position.copy(pos); dummy.updateMatrix()
            particles.setMatrixAt(i, dummy.matrix)
          }
          particles.instanceMatrix.needsUpdate = true

          // parallax
          const px = mouse.x * 0.75, py = -mouse.y * 0.55
          globalCamera.position.x += (7.2 + px * 1.25 - globalCamera.position.x) * 0.05
          globalCamera.position.y += (2.7 + py * 0.85 - globalCamera.position.y) * 0.05
          moleculeGroup.position.x += (mouse.x * 1.15 - moleculeGroup.position.x) * 0.02
          moleculeGroup.position.y += (-mouse.y * 0.75 - moleculeGroup.position.y) * 0.02
          cluster.position.x = moleculeGroup.position.x * 0.5
          cluster.position.y = moleculeGroup.position.y * 0.5

          target.set(3 + px * 0.62, 0 + py * 0.42, 0)
          globalCamera.lookAt(target)

          globalRenderer.render(globalScene, globalCamera)
        }
        animate()

        // Resize + cleanup
        const handleResize = () => {
          if (!globalCamera || !globalRenderer) return
          globalCamera.aspect = window.innerWidth / window.innerHeight
          globalCamera.updateProjectionMatrix()
          globalRenderer.setSize(window.innerWidth, window.innerHeight)
        }
        window.addEventListener("resize", handleResize)

        cleanupRef.current = () => {
          window.removeEventListener("resize", handleResize)
          window.removeEventListener("pointermove", onPointerMove)
          if (animationIdRef.current) { cancelAnimationFrame(animationIdRef.current); animationIdRef.current = null }
          if (globalScene) {
            globalScene.traverse((o: any) => {
              if (o.geometry) o.geometry.dispose()
              if (o.material) Array.isArray(o.material) ? o.material.forEach((m: any) => m.dispose()) : o.material.dispose()
            })
            globalScene.clear()
          }
          if (globalRenderer && sceneRef.current?.contains(globalRenderer.domElement)) sceneRef.current.removeChild(globalRenderer.domElement)
          if (globalRenderer) { globalRenderer.dispose(); globalRenderer = null }
          globalScene = null; globalCamera = null
        }
      } catch (e) {
        console.error("Error initializing 3D molecular scene:", e)
      }
    }

    initThreeScene()
    return () => { if (cleanupRef.current) cleanupRef.current() }
  }, [])

  return (
    <div
      ref={sceneRef}
      className="absolute inset-0 z-0"
      style={{ width: "100%", height: "100%", pointerEvents: "none" }}
    />
  )
}

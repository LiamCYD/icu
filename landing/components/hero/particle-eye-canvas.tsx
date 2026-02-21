"use client";

import { useRef, useMemo, useCallback } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";

const TEAL = [0.227, 0.541, 0.549] as const;       // #3a8a8c
const DARK_TEAL = [0.149, 0.310, 0.369] as const;   // #264f5e
const LIGHT_BLUE = [0.357, 0.722, 0.831] as const;  // #5bb8d4
const CORAL = [0.878, 0.322, 0.322] as const;       // #e05252

function lerp3(a: readonly number[], b: readonly number[], t: number): [number, number, number] {
  return [
    a[0] + (b[0] - a[0]) * t,
    a[1] + (b[1] - a[1]) * t,
    a[2] + (b[2] - a[2]) * t,
  ];
}

function eyeCurve(t: number, sx: number, sy: number) {
  return {
    x: Math.cos(t) * sx,
    y: Math.sin(t) * sy * Math.sin(t * 0.5 + Math.PI * 0.25),
  };
}

function buildParticles(count: number) {
  const pos = new Float32Array(count * 3);
  const col = new Float32Array(count * 3);
  const sz = new Float32Array(count);
  const ph = new Float32Array(count);
  const sp = new Float32Array(count); // speed multiplier

  let idx = 0;

  function push(x: number, y: number, z: number, r: number, g: number, b: number, s: number) {
    const i3 = idx * 3;
    pos[i3] = x;
    pos[i3 + 1] = y;
    pos[i3 + 2] = z;
    col[i3] = r;
    col[i3 + 1] = g;
    col[i3 + 2] = b;
    sz[idx] = s;
    ph[idx] = Math.random() * Math.PI * 2;
    sp[idx] = 0.5 + Math.random() * 1.0;
    idx++;
  }

  // Outer arcs
  const arcs = [
    { sx: 5.5, sy: 2.8, n: Math.floor(count * 0.14), c: DARK_TEAL },
    { sx: 4.5, sy: 2.2, n: Math.floor(count * 0.14), c: TEAL },
    { sx: 3.5, sy: 1.6, n: Math.floor(count * 0.10), c: TEAL },
  ];

  for (const arc of arcs) {
    for (let i = 0; i < arc.n && idx < count; i++) {
      const t = (i / arc.n) * Math.PI * 2;
      const p = eyeCurve(t, arc.sx, arc.sy);
      const c = lerp3(arc.c, [1, 1, 1], Math.random() * 0.12);
      push(
        p.x + (Math.random() - 0.5) * 0.3,
        p.y + (Math.random() - 0.5) * 0.3,
        (Math.random() - 0.5) * 0.8,
        c[0], c[1], c[2],
        0.02 + Math.random() * 0.05,
      );
    }
  }

  // Iris ring
  const irisN = Math.floor(count * 0.12);
  for (let i = 0; i < irisN && idx < count; i++) {
    const a = (i / irisN) * Math.PI * 2;
    const r = 1.4 + (Math.random() - 0.5) * 0.4;
    const c = lerp3(LIGHT_BLUE, TEAL, Math.random() * 0.5);
    push(
      Math.cos(a) * r,
      Math.sin(a) * r,
      (Math.random() - 0.5) * 0.3,
      c[0], c[1], c[2],
      0.03 + Math.random() * 0.05,
    );
  }

  // Pupil
  const pupilN = Math.floor(count * 0.10);
  for (let i = 0; i < pupilN && idx < count; i++) {
    const a = Math.random() * Math.PI * 2;
    const r = Math.random() * 0.7;
    const brightness = 1 - r / 0.7;
    const c = lerp3(LIGHT_BLUE, [1, 1, 1], brightness * 0.5);
    push(
      Math.cos(a) * r,
      Math.sin(a) * r,
      (Math.random() - 0.5) * 0.2,
      c[0], c[1], c[2],
      0.03 + brightness * 0.06,
    );
  }

  // Fill / atmosphere
  while (idx < count) {
    const t = Math.random() * Math.PI * 2;
    const spread = 0.3 + Math.random() * 0.7;
    const si = Math.floor(Math.random() * 3);
    const scales = [[5.5, 2.8], [4.5, 2.2], [3.5, 1.6]][si];
    const p = eyeCurve(t, scales[0] * spread, scales[1] * spread);

    const pick = Math.random();
    const c = pick < 0.5
      ? lerp3(DARK_TEAL, TEAL, Math.random())
      : pick < 0.85
        ? lerp3(TEAL, LIGHT_BLUE, Math.random() * 0.5)
        : lerp3(CORAL, TEAL, 0.5 + Math.random() * 0.3);

    push(
      p.x + (Math.random() - 0.5) * 1.5,
      p.y + (Math.random() - 0.5) * 1.0,
      (Math.random() - 0.5) * 2.0,
      c[0], c[1], c[2],
      0.01 + Math.random() * 0.04,
    );
  }

  return { pos, col, sz, ph, sp };
}

const VERT = `
  attribute float aSize;
  attribute float aPhase;
  attribute float aSpeed;
  uniform float uTime;
  uniform float uPixelRatio;
  varying vec3 vColor;
  varying float vAlpha;

  void main() {
    vColor = color;

    // Animate position
    vec3 p = position;
    p.x += sin(uTime * 0.6 * aSpeed + aPhase) * 0.12;
    p.y += cos(uTime * 0.5 * aSpeed + aPhase * 1.3) * 0.12;
    p.z += sin(uTime * 0.4 * aSpeed + aPhase * 0.7) * 0.15;

    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    float dist = -mv.z;

    vAlpha = 0.35 + 0.65 * smoothstep(14.0, 4.0, dist);
    vAlpha *= 0.6 + 0.4 * sin(uTime * 1.0 + aPhase * 2.0);

    gl_Position = projectionMatrix * mv;
    gl_PointSize = aSize * uPixelRatio * (350.0 / dist);
    gl_PointSize = max(gl_PointSize, 1.0);
  }
`;

const FRAG = `
  varying vec3 vColor;
  varying float vAlpha;

  void main() {
    float d = length(gl_PointCoord - vec2(0.5));
    if (d > 0.5) discard;
    float alpha = vAlpha * smoothstep(0.5, 0.05, d);
    gl_FragColor = vec4(vColor, alpha);
  }
`;

function Particles() {
  const ref = useRef<THREE.Points>(null!);

  const COUNT = 4000;
  const data = useMemo(() => buildParticles(COUNT), []);

  const uniforms = useMemo(() => ({
    uTime: { value: 0 },
    uPixelRatio: { value: typeof window !== "undefined" ? Math.min(window.devicePixelRatio, 2) : 1 },
  }), []);

  const geom = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(data.pos, 3));
    g.setAttribute("color", new THREE.BufferAttribute(data.col, 3));
    g.setAttribute("aSize", new THREE.BufferAttribute(data.sz, 1));
    g.setAttribute("aPhase", new THREE.BufferAttribute(data.ph, 1));
    g.setAttribute("aSpeed", new THREE.BufferAttribute(data.sp, 1));
    return g;
  }, [data]);

  const mat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms,
        vertexShader: VERT,
        fragmentShader: FRAG,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        vertexColors: true,
      }),
    [uniforms],
  );

  useFrame((_, delta) => {
    uniforms.uTime.value += delta;
    if (ref.current) {
      ref.current.rotation.y += delta * 0.08;
      ref.current.rotation.x = Math.sin(uniforms.uTime.value * 0.2) * 0.06;
    }
  });

  return <points ref={ref} geometry={geom} material={mat} />;
}

export default function ParticleEyeCanvas() {
  const onCreated = useCallback((state: { gl: THREE.WebGLRenderer }) => {
    state.gl.setClearColor(0x000000, 0);
  }, []);

  return (
    <Canvas
      camera={{ position: [0, 0, 8], fov: 50 }}
      dpr={[1, 2]}
      gl={{ antialias: true, alpha: true }}
      onCreated={onCreated}
      style={{ background: "transparent" }}
    >
      <Particles />
    </Canvas>
  );
}

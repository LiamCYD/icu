"use client";

import dynamic from "next/dynamic";

const ParticleEyeCanvas = dynamic(() => import("./particle-eye-canvas"), {
  ssr: false,
  loading: () => <div className="absolute inset-0" />,
});

export function ParticleEye() {
  return (
    <div className="absolute inset-0">
      <ParticleEyeCanvas />
    </div>
  );
}

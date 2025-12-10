import { OrbitControls } from "@react-three/drei";
import { Canvas, useLoader } from "@react-three/fiber";
import { useState } from "react";
import * as THREE from "three";

function App() {
  // Nạp ảnh
  const texture = useLoader(THREE.TextureLoader, "/test/CIH08234.JPG");


  return (
    <>
      <div className="h-screen w-full bg-gray-900">

        {/* Toàn bộ không gian 3D */}
        <Canvas camera={{ position: [0, 0, 6] }}>
          {/* Ánh sáng */}
          <ambientLight intensity={1} />

          {/* 🔹 Một mặt phẳng hiển thị ảnh */}
          <mesh position={[0, 0, 5]}>
            {/* Kích thước mặt phẳng */}
            <planeGeometry args={[1, 1]} />
            {/* Dán texture (ảnh) lên mặt phẳng */}
            <meshBasicMaterial map={texture} />
          </mesh>

          <OrbitControls enableZoom={true} />
        </Canvas>
      </div>
    </>
  );
}

export default App;

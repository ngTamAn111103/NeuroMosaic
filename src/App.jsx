// 3D
import { OrbitControls } from "@react-three/drei";
import { Canvas, useLoader } from "@react-three/fiber";
import * as THREE from "three";
// React
import { useState } from "react";
// Data ảnh
import data_images from "../final_structure.json";
// Cấu hình cho từng mode
import config from "../layoutConfig.json";

function ImageMesh({ data }) {
  const texture = useLoader(THREE.TextureLoader, data.thumb_path);
  const [x, y, z] = data.position;

  return (
    // Một mặt phẳng hiển thị ảnh
    <mesh position={[x, y, z]}>
      {/* Kích thước mặt phẳng */}
      <planeGeometry args={[1, 1]} />
      {/* Dán texture (ảnh) lên mặt phẳng */}
      <meshBasicMaterial map={texture} />
    </mesh>
  );
}

function App() {
  // Nạp ảnh

  return (
    <>
      <div className="h-screen w-full bg-gray-900">
        {/* Toàn bộ không gian 3D */}

        <Canvas camera={{ position: [0, 0, 50] }}>
          {/* Ánh sáng */}
          <ambientLight intensity={1} />

          {data_images.map((img) => (
            <ImageMesh key={img.id} data={img} />
          ))}

          <OrbitControls enableZoom={true} />
        </Canvas>
      </div>
    </>
  );
}

export default App;
// TODO: Load các config từ file .json
// TODO: tương tác click vào ảnh

// 3D
import { OrbitControls } from "@react-three/drei";
import { Canvas, useLoader } from "@react-three/fiber";
import * as THREE from "three";
// React
import { useState } from "react";
// Data ảnh
import data_images from "../final_structure.json";
// Cấu hình cho từng mode
import layoutConfig from "../layoutConfig.json";

// Component
import ImageItem from "./components/ImageItem";

function App() {
  // 🔹 State lưu mode hiện tại
  const [currentMode, setCurrentMode] = useState("grid");
  const config = layoutConfig[currentMode];

  return (
    <>
      <div className="h-screen w-full bg-gray-900">
        {/* Toàn bộ không gian 3D */}

        <Canvas camera={{ position: config.cameraPosition }}>
          {/* Ánh sáng */}
          <ambientLight intensity={1} />

          {data_images.map((img) => (
            <ImageItem key={img.id} data={img} />
          ))}

          <OrbitControls
            enableZoom={config.OrbitControlsZoom}
            enablePan={config.OrbitControlsPan}
            enableRotate={config.OrbitControlsRotate}

          />
        </Canvas>
      </div>
    </>
  );
}

export default App;
// TODO: tương tác click vào ảnh

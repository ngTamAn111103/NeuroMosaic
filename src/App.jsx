// 3D
import { OrbitControls, Stars } from "@react-three/drei";
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
import UIOverlay from "./components/UIOverlay";

function App() {
  // State lưu mode hiện tại
  const [currentMode, setCurrentMode] = useState("grid");
  const config = layoutConfig[currentMode];

  // State lưu số lượng ảnh hiện tại
  const [imageCount, setImageCount] = useState(20);

  return (
    <>
      <div className="relative h-screen w-full overflow-hidden bg-gray-900">
        {/* 🔹 UI Overlay */}
        <UIOverlay
          currentLayout={currentMode}
          setLayout={setCurrentMode}
          imageCount={imageCount}
          setImageCount={setImageCount}
          min={20}
          max={Math.min(200, data_images.length)}
        />
        {/* Toàn bộ không gian 3D */}

        <Canvas
          camera={{ position: config.cameraPosition, fov: config.cameraFov }}
        >
          {/* Ánh sáng */}
          <ambientLight intensity={1} />
          <Stars
            radius={100}
            depth={100}
            count={3000}
            factor={3}
            saturation={1}
            fade
            speed={0.5}
          />
          {data_images.slice(0, imageCount).map((img) => (
            <ImageItem key={img.id} data={img} />
          ))}

          <OrbitControls
            enableZoom={config.OrbitControlsZoom}
            enablePan={config.OrbitControlsPan}
            panSpeed={config.OrbitControlSpanSpeed}
            enableRotate={config.OrbitControlsRotate}
          />
        </Canvas>
      </div>
    </>
  );
}

export default App;
// TODO: tương tác click vào ảnh
// TODO: Đổi mode
// TODO:

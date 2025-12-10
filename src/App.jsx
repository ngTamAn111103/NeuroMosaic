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

function App() {
  // 🔹 State lưu mode hiện tại
  const [currentMode, setCurrentMode] = useState("grid");
  const config = layoutConfig[currentMode];

  return (
    <>
      <div className="h-screen w-full bg-black">
        {/* Toàn bộ không gian 3D */}

        <Canvas camera={{ position: config.cameraPosition, fov:config.cameraFov }} >
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
          {data_images.map((img) => (
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

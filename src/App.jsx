// 3D
import { OrbitControls, Stars } from "@react-three/drei";
import { Canvas, useLoader } from "@react-three/fiber";
import * as THREE from "three";
// React
import { useEffect, useRef, useState } from "react";
// Data ảnh
import data_images from "../final_structure.json";
// Cấu hình cho từng mode
import layoutConfig from "../layoutConfig.json";

// Component
import ImageItem from "./components/ImageItem";
import UIOverlay from "./components/UIOverlay";

// Step tăng giảm số lượng
const STEP_IMAGE = 5;

function App() {
  // State lưu mode hiện tại
  const [currentMode, setCurrentMode] = useState("grid");
  const config = layoutConfig[currentMode];

  // State lưu số lượng ảnh hiện tại
  const [imageCount, setImageCount] = useState(20);
  // Giới hạn số lượng ảnh hiển thị
  const visibleImages = data_images.slice(0, imageCount);
  // Có đang load ảnh của step tiếp theo không
  const [isLoadingNextBatch, setIsLoadingNextBatch] = useState(false);
  // Lưu cache + neo cho ImageItem để không phải chớp tắt
  const textureCache = useRef({});

  // Load trước số ảnh step cho bước tiếp theo
  useEffect(() => {
    const preloadNextBatch = async () => {
      setIsLoadingNextBatch(true);
      const next = data_images.slice(imageCount, imageCount + STEP_IMAGE);
      const loader = new THREE.TextureLoader();

      await Promise.all(
        next.map(
          (img) =>
            new Promise((resolve) => {
              // Nếu đã cache rồi thì bỏ qua
              if (textureCache.current[img.thumb_path]) return resolve();

              const loader = new THREE.TextureLoader();
              loader.load(
                img.thumb_path,
                (tex) => {
                  textureCache.current[img.thumb_path] = tex;
                  resolve();
                },
                undefined,
                resolve,
              );
            }),
        ),
      );

      setIsLoadingNextBatch(false);
    };

    preloadNextBatch();
  }, [imageCount]);

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
          step={STEP_IMAGE}
          isLoadingNextBatch={isLoadingNextBatch}
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
          {visibleImages.map((img) => (
            <ImageItem
              key={img.id}
              data={img}
              textureCache={textureCache.current}
            />
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
// TODO: Xử lý ảnh chớp tắt

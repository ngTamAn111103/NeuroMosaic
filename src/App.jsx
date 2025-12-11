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
import AnimatedCamera from "./components/AnimatedCamera";

// Step tăng giảm số lượng
const STEP_IMAGE = 20;

function App() {
  // State lưu mode hiện tại
  const [currentMode, setCurrentMode] = useState("grid");
  // Camera đã bay xong khi vừa mới reload trang chưa?
  const [isIntroDone, setIsIntroDone] = useState(false);
  // Lấy cấu hình
  const config = layoutConfig[currentMode];

  // State lưu số lượng ảnh hiện tại
  const [imageCount, setImageCount] = useState(20);
  // Danh sách ảnh render thực tế
  const visibleImages = data_images.slice(0, imageCount);
  // Có đang load ảnh của step tiếp theo không
  const [isLoadingNextBatch, setIsLoadingNextBatch] = useState(false);
  // Bộ nhớ cache cho ảnh
  const textureCache = useRef({});

  // Lưu ảnh nào đang được click
  const [selectedImage, setSelectedImage] = useState(null);

  // Load trước số ảnh step cho bước tiếp theo
  useEffect(() => {
    const preloadNextBatch = async () => {
      setIsLoadingNextBatch(true); // Cập nhật trạng thái để khoá nút tăng

      // Cắt ra STEP_IMAGE ảnh tiếp theo
      const next = data_images.slice(imageCount, imageCount + STEP_IMAGE);
      // Chuẩn bị TextureLoader
      const loader = new THREE.TextureLoader();

      // Promise.all: Chờ tất cả ảnh bên trong hoàn tất mới đi tiếp
      await Promise.all(
        // Duyệt từng ảnh trong next
        next.map(
          (img) =>
            // Tạo ra Promise con
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
  }, [imageCount]); // imageCount tăng giảm đều gọi hàm này

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
          {/* Camera di chuyển từ xa đến lúc reload trang */}
          <AnimatedCamera
            targetPosition={config.cameraPosition}
            isIntroDone={isIntroDone}
            setIsIntroDone={setIsIntroDone}
          />
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
              setSelectedImage={setSelectedImage}
              config={config}
            />
          ))}

          <OrbitControls
            enableZoom={isIntroDone?config.OrbitControlsZoom: false}
            enablePan={isIntroDone?config.OrbitControlsPan:false}
            panSpeed={config.OrbitControlSpanSpeed}
            enableRotate={isIntroDone?config.OrbitControlsRotate:false}
          />
        </Canvas>
        {selectedImage && (
          <div
            className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
            onClick={() => setSelectedImage(null)} // click nền để tắt
          >
            <img
              src={selectedImage.highress_path || selectedImage.thumb_path}
              alt={selectedImage.highress_path}
              className="max-h-[90vh] max-w-[90vw] rounded-lg shadow-2xl"
              onClick={(e) => e.stopPropagation()} // chặn click xuyên qua ảnh
            />
          </div>
        )}
      </div>
    </>
  );
}

export default App;
// TODO: Đổi mode
// TODO: Ở layout bên trong quả cầu, đừng xây dựng hình tròn bán kính R, mà hãy làm cong ở góc FOV thôi
// TODO: Tách layout Sphere ra 2 mode, quả cầu nhìn từ ngoài và và hình cong FOV

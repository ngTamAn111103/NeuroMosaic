// 3D
import { useLoader } from "@react-three/fiber";
import * as THREE from "three";
// React
import { useState } from "react";

function ImageItem({ data, textureCache, setSelectedImage, config }) {
  // Kiểm tra và lấy ra data.thumb_path từ textureCache truyền vào
  const cached = textureCache?.[data.thumb_path];
  // Nếu cached có -> Sử dụng cached
  // Nếu không có -> load lại từng ảnh từ data.thumb_path
  const texture = cached || useLoader(THREE.TextureLoader, data.thumb_path);

  // Lấy vị trí
  const [x, y, z] = data.position;

  return (
    // Một mặt phẳng hiển thị ảnh
    <mesh
      position={[x, y, z]}
      onPointerDown={(e) => {
        // Chỉ click chuột trái mới hiển thị ảnh
        if (e.button !== 0) return;
        e.stopPropagation(); // tránh click xuyên ra nền
        setSelectedImage(data);
        console.log("Click ảnh:", data.id);
      }}
    >
      {/* Kích thước mặt phẳng */}
      <planeGeometry args={config.planeGeometry_args} />
      {/* Dán texture (ảnh) lên mặt phẳng */}
      <meshBasicMaterial map={texture} />
    </mesh>
  );
}

export default ImageItem;

// TODO: Cần bỏ tính năng hover đi

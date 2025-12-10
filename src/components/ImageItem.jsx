// 3D
import { useLoader } from "@react-three/fiber";
import * as THREE from "three";
// React
import { useState } from "react";

function ImageItem({ data }) {
  // Nạp ảnh
  const texture = useLoader(THREE.TextureLoader, data.thumb_path);
  // Lấy vị trí
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

export default ImageItem;

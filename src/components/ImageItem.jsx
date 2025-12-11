// 3D
import { useFrame, useLoader } from "@react-three/fiber";
import * as THREE from "three";
// React
import { useLayoutEffect, useRef, useState } from "react";

function ImageItem({ data, textureCache, setSelectedImage, config }) {
  const meshRef = useRef(); // Điều khiển phần xác position, scale, rotation, ...
  const materialRef = useRef(); // Điều khiển phần hồn opacity, transparent,...

  // Kiểm tra và lấy ra data.thumb_path từ textureCache truyền vào
  const cached = textureCache?.[data.thumb_path];
  // Nếu cached có -> Sử dụng cached
  // Nếu không có -> load lại từng ảnh từ data.thumb_path
  const texture = cached || useLoader(THREE.TextureLoader, data.thumb_path);

  // Lấy vị trí
  // const [x, y, z] = data.position;
  const target = new THREE.Vector3(...data.position);

  // Hàm chạy trước khi ảnh được sinh ra
  useLayoutEffect(() => {
    if (meshRef.current) {
      meshRef.current.position.set(0, 0, 0); // bắt đầu từ tâm
    }
    if (materialRef.current) {
      materialRef.current.opacity = 0; // ban đầu trong suốt
      materialRef.current.transparent = true;
    }
  }, []);

  // Chạy 60 lần/s
  useFrame((state, delta) => {
    if (!meshRef.current || !materialRef.current) return;

    // Khi reload trang, các ảnh sẽ bay từ tâm ra position + opacity 0 -> 1
    {
      // damp(a, b, λ, dt): Làm mượt giá trị từ a → b, càng gần càng chậm (giống easing-out).
      meshRef.current.position.x = THREE.MathUtils.damp(
        meshRef.current.position.x,
        target.x,
        2, // tốc độ
        delta,
      );
      meshRef.current.position.y = THREE.MathUtils.damp(
        meshRef.current.position.y,
        target.y,
        2,
        delta,
      );
      meshRef.current.position.z = THREE.MathUtils.damp(
        meshRef.current.position.z,
        target.z,
        2,
        delta,
      );
      // Fade in opacity
      materialRef.current.opacity = THREE.MathUtils.damp(
        materialRef.current.opacity,
        1,
        1,
        delta,
      );
    }
  });
  useFrame(({ camera }) => {
    if (meshRef.current) {
      // Hiệu ứng billboarding (mặt phẳng của ảnh luôn quay về phía camera)
      meshRef.current.lookAt(camera.position);
    }
  });

  return (
    // Một mặt phẳng hiển thị ảnh
    <mesh
      ref={meshRef}
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
      <meshBasicMaterial ref={materialRef} map={texture} />
    </mesh>
  );
}

export default ImageItem;

// TODO: Cần xây dựng thêm tính năng khi giảm ảnh thì đi về 000 rồi mới mất

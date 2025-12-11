// Hàm này chịu trách nhiệm khi reload trang, camera bay từ xa đến config.cameraPosition
import React from "react";
import { useThree, useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useEffect, useRef } from "react";
import { damp } from "three/src/math/MathUtils.js";

function AnimatedCamera({
  targetPosition, // Vị trí cấu hình trong config
  speed = 0.05, // Tốc độ bay đồng đều của lefp
  isIntroDone, // Đã bay xong chưa
  setIsIntroDone,
}) {
  const { camera } = useThree();
  const target = useRef(new THREE.Vector3(...targetPosition));

  // Đặt vị trí ban đầu của camera ở xa
  useEffect(() => {
    camera.position.set(
      targetPosition[0] + 0,
      targetPosition[1] + 0,
      targetPosition[2] + 50, // Cách xa 50 đơn vị
    );
    camera.lookAt(0, 0, 0); // nhìn về tâm
  }, [targetPosition, camera]);

  useFrame((state, delta) => {
    if (!isIntroDone) {
      // Nội suy mượt đến targetPosition
      camera.position.lerp(target.current, speed);
      // camera.position.x = damp(camera.position.x, target.current.x, 1.5, delta);
      // camera.position.y = damp(camera.position.y, target.current.y, 1.5, delta);
      // camera.position.z = damp(camera.position.z, target.current.z, 1.5, delta);

      // Khi còn cách rất nhỏ thì dừng lại (đỡ rung)
      // 0.1 là phù hợp để tránh tốc độ cuối quá lâu
      if (camera.position.distanceTo(target.current) < 0.1) {
        // Lấy vị trí hiện tại (target.current) ghi đè lên camera.position luôn
        // Sai số có thể là < 0.1
        camera.position.copy(target.current);
        // Đã bay xong
        setIsIntroDone(true);
      }
    }
  });

  return null;
}

export default AnimatedCamera;

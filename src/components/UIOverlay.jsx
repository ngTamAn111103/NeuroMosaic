import React, { useState } from "react";

// Danh sách Layout (Bạn có thể thêm thoải mái vào đây sau này)
const LAYOUTS = [
  { id: "sphere", label: "Sphere", desc: "Cấu trúc hình cầu", icon: "🌍" },
  { id: "circle", label: "Circle", desc: "Vòng tròn đơn/Cưỡi ngựa xem hoa", icon: "⭕" },
  { id: "cone", label: "Cone", desc: "Hình nón xoắn", icon: "🍦" },
  { id: "grid", label: "Grid Wall", desc: "Tường phẳng", icon: "🧱" },
  { id: "spiral", label: "Spiral", desc: "Xoắn ốc vô cực", icon: "🌀" },
  { id: "random", label: "Chaos", desc: "Ngẫu nhiên", icon: "🎲" },
];

const UIOverlay = ({
  currentLayout = "circle",
  setLayout,
  imageCount = 20,
  setImageCount,
  min = 20,
  max = 1000,
  step = 10,
}) => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  // Tìm thông tin layout hiện tại để hiển thị
  const activeLayout =
    LAYOUTS.find((l) => l.id === currentLayout) || LAYOUTS[0];

  const handleAdjustCount = (amount) => {
    const targetValue = imageCount + amount;
    const clampedValue = Math.min(Math.max(targetValue, min), max);
    setImageCount(clampedValue);
  };

  return (
    // Container chính: Góc Trái - Trên
    <div
      className="absolute top-6 left-6 z-50 flex w-80 flex-col gap-4 text-white"
      onPointerDown={(e) => e.stopPropagation()} // Chặn click xuyên thấu
    >
      {/* --- PANEL CHÍNH --- */}
      <div className="overflow-hidden rounded-2xl border border-white/10 bg-gray-900/80 shadow-2xl backdrop-blur-xl transition-all duration-300">
        {/* 1. Header: Tên dự án */}
        <div className="border-b border-white/5 bg-gradient-to-r from-white/5 to-transparent p-5">
          <h1 className="bg-gradient-to-r from-cyan-400 to-purple-500 bg-clip-text text-2xl font-bold tracking-tight text-transparent">
            NEUROMOSAIC
          </h1>
          <p className="mt-1 text-[10px] tracking-[0.2em] text-gray-400 uppercase">
            Immersive Data Visualizer
          </p>
        </div>

        <div className="space-y-6 p-5">
          {/* 2. Layout Selector (Dropdown) */}
          <div className="relative">
            <label className="mb-2 block text-xs font-bold tracking-wider text-gray-500 uppercase">
              Layout Mode
            </label>

            {/* Nút bấm mở Menu */}
            <button
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="group flex w-full items-center justify-between rounded-xl border border-white/10 bg-white/5 p-3 transition-all hover:bg-white/10"
            >
              <div className="flex items-center gap-3">
                <span className="text-xl">{activeLayout.icon}</span>
                <div className="text-left">
                  <div className="text-sm font-bold text-gray-200 group-hover:text-white">
                    {activeLayout.label}
                  </div>
                  <div className="text-[10px] text-gray-500">
                    {activeLayout.desc}
                  </div>
                </div>
              </div>

              {/* Mũi tên xoay */}
              <svg
                className={`h-5 w-5 text-gray-500 transition-transform duration-300 ${isDropdownOpen ? "rotate-180" : ""}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </button>

            {/* Danh sách thả xuống (Collapsible) */}
            <div
              className={`mt-2 overflow-hidden rounded-xl border border-white/5 bg-black/40 transition-all duration-300 ease-in-out ${isDropdownOpen ? "max-h-64 py-1 opacity-100" : "max-h-0 opacity-0"} `}
            >
              <div className="custom-scrollbar max-h-64 overflow-y-auto">
                {LAYOUTS.map((layout) => (
                  <button
                    key={layout.id}
                    onClick={() => {
                      setLayout(layout.id);
                      setIsDropdownOpen(false);
                    }}
                    className={`flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm transition-colors ${
                      currentLayout === layout.id
                        ? "bg-cyan-500/20 text-cyan-400"
                        : "text-gray-400 hover:bg-white/5 hover:text-white"
                    } `}
                  >
                    <span>{layout.icon}</span>
                    <span>{layout.label}</span>
                    {currentLayout === layout.id && (
                      <span className="ml-auto text-cyan-400">●</span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* 3. Image Counter Control */}
          <div>
            <div className="mb-2 flex items-end justify-between">
              <label className="text-xs font-bold tracking-wider text-gray-500 uppercase">
                Capacity
              </label>
              <span className="font-mono text-xs text-cyan-400">
                {min} - {max}
              </span>
            </div>

            <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 p-1">
              {/* Nút Giảm */}
              <button
                onClick={() => handleAdjustCount(-step)}
                disabled={imageCount === min}
                className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/5 transition-all hover:bg-white/20 hover:text-red-400 active:scale-95 disabled:opacity-30"
              >
                <svg width="12" height="2" fill="currentColor">
                  <rect width="12" height="2" rx="1" />
                </svg>
              </button>

              {/* Số hiển thị */}
              <div className="flex-1 text-center font-mono text-xl font-bold text-white">
                {imageCount}
              </div>

              {/* Nút Tăng */}
              <button
                onClick={() => handleAdjustCount(step)}
                disabled={imageCount === max}
                className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/5 transition-all hover:bg-white/20 hover:text-green-400 active:scale-95 disabled:opacity-30"
              >
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 12 12"
                  fill="currentColor"
                >
                  <path d="M5 5V1a1 1 0 0 1 2 0v4h4a1 1 0 0 1 0 2H7v4a1 1 0 0 1-2 0V7H1a1 1 0 0 1 0-2h4z" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* Footer trang trí */}
        <div className="h-1 w-full bg-gradient-to-r from-cyan-500 via-purple-500 to-cyan-500 opacity-50"></div>
      </div>
    </div>
  );
};

export default UIOverlay;

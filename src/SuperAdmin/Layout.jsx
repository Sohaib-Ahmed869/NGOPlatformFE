import React from "react";
import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";

const V = {
  bg: "#F7F4FB", line: "rgba(28,15,55,.08)",
};

const css = `
.sa-page h1,.sa-page h2,.sa-page h3,.sa-page h4,.sa-page h5,.sa-page h6{font-family:'Space Grotesk',system-ui,sans-serif!important}
`;

export default function SuperAdminLayout() {
  return (
    <div className="sa-page flex h-screen" style={{ fontFamily: "'Space Grotesk', system-ui, sans-serif", background: V.bg }}>
      <style>{css}</style>
      {/* Ambient grid */}
      <div style={{
        position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0,
        backgroundImage: "linear-gradient(rgba(15,23,42,.04) 1px, transparent 1px), linear-gradient(90deg, rgba(15,23,42,.04) 1px, transparent 1px)",
        backgroundSize: "64px 64px",
        maskImage: "radial-gradient(ellipse at 50% 0%, black 30%, transparent 80%)",
        WebkitMaskImage: "radial-gradient(ellipse at 50% 0%, black 30%, transparent 80%)",
      }} />
      <Sidebar />
      <main className="relative z-[1] flex-1 overflow-y-auto p-8">
        <Outlet />
      </main>
    </div>
  );
}

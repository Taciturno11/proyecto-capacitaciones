import React from "react";

export default function AvatarConMarco() {
  return (
    <div style={{
      position: "relative",
      width: 120,
      height: 120,
      display: "inline-block"
    }}>
      <img
        src="/partner.svg"
        alt="Avatar"
        style={{
          width: "100%",
          height: "100%",
          borderRadius: "50%",
          objectFit: "cover",
          position: "absolute",
          top: 0,
          left: 0,
          zIndex: 1
        }}
      />
      <img
        src="/marcos/marco2.png"
        alt="Marco"
        style={{
          width: "140px",
          height: "140px",
          position: "absolute",
          top: "-10px",
          left: "-10px",
          zIndex: 3,
          pointerEvents: "none"
        }}
      />
    </div>
  );
} 
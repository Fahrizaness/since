// src/components/Logo.tsx
import React from 'react';

interface LogoProps {
  size?: number;
}

export const Logo: React.FC<LogoProps> = ({ size = 28 }) => {
  return (
    <svg 
      width={size} 
      height={size} 
      viewBox="0 0 100 100" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
      style={{ filter: 'drop-shadow(0 4px 8px rgba(79, 124, 255, 0.25))' }}
    >
      <defs>
        <linearGradient id="logo-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#4F7CFF" />
          <stop offset="100%" stopColor="#7C4DFF" />
        </linearGradient>
      </defs>
      
      {/* Spiral Waktu melambangkan Timeline / Jurnal Waktu ("S" shape) */}
      <path 
        d="M50 15C30.67 15 15 30.67 15 50C15 69.33 30.67 85 50 85C66.5 85 80.25 73.55 83.95 58C84.35 56.3 83.1 54.75 81.35 54.75C79.9 54.75 78.7 55.8 78.4 57.2C75.25 70.3 63.75 80 50 80C33.43 80 20 66.57 20 50C20 33.43 33.43 20 50 20C63.75 20 75.25 29.7 78.4 42.8C78.7 44.2 79.9 45.25 81.35 45.25C83.1 45.25 84.35 43.7 83.95 42C80.25 26.45 66.5 15 50 15Z" 
        fill="url(#logo-gradient)" 
      />
      
      {/* Milestone Dot di pusat (Glow Center) */}
      <circle cx="50" cy="50" r="10" fill="#ffffff" />
      <circle cx="50" cy="50" r="10" fill="url(#logo-gradient)" opacity="0.8" />
      
      {/* Lapisan Ring Luar Berdenyut */}
      <circle 
        cx="50" 
        cy="50" 
        r="15" 
        stroke="#ffffff" 
        strokeWidth="1.5" 
        opacity="0.5" 
        style={{ 
          transformOrigin: 'center',
          animation: 'pulseSlow 3s infinite ease-in-out' 
        }} 
      />
    </svg>
  );
};

export default Logo;

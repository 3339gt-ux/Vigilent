'use client';

import React from 'react';

interface LumenLogoProps {
  variant?: 'dark' | 'light' | 'midtone' | 'auto';
  iconOnly?: boolean;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  height?: number;
}

export default function LumenLogo({
  variant = 'auto',
  iconOnly = false,
  size = 'md',
  className = '',
  height
}: LumenLogoProps) {
  // Map size keys to heights
  const heightMap = {
    sm: 24,
    md: 36,
    lg: 48,
    xl: 64
  };
  
  const currentHeight = height || heightMap[size];
  const currentWidth = iconOnly ? currentHeight : Math.round(currentHeight * 3.2);

  // 24 spokes at 15° increments (0° corresponds to 12 o'clock / pointing straight up)
  const spokes = Array.from({ length: 24 }).map((_, i) => {
    const angle = (i * 15 - 90) * Math.PI / 180;
    const isLong = i % 2 === 0;
    const rStart = 20;
    const rEnd = isLong ? 40 : 30;
    
    const x1 = 50 + rStart * Math.cos(angle);
    const y1 = 50 + rStart * Math.sin(angle);
    const x2 = 50 + rEnd * Math.cos(angle);
    const y2 = 50 + rEnd * Math.sin(angle);

    // Compute stroke colors
    let strokeColor = '';
    
    if (variant === 'midtone') {
      // Midtone: soft silver/grey gradient
      // Brightest at top-left (~i=21), darkest at bottom-right (~i=9)
      const distFromTopLeft = Math.min(Math.abs(i - 21), 24 - Math.abs(i - 21));
      const lightness = 95 - (distFromTopLeft / 12) * 55;
      strokeColor = `hsl(0, 0%, ${lightness}%)`;
    } else {
      // Vibrant blue/violet gradient for auto, dark, light
      let hue = 215;
      if (i >= 0 && i < 6) {
        hue = 215 + (i / 6) * 60;
      } else if (i >= 6 && i < 12) {
        hue = 275 - ((i - 6) / 6) * 30;
      } else if (i >= 12 && i < 18) {
        hue = 245 - ((i - 12) / 6) * 50;
      } else {
        hue = 195 + ((i - 18) / 6) * 20;
      }
      strokeColor = `hsl(${Math.round(hue)}, 95%, 55%)`;
    }

    return { x1, y1, x2, y2, strokeColor };
  });

  // Determine text and accent bar colors
  let textColor = '#ffffff';
  let accentBarColor = 'rgb(168, 85, 247)'; // violet
  
  if (variant === 'light') {
    textColor = '#0b0f19'; // dark navy/charcoal
  } else if (variant === 'midtone') {
    textColor = '#ffffff'; // white
    accentBarColor = 'rgb(203, 213, 225)'; // silver/slate-300
  } else if (variant === 'auto') {
    // Under auto, we let Tailwind CSS custom classes color the text (e.g. fill-current)
    textColor = 'currentColor';
  }

  return (
    <div className={`inline-flex items-center select-none ${className}`} style={{ height: currentHeight }}>
      {iconOnly ? (
        <svg 
          viewBox="0 0 100 100" 
          width={currentWidth} 
          height={currentHeight}
          fill="none" 
          xmlns="http://www.w3.org/2000/svg"
          className="overflow-visible"
        >
          <g strokeLinecap="round" strokeWidth="4.5">
            {spokes.map((spoke, idx) => (
              <line 
                key={idx}
                x1={spoke.x1.toFixed(2)}
                y1={spoke.y1.toFixed(2)}
                x2={spoke.x2.toFixed(2)}
                y2={spoke.y2.toFixed(2)}
                stroke={spoke.strokeColor}
              />
            ))}
          </g>
        </svg>
      ) : (
        <svg 
          viewBox="0 0 320 100" 
          width={currentWidth} 
          height={currentHeight}
          fill="none" 
          xmlns="http://www.w3.org/2000/svg"
          className="overflow-visible"
        >
          {/* Sunburst Icon */}
          <g strokeLinecap="round" strokeWidth="4.5">
            {spokes.map((spoke, idx) => (
              <line 
                key={idx}
                x1={spoke.x1.toFixed(2)}
                y1={spoke.y1.toFixed(2)}
                x2={spoke.x2.toFixed(2)}
                y2={spoke.y2.toFixed(2)}
                stroke={spoke.strokeColor}
              />
            ))}
          </g>
          
          {/* Wordmark LUMÉN */}
          <g 
            fontSize="32" 
            fontWeight="700" 
            fontFamily="system-ui, -apple-system, sans-serif"
            letterSpacing="0.1em"
            fill={textColor}
          >
            <text x="120" y="64">L</text>
            <text x="148" y="64">U</text>
            <text x="186" y="64">M</text>
            <text x="226" y="64">E</text>
            <text x="264" y="64">N</text>
          </g>
          
          {/* Custom tilted accent bar above the letter E (x=226) */}
          <line 
            x1="233" 
            y1="32" 
            x2="249" 
            y2="25" 
            stroke={accentBarColor} 
            strokeWidth="4" 
            strokeLinecap="round" 
          />
        </svg>
      )}
    </div>
  );
}

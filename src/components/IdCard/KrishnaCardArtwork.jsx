import React from 'react';

/**
 * KrishnaCardArtwork
 * Renders the authentic, graceful devotional painting of Lord Sri Krishna in Pichwai style,
 * playing the flute (Bansuri) with his peacock-feather Mukut and serene lotus eyes.
 * Framed in antique gold (#D4AF37) with subtle devotional depth.
 */
export const KrishnaCardArtwork = ({ 
  width = 135, 
  height = 150, 
  className = "",
  style = {} 
}) => {
  return (
    <div
      className={className}
      style={{
        width: typeof width === 'number' ? `${width}px` : width,
        height: typeof height === 'number' ? `${height}px` : height,
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        ...style
      }}
      title="Lord Sri Krishna with Calf"
    >
      <img
        src="/krishna_bal_transparent.png"
        alt="Lord Sri Krishna Playing Flute with Calf"
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'contain',
          objectPosition: 'center',
          display: 'block',
          imageRendering: '-webkit-optimize-contrast',
          filter: 'drop-shadow(0 3px 6px rgba(27, 67, 50, 0.16))'
        }}
      />
    </div>
  );
};

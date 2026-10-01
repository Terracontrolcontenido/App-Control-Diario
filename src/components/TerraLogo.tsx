import React, { useState, useEffect } from 'react';
import { getCurrentLogo, subscribeToLogo } from '../services/logoService';

interface TerraLogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export const TerraLogo: React.FC<TerraLogoProps> = ({
  className = '',
  size = 'md',
}) => {
  const [logoSrc, setLogoSrc] = useState<string>(getCurrentLogo());

  useEffect(() => {
    const unsub = subscribeToLogo((url) => {
      setLogoSrc(url);
    });
    return () => unsub();
  }, []);

  // Dimensions based on size
  const heightClasses =
    size === 'sm'
      ? 'h-16 max-w-[160px]'
      : size === 'lg'
      ? 'h-28 max-w-[280px]'
      : size === 'xl'
      ? 'h-36 max-w-[340px]'
      : 'h-22 max-w-[220px]';

  return (
    <div className={`relative flex flex-col items-center justify-center select-none ${className}`}>
      {/* Official PNG Logo Image (Permanent, 100% proportional, zero distortion) */}
      <div className={`relative flex items-center justify-center ${heightClasses}`}>
        <img
          src={logoSrc}
          alt="Terra Colchones & Muebles"
          className="w-auto h-full object-contain drop-shadow-2xs"
          onError={(e) => {
            const target = e.currentTarget;
            if (target.src !== '/icon.svg') {
              target.src = '/icon.svg';
            }
          }}
        />
      </div>
    </div>
  );
};

import React, { useState } from 'react';

interface PrivacyWrapperProps {
  isPrivate: boolean;
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

export const PrivacyWrapper: React.FC<PrivacyWrapperProps> = ({
  isPrivate,
  children,
  className = '',
  style = {}
}) => {
  const [isRevealed, setIsRevealed] = useState(false);

  if (!isPrivate) {
    return <span className={className} style={style}>{children}</span>;
  }

  const handleReveal = (e: React.SyntheticEvent) => {
    // Mencegah trigger event klik default
    e.stopPropagation();
    setIsRevealed(true);
  };

  const handleHide = (e: React.SyntheticEvent) => {
    e.stopPropagation();
    setIsRevealed(false);
  };

  return (
    <span
      className={`private-blur ${isRevealed ? 'revealed' : ''} ${className}`}
      style={{
        ...style,
        cursor: isRevealed ? 'default' : 'help',
      }}
      onMouseDown={handleReveal}
      onMouseUp={handleHide}
      onMouseLeave={handleHide}
      onTouchStart={(e) => {
        // Mencegah menu konteks bawaan mobile (salin teks) muncul saat ditahan
        if (e.cancelable) {
          e.preventDefault();
        }
        handleReveal(e);
      }}
      onTouchEnd={handleHide}
      onTouchCancel={handleHide}
      title={isRevealed ? "" : "Tekan dan tahan untuk melihat data privat"}
    >
      {children}
    </span>
  );
};
export default PrivacyWrapper;

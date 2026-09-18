import React from 'react';

/**
 * RaccoonIcon (Mapache ITST)
 * Silueta y rostro del mapache, mascota institucional del ITST.
 */
export default function RaccoonIcon({ size = 24, color = 'currentColor', className = '', style = {} }) {
  return (
    <svg 
      width={size} 
      height={size} 
      viewBox="0 0 24 24" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={{ display: 'inline-block', verticalAlign: 'middle', flexShrink: 0, ...style }}
    >
      {/* Orejas exteriores */}
      <path 
        d="M4.2 3.8C4.2 3.8 2.6 6.6 3.6 9.4L6.4 8.2C5.9 6.2 5.3 4.6 4.2 3.8Z" 
        fill={color} 
      />
      <path 
        d="M19.8 3.8C19.8 3.8 21.4 6.6 20.4 9.4L17.6 8.2C18.1 6.2 18.7 4.6 19.8 3.8Z" 
        fill={color} 
      />
      
      {/* Interior de las orejas (blanco/luz) */}
      <path 
        d="M5 5.4C4.8 6.5 4.8 7.5 5.4 8.2L6.3 7.8C6 6.8 5.6 6 5 5.4Z" 
        fill="white" 
        opacity="0.85" 
      />
      <path 
        d="M19 5.4C19.2 6.5 19.2 7.5 18.6 8.2L17.7 7.8C18 6.8 18.4 6 19 5.4Z" 
        fill="white" 
        opacity="0.85" 
      />
      
      {/* Cabeza / Silueta completa con mejillas características */}
      <path 
        d="M12 4.5C8 4.5 5.8 7 5.5 10C5.2 13 2.8 14.5 2.8 15.8C2.8 17.5 4.5 18.5 7 19C8.5 20.2 10.2 20.8 12 20.8C13.8 20.8 15.5 20.2 17 19C19.5 18.5 21.2 17.5 21.2 15.8C21.2 14.5 18.8 13 18.5 10C18.2 7 16 4.5 12 4.5Z" 
        fill={color} 
      />
      
      {/* Pelaje blanco lateral en las mejillas */}
      <path 
        d="M3.2 15.8C3.2 17 4.6 17.9 6.8 18.3C5.5 17 4.8 15.5 5.3 14C4 14.5 3.2 15.1 3.2 15.8Z" 
        fill="white" 
        opacity="0.9" 
      />
      <path 
        d="M20.8 15.8C20.8 17 19.4 17.9 17.2 18.3C18.5 17 19.2 15.5 18.7 14C20 14.5 20.8 15.1 20.8 15.8Z" 
        fill="white" 
        opacity="0.9" 
      />

      {/* Antifaz negro característico del mapache */}
      <path 
        d="M5.2 13.2C6 11.5 8.2 10.8 10.6 12L12 12.8L13.4 12C15.8 10.8 18 11.5 18.8 13.2C19.4 14.6 18.4 15.8 16.8 15.8C14.8 15.8 13.6 14.4 12 14.4C10.4 14.4 9.2 15.8 7.2 15.8C5.6 15.8 4.6 14.6 5.2 13.2Z" 
        fill="#0f172a" 
      />
      
      {/* Ojos brillantes */}
      <circle cx="8.6" cy="13.5" r="1.2" fill="white" />
      <circle cx="15.4" cy="13.5" r="1.2" fill="white" />
      <circle cx="8.7" cy="13.5" r="0.6" fill="#090d16" />
      <circle cx="15.3" cy="13.5" r="0.6" fill="#090d16" />
      
      {/* Hocico blanco redondeado */}
      <path 
        d="M12 14.8C10.5 14.8 9.4 15.8 9.4 17.1C9.4 18.6 10.5 19.9 12 19.9C13.5 19.9 14.6 18.6 14.6 17.1C14.6 15.8 13.5 14.8 12 14.8Z" 
        fill="white" 
      />
      
      {/* Naricita triangular oscura */}
      <path 
        d="M12 16.5C11.3 16.5 10.9 17 11.2 17.6L11.7 18.2C11.8 18.4 12.2 18.4 12.3 18.2L12.8 17.6C13.1 17 12.7 16.5 12 16.5Z" 
        fill="#0f172a" 
      />
      
      {/* Línea sutil de la boca */}
      <path 
        d="M12 18.4V19.1M11.3 19.1C11.6 19.3 12 19.3 12 19.3M12.7 19.1C12.4 19.3 12 19.3 12 19.3" 
        stroke="#0f172a" 
        strokeWidth="0.6" 
        strokeLinecap="round" 
      />

      {/* Franja central blanca en la frente */}
      <path 
        d="M12 5.2C11.3 7 11.3 9.2 12 10.8C12.7 9.2 12.7 7 12 5.2Z" 
        fill="white" 
        opacity="0.85" 
      />
    </svg>
  );
}

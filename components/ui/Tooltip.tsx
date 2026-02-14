import React, { useState, useRef, useEffect } from 'react';

interface TooltipProps {
  content: string;
  position?: 'top' | 'bottom' | 'left' | 'right';
  children: React.ReactNode;
  delay?: number;
}

export const Tooltip: React.FC<TooltipProps> = ({ 
  content, 
  position = 'top', 
  children,
  delay = 300 
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout>();

  const showTooltip = () => {
    timeoutRef.current = setTimeout(() => {
      setIsVisible(true);
    }, delay);
  };

  const hideTooltip = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setIsVisible(false);
  };

  const positionClasses = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 -translate-y-1/2 ml-2',
  };

  const arrowClasses = {
    top: 'top-full left-1/2 -translate-x-1/2 border-t-surface-700',
    bottom: 'bottom-full left-1/2 -translate-x-1/2 border-b-surface-700',
    left: 'left-full top-1/2 -translate-y-1/2 border-l-surface-700',
    right: 'right-full top-1/2 -translate-y-1/2 border-r-surface-700',
  };

  return (
    <div 
      className="relative inline-block"
      onMouseEnter={showTooltip}
      onMouseLeave={hideTooltip}
      onFocus={showTooltip}
      onBlur={hideTooltip}
    >
      {children}
      {isVisible && (
        <div 
          className={`absolute z-50 ${positionClasses[position]} animate-fade-in`}
        >
          <div className="px-3 py-2 bg-surface-800 border border-surface-700 rounded-lg shadow-xl text-xs text-surface-200 whitespace-nowrap max-w-xs">
            {content}
          </div>
          <div className={`absolute border-4 transparent ${arrowClasses[position]}`} />
        </div>
      )}
    </div>
  );
};

export const TooltipButton: React.FC<TooltipProps & { onClick?: () => void; disabled?: boolean; className?: string }> = ({ 
  content, 
  position, 
  children, 
  onClick,
  disabled,
  className = ''
}) => {
  return (
    <Tooltip content={content} position={position}>
      <button 
        onClick={onClick} 
        disabled={disabled}
        className={className}
      >
        {children}
      </button>
    </Tooltip>
  );
};

export const TooltipInput: React.FC<TooltipProps & { 
  label?: string;
  error?: string;
  [key: string]: any;
}> = ({ 
  content, 
  position = 'top',
  label,
  error,
  ...props 
}) => {
  return (
    <Tooltip content={content} position={position}>
      <div className="relative">
        {label && (
          <label className="block text-xs font-semibold text-surface-400 mb-2">
            {label}
          </label>
        )}
        <input 
          {...props}
          className={`input ${error ? 'input-error' : ''}`}
        />
        {error && (
          <p className="text-xs text-error mt-1">{error}</p>
        )}
      </div>
    </Tooltip>
  );
};

export default Tooltip;

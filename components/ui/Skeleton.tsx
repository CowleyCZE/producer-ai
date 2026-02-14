import React from 'react';

interface SkeletonProps {
  className?: string;
  variant?: 'text' | 'circular' | 'rectangular';
  width?: string | number;
  height?: string | number;
}

export const Skeleton: React.FC<SkeletonProps> = ({ 
  className = '', 
  variant = 'rectangular',
  width,
  height 
}) => {
  const baseClasses = 'animate-pulse bg-surface-700/50';
  
  const variantClasses = {
    text: 'rounded h-4',
    circular: 'rounded-full',
    rectangular: 'rounded-lg',
  };

  const style: React.CSSProperties = {
    width: width || '100%',
    height: height || (variant === 'text' ? '1rem' : '100%'),
  };

  return (
    <div 
      className={`${baseClasses} ${variantClasses[variant]} ${className}`}
      style={style}
    />
  );
};

export const SkeletonText: React.FC<{ lines?: number; className?: string }> = ({ 
  lines = 3, 
  className = '' 
}) => {
  return (
    <div className={`space-y-3 ${className}`}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton 
          key={i} 
          variant="text" 
          className={i === lines - 1 ? 'w-3/4' : 'w-full'} 
        />
      ))}
    </div>
  );
};

export const SkeletonCard: React.FC<{ className?: string }> = ({ className = '' }) => {
  return (
    <div className={`card p-6 space-y-4 ${className}`}>
      <div className="flex items-center gap-4">
        <Skeleton variant="circular" width={48} height={48} />
        <div className="flex-1 space-y-2">
          <Skeleton variant="text" className="w-1/2" />
          <Skeleton variant="text" className="w-1/3" />
        </div>
      </div>
      <SkeletonText lines={4} />
    </div>
  );
};

export const SkeletonButton: React.FC<{ className?: string }> = ({ className = '' }) => {
  return (
    <Skeleton 
      className={`h-12 rounded-xl ${className}`}
      style={{ width: 160 }}
    />
  );
};

export const SkeletonLyrics: React.FC<{ className?: string }> = ({ className = '' }) => {
  return (
    <div className={`space-y-3 ${className}`}>
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="flex gap-2">
          <Skeleton variant="text" className="w-8 flex-shrink-0" />
          <Skeleton 
            variant="text" 
            className={`flex-1 ${i % 3 === 0 ? 'w-3/4' : 'w-full'}`} 
          />
        </div>
      ))}
    </div>
  );
};

export const SkeletonSegment: React.FC<{ className?: string }> = ({ className = '' }) => {
  return (
    <div className={`card p-4 space-y-3 ${className}`}>
      <div className="flex justify-between items-center">
        <Skeleton variant="text" className="w-1/3" />
        <Skeleton variant="text" className="w-20" />
      </div>
      <Skeleton variant="text" />
      <Skeleton variant="text" className="w-2/3" />
      <div className="flex gap-2 pt-2">
        <Skeleton className="h-8 flex-1 rounded-lg" />
        <Skeleton className="h-8 flex-1 rounded-lg" />
        <Skeleton className="h-8 flex-1 rounded-lg" />
      </div>
    </div>
  );
};

export const SkeletonInput: React.FC<{ className?: string }> = ({ className = '' }) => {
  return (
    <div className={`space-y-2 ${className}`}>
      <Skeleton variant="text" className="w-24" />
      <Skeleton className="h-32 rounded-lg" />
    </div>
  );
};

export const SkeletonProgress: React.FC<{ className?: string }> = ({ className = '' }) => {
  return (
    <div className={`space-y-2 ${className}`}>
      <div className="flex justify-between">
        <Skeleton variant="text" className="w-32" />
        <Skeleton variant="text" className="w-12" />
      </div>
      <Skeleton className="h-2 rounded-full" />
    </div>
  );
};

export const SkeletonWaveform: React.FC<{ className?: string }> = ({ className = '' }) => {
  return (
    <div className={`flex items-center gap-1 h-12 ${className}`}>
      {Array.from({ length: 40 }).map((_, i) => (
        <Skeleton 
          key={i}
          className="w-1 rounded-full"
          style={{ height: `${Math.random() * 80 + 20}%` }}
        />
      ))}
    </div>
  );
};

export default Skeleton;

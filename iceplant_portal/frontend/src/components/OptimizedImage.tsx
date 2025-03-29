import { useState, useEffect, ImgHTMLAttributes } from 'react';
import { Box, Skeleton, SxProps, Theme } from '@mui/material';

interface OptimizedImageProps extends Omit<ImgHTMLAttributes<HTMLImageElement>, 'onLoad' | 'onError' | 'style'> {
  src: string;
  alt: string;
  fallbackSrc?: string;
  width?: number | string;
  height?: number | string;
  loading?: 'lazy' | 'eager';
  sx?: SxProps<Theme>;
  objectFit?: 'cover' | 'contain' | 'fill' | 'none' | 'scale-down';
  showPlaceholder?: boolean;
  placeholderColor?: string;
  imgSx?: SxProps<Theme>;
}

/**
 * Optimized image component with:
 * - Lazy loading
 * - WebP support
 * - Fallback image
 * - Loading skeleton
 * - Responsive sizing
 */
export default function OptimizedImage({
  src,
  alt,
  fallbackSrc,
  width = '100%',
  height = 'auto',
  loading = 'lazy',
  sx = {},
  objectFit = 'cover',
  showPlaceholder = true,
  placeholderColor = 'grey.200',
  imgSx = {},
  ...imgProps
}: OptimizedImageProps) {
  const [imgSrc, setImgSrc] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);

  // Convert to WebP if supported
  useEffect(() => {
    // Check if src already has WebP format
    if (src.toLowerCase().endsWith('.webp') || src.includes('format=webp')) {
      setImgSrc(src);
      return;
    }

    // Support for legacy browsers without WebP
    const img = new Image();
    img.onload = () => {
      setImgSrc(src);
    };
    img.onerror = () => {
      // If WebP fails, use the original source or fallback
      setImgSrc(fallbackSrc || src);
    };
    
    // Try to use WebP version if it's available
    if (src.includes('?')) {
      img.src = `${src}&format=webp`;
    } else {
      img.src = `${src}?format=webp`;
    }
  }, [src, fallbackSrc]);

  const handleLoad = () => {
    setIsLoading(false);
  };

  const handleError = () => {
    setError(true);
    setIsLoading(false);
    if (fallbackSrc && imgSrc !== fallbackSrc) {
      setImgSrc(fallbackSrc);
    }
  };

  const placeholderRatio = typeof height === 'number' && typeof width === 'number'
    ? (height / width) * 100
    : 75;

  return (
    <Box
      sx={{
        position: 'relative',
        width,
        height,
        overflow: 'hidden',
        ...sx,
      }}
    >
      {/* Placeholder */}
      {showPlaceholder && isLoading && (
        <Skeleton 
          variant="rectangular" 
          width="100%" 
          height={height !== 'auto' ? height : 0}
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            bgcolor: placeholderColor,
            paddingTop: height === 'auto' ? `${placeholderRatio}%` : 0,
          }}
        />
      )}

      {/* Image */}
      {imgSrc && (
        <Box
          component="img"
          src={imgSrc}
          alt={alt}
          loading={loading}
          onLoad={handleLoad}
          onError={handleError}
          sx={{
            width: '100%',
            height: '100%',
            objectFit,
            opacity: isLoading ? 0 : 1,
            transition: 'opacity 0.3s ease',
            ...imgSx,
          }}
          {...imgProps}
        />
      )}

      {/* Error state */}
      {error && !isLoading && !fallbackSrc && (
        <Box
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            bgcolor: 'grey.100',
            color: 'text.secondary',
            fontSize: '0.8rem',
            p: 1,
            textAlign: 'center',
          }}
        >
          {alt || 'Image failed to load'}
        </Box>
      )}
    </Box>
  );
} 
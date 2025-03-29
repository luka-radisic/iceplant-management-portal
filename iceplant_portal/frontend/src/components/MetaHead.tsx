import { useEffect } from 'react';

interface MetaHeadProps {
  title?: string;
  description?: string;
  keywords?: string[];
  ogTitle?: string;
  ogDescription?: string;
  ogImage?: string;
  ogUrl?: string;
  ogType?: 'website' | 'article' | 'profile';
  twitterCard?: 'summary' | 'summary_large_image' | 'app' | 'player';
  twitterTitle?: string;
  twitterDescription?: string;
  twitterImage?: string;
  noIndex?: boolean;
  canonicalUrl?: string;
}

/**
 * Component to dynamically set meta tags for SEO
 */
export default function MetaHead({
  title = 'Ice Plant Management Portal',
  description = 'Comprehensive management system for ice plant operations, tracking sales, inventory, attendance, and expenses.',
  keywords = ['ice plant', 'management', 'sales', 'inventory', 'attendance', 'expenses'],
  ogTitle,
  ogDescription,
  ogImage = '/logo.png',
  ogUrl,
  ogType = 'website',
  twitterCard = 'summary_large_image',
  twitterTitle,
  twitterDescription,
  twitterImage,
  noIndex = false,
  canonicalUrl,
}: MetaHeadProps) {
  useEffect(() => {
    // Update document title
    if (title) {
      document.title = title;
    }

    // Helper function to create or update meta tags
    const setMetaTag = (name: string, content: string) => {
      let meta = document.querySelector(`meta[name="${name}"]`) as HTMLMetaElement;
      
      if (!meta) {
        meta = document.createElement('meta');
        meta.name = name;
        document.head.appendChild(meta);
      }
      
      meta.content = content;
    };

    // Helper function for Open Graph tags
    const setOgTag = (property: string, content: string) => {
      let meta = document.querySelector(`meta[property="${property}"]`) as HTMLMetaElement;
      
      if (!meta) {
        meta = document.createElement('meta');
        meta.setAttribute('property', property);
        document.head.appendChild(meta);
      }
      
      meta.content = content;
    };

    // Set basic meta tags
    if (description) {
      setMetaTag('description', description);
    }

    if (keywords && keywords.length > 0) {
      setMetaTag('keywords', keywords.join(', '));
    }

    // Set robots meta tag
    setMetaTag('robots', noIndex ? 'noindex, nofollow' : 'index, follow');

    // Set Open Graph meta tags
    setOgTag('og:title', ogTitle || title);
    setOgTag('og:description', ogDescription || description);
    setOgTag('og:type', ogType);
    
    if (ogImage) {
      setOgTag('og:image', ogImage.startsWith('http') ? ogImage : window.location.origin + ogImage);
    }
    
    if (ogUrl) {
      setOgTag('og:url', ogUrl);
    } else if (canonicalUrl) {
      setOgTag('og:url', canonicalUrl.startsWith('http') ? canonicalUrl : window.location.origin + canonicalUrl);
    } else {
      setOgTag('og:url', window.location.href);
    }

    // Set Twitter Card meta tags
    setMetaTag('twitter:card', twitterCard);
    setMetaTag('twitter:title', twitterTitle || ogTitle || title);
    setMetaTag('twitter:description', twitterDescription || ogDescription || description);
    
    if (twitterImage || ogImage) {
      const imageUrl = twitterImage || ogImage;
      setMetaTag('twitter:image', imageUrl.startsWith('http') ? imageUrl : window.location.origin + imageUrl);
    }

    // Set canonical URL if provided
    let canonicalElement = document.querySelector('link[rel="canonical"]') as HTMLLinkElement;
    
    if (canonicalUrl) {
      if (!canonicalElement) {
        canonicalElement = document.createElement('link');
        canonicalElement.rel = 'canonical';
        document.head.appendChild(canonicalElement);
      }
      canonicalElement.href = canonicalUrl.startsWith('http') 
        ? canonicalUrl 
        : window.location.origin + canonicalUrl;
    } else if (canonicalElement) {
      // Remove canonical tag if it exists and no URL is provided
      canonicalElement.remove();
    }

    // Clean up function
    return () => {
      // No cleanup needed as we want to preserve meta tags between route changes
      // The next page will update them accordingly
    };
  }, [
    title,
    description,
    keywords,
    ogTitle,
    ogDescription,
    ogImage,
    ogUrl,
    ogType,
    twitterCard,
    twitterTitle,
    twitterDescription,
    twitterImage,
    noIndex,
    canonicalUrl
  ]);

  // This component doesn't render anything visible
  return null;
} 
import { useEffect } from 'react';

interface SEOProps {
  title: string;
  description: string;
  url?: string;
  image?: string;
  type?: string;
}

export function useSEO({
  title,
  description,
  url = 'https://app.baristachaw.com',
  image = 'https://app.baristachaw.com/og-image.png',
  type = 'website',
}: SEOProps) {
  useEffect(() => {
    // Standard tags
    document.title = title;
    
    const setMetaTag = (attr: string, key: string, content: string) => {
      let element = document.querySelector(`meta[${attr}="${key}"]`);
      if (!element) {
        element = document.createElement('meta');
        element.setAttribute(attr, key);
        document.head.appendChild(element);
      }
      element.setAttribute('content', content);
    };

    setMetaTag('name', 'description', description);

    // Open Graph
    setMetaTag('property', 'og:title', title);
    setMetaTag('property', 'og:description', description);
    setMetaTag('property', 'og:url', url);
    setMetaTag('property', 'og:image', image);
    setMetaTag('property', 'og:type', type);

    // Twitter Card
    setMetaTag('property', 'twitter:title', title);
    setMetaTag('property', 'twitter:description', description);
    setMetaTag('property', 'twitter:image', image);
    setMetaTag('property', 'twitter:card', 'summary_large_image');
  }, [title, description, url, image, type]);
}

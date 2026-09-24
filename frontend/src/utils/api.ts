let cachedUrl: string | null = null;
let checkPromise: Promise<string> | null = null;

export async function getActiveBaseUrl(): Promise<string> {
  // If we already found a working URL, return it
  if (cachedUrl) return cachedUrl;
  
  // If we are currently checking, wait for that check to finish
  if (checkPromise) return checkPromise;

  checkPromise = (async () => {
    const url1 = process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, '') || '';
    const url2 = process.env.NEXT_PUBLIC_API_BASE_URL_2?.replace(/\/$/, '') || '';

    const checkHealth = async (url: string) => {
      if (!url) return false;
      try {
        // Use a short timeout so we don't wait forever
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3000);
        
        const res = await fetch(`${url}/health`, { 
          method: 'GET', 
          cache: 'no-store',
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        return res.ok;
      } catch (e) {
        return false;
      }
    };

    // Try primary URL first
    if (url1 && await checkHealth(url1)) {
      cachedUrl = url1;
      return url1;
    }
    
    // Try secondary URL if primary fails
    if (url2 && await checkHealth(url2)) {
      cachedUrl = url2;
      return url2;
    }

    // Fallback to url1 if both fail (or if health check route is just missing)
    cachedUrl = url1;
    return url1;
  })();

  try {
    return await checkPromise;
  } finally {
    checkPromise = null;
  }
}

// Function to clear cache if a request fails later
export function invalidateBaseUrlCache() {
  cachedUrl = null;
}

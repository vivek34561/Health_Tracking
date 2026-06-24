export function getExpressUrl(): string {
  if (typeof window !== 'undefined' && 
      (window.location.hostname === 'localhost' || 
       window.location.hostname === '127.0.0.1')) {
    return 'http://localhost:5000';
  }
  return 'https://health-tracking-1-ji8x.onrender.com';
}

export function getFastApiUrl(): string {
  if (typeof window !== 'undefined' && 
      (window.location.hostname === 'localhost' || 
       window.location.hostname === '127.0.0.1')) {
    return 'http://localhost:8000';
  }
  return 'https://health-backend-fastapi.onrender.com';
}

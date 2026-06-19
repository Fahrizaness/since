export function register() {
  if ('serviceWorker' in navigator && import.meta.env.PROD) {
    window.addEventListener('load', () => {
      navigator.serviceWorker
        .register('/sw.js')
        .then((registration) => {
          console.log('Service Worker terdaftar dengan sukses:', registration.scope);
        })
        .catch((error) => {
          console.error('Pendaftaran Service Worker gagal:', error);
        });
    });
  }
}

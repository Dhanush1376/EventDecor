if ('serviceWorker' in navigator) {
  // Forcefully unregister all service workers to kill the aggressive PWA cache
  navigator.serviceWorker.getRegistrations().then(function(registrations) {
    for(let registration of registrations) {
      registration.unregister();
    }
  });
}

export const switchSystem = (currentSystem, navigate) => {
  const host = window.location.hostname.toLowerCase();
  const isDev = host === 'localhost' || host === '127.0.0.1' || host.startsWith('192.168.');
  
  const targetSystem = currentSystem === 'nova' ? 'bravo' : 'nova';
  localStorage.removeItem('selected_system');
  
  if (isDev) {
    // En desarrollo local en localhost/IP, usamos dev_override y recargamos la app
    localStorage.setItem('dev_override', targetSystem);
    navigate('/select-system');
    window.location.reload();
  } else {
    const port = window.location.port ? `:${window.location.port}` : '';
    
    // En producción o con dominios locales personalizados, alternamos el subdominio
    if (host.startsWith('nova.')) {
      const newHost = host.replace(/^nova\./, 'bravo.');
      window.location.href = `${window.location.protocol}//${newHost}${port}/select-system`;
    } else if (host.startsWith('bravo.')) {
      const newHost = host.replace(/^bravo\./, 'nova.');
      window.location.href = `${window.location.protocol}//${newHost}${port}/select-system`;
    } else {
      // Fallback si no tiene subdominio asignado
      const cleanHost = host.replace(/^(admin\.)/, '');
      window.location.href = `${window.location.protocol}//${targetSystem}.${cleanHost}${port}/select-system`;
    }
  }
};

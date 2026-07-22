export const isLocalHost = (host) => {
  if (!host) return false;
  const h = host.toLowerCase();
  if (h === 'localhost' || h === '127.0.0.1') return true;
  if (h.startsWith('192.168.')) return true;
  if (h.startsWith('10.')) return true;
  if (h.startsWith('172.')) {
    const parts = h.split('.');
    if (parts.length === 4) {
      const second = parseInt(parts[1], 10);
      if (second >= 16 && second <= 31) return true;
    }
  }
  if (h.endsWith('.local') || h.endsWith('.lan') || h.endsWith('.home') || h.endsWith('.internal')) return true;
  if (!h.includes('.')) return true;
  return false;
};

export const switchSystem = (currentSystem, navigate) => {
  const host = window.location.hostname.toLowerCase();
  const isDev = isLocalHost(host);
  
  const targetSystem = currentSystem === 'nova' ? 'bravo' : 'nova';
  localStorage.removeItem('selected_system');
  
  if (isDev) {
    // En desarrollo local en localhost/IP, usamos dev_override y recargamos la app
    localStorage.setItem('dev_override', targetSystem);
    navigate('/select-system');
    window.location.reload();
  } else {
    const port = window.location.port ? `:${window.location.port}` : '';
    
    // 1. Manejo de subdominios de administración (admin-nova vs admin-bravo)
    if (host.startsWith('admin-nova.')) {
      window.location.href = `${window.location.protocol}//${host.replace(/^admin-nova\./, 'admin-bravo.')}${port}/select-system`;
      return;
    } else if (host.startsWith('admin-bravo.')) {
      window.location.href = `${window.location.protocol}//${host.replace(/^admin-bravo\./, 'admin-nova.')}${port}/select-system`;
      return;
    }

    // 2. Navegación entre dominios raíz independientes (Nova vs Bravo)
    if (targetSystem === 'bravo' && !host.includes('bravo')) {
      const targetDomain = host.includes('novalogtecnologies') 
        ? 'personalizacionesbravo.com' 
        : `bravo.${host.replace(/^(nova\.|admin\.)/, '')}`;
      window.location.href = `${window.location.protocol}//${targetDomain}${port}/select-system`;
      return;
    } else if (targetSystem === 'nova' && !host.includes('novalogtecnologies')) {
      const targetDomain = host.includes('personalizacionesbravo')
        ? 'novalogtecnologies.com'
        : `nova.${host.replace(/^(bravo\.|admin\.)/, '')}`;
      window.location.href = `${window.location.protocol}//${targetDomain}${port}/select-system`;
      return;
    }

    // 3. Subdominios directos (nova. vs bravo.)
    let newHost = host;
    if (host.startsWith('nova.')) {
      newHost = host.replace(/^nova\./, 'bravo.');
    } else if (host.startsWith('bravo.')) {
      newHost = host.replace(/^bravo\./, 'nova.');
    } else {
      const parts = host.split('.');
      const rootDomain = parts.slice(-2).join('.');
      newHost = `${targetSystem}.${rootDomain}`;
    }
    
    window.location.href = `${window.location.protocol}//${newHost}${port}/select-system`;
  }
};

/**
 * Parsea un error de Axios/FastAPI y retorna un string legible.
 * Evita fallos en React al renderizar arrays de objetos (errores 422 de Pydantic).
 */
export function parseError(err, defaultMessage = 'Ocurrió un error inesperado') {
  if (!err.response) {
    return err.message || defaultMessage;
  }
  
  const detail = err.response?.data?.detail;
  if (!detail) return defaultMessage;
  
  if (typeof detail === 'string') {
    return detail;
  }
  
  if (Array.isArray(detail)) {
    // Si es un error de validación 422 de FastAPI (Pydantic v2)
    return detail
      .map(d => {
        const field = d.loc ? d.loc[d.loc.length - 1] : '';
        return `${field ? field + ': ' : ''}${d.msg}`;
      })
      .join(', ');
  }
  
  return typeof detail === 'object' ? JSON.stringify(detail) : String(detail);
}

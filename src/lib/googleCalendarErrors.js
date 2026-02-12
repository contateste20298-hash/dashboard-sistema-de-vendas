/**
 * Centralized error handling for Google Calendar Integration
 */

export const logCalendarError = (context, error) => {
  const timestamp = new Date().toISOString();
  // Safe logging that won't break if console is restricted
  try {
    console.group(`[Google Calendar Error] - ${context}`);
    console.error('Timestamp:', timestamp);
    console.error('Message:', error.message || 'Unknown error');
    console.error('Status/Code:', error.status || error.code || 'N/A');
    if (error.details) console.error('Details:', error.details);
    console.groupEnd();
  } catch (e) {
    console.error(`[Google Calendar Error] ${context}:`, error);
  }
};

export const handleCalendarIntegrationError = (error, context) => {
  // 1. Log the error for debugging
  logCalendarError(context, error);

  const errString = (error.message || JSON.stringify(error)).toLowerCase();
  const code = error.code || '';

  // Base error object
  let result = {
    success: false,
    message: "Ocorreu um erro inesperado na integração.",
    type: 'UNKNOWN',
    shouldRetry: true,
    action: null
  };

  // 2. Identify specific error types
  
  // API DISABLED ERROR (Google Cloud Console)
  if (code === 'API_DISABLED' || errString.includes('api_disabled') || errString.includes('has not been used in project')) {
    result = {
      message: "A API do Google Calendar não está habilitada no projeto Google configurado. Verifique as credenciais no Google Cloud Console.",
      type: 'API_DISABLED',
      shouldRetry: true, // Retry lets them click after they fix it in console
      action: 'config_error'
    };
  }
  
  // Auth Errors (Token expired, revoked, invalid grant)
  else if (code === 'AUTH_ERROR' || 
      errString.includes('refresh_token') || 
      errString.includes('invalid_grant') || 
      errString.includes('expired') || 
      errString.includes('authentication') ||
      errString.includes('unauthorized') ||
      errString.includes('401')) {
    result = {
      message: "Sua sessão com o Google expirou ou foi revogada. Por favor, reconecte sua conta.",
      type: 'AUTH_ERROR',
      shouldRetry: false,
      action: 'reconnect'
    };
  }
  
  // Context-specific messaging
  else if (context === 'list-calendars') {
    result = {
      message: result.message === "Ocorreu um erro inesperado." ? "Não foi possível carregar suas agendas do Google." : result.message,
      type: result.type || 'FETCH_ERROR',
      shouldRetry: true,
      action: result.action || 'retry'
    };
  }
  else if (context === 'availability-check') {
    result = {
      message: "Não foi possível verificar disponibilidade no Google Calendar; usando apenas agenda interna.",
      type: 'PARTIAL_ERROR',
      shouldRetry: true,
      action: 'fallback'
    };
  }
  else if (context === 'create-event' || context === 'update-event') {
    result = {
      message: "Falha ao sincronizar com o Google Calendar. O agendamento foi salvo localmente.",
      type: 'SYNC_ERROR',
      shouldRetry: true,
      action: 'warn'
    };
  }

  return result;
};
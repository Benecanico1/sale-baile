export interface GoogleUserPayload {
  iss?: string;
  nbf?: number;
  aud?: string;
  sub?: string;
  email?: string;
  email_verified?: boolean;
  name?: string;
  picture?: string;
  given_name?: string;
  family_name?: string;
  locale?: string;
}

export const GOOGLE_CLIENT_ID =
  import.meta.env.VITE_GOOGLE_CLIENT_ID ||
  '818466285375-mfrk0dt2luuipul7atiu8397j5r4bk6a.apps.googleusercontent.com';

/**
 * Decodifica de forma segura el token JWT retornado por Google Identity Services
 */
export function decodeGoogleJwt(token: string): GoogleUserPayload {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      window
        .atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch (error) {
    console.error('Error al decodificar credencial de Google:', error);
    return {};
  }
}

declare global {
  interface Window {
    google?: {
      accounts?: {
        id?: {
          initialize: (config: any) => void;
          renderButton: (parent: HTMLElement, options: any) => void;
          prompt: () => void;
        };
        oauth2?: {
          initTokenClient: (config: {
            client_id: string;
            scope: string;
            callback: (response: any) => void;
            error_callback?: (error: any) => void;
          }) => {
            requestAccessToken: (overrideConfig?: any) => void;
          };
        };
      };
    };
  }
}

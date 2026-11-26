/** Wire types shared by the HTTP client and the mock backend. */

/** Every error response has this body. */
export type ApiErrorBody = { error: string; message: string };

/** Response of /auth/login, /auth/device and /auth/refresh. */
export type TokenPair = {
  accessToken: string;
  refreshToken: string;
  tokenType: 'Bearer';
  /** Access token lifetime in seconds. */
  expiresIn: number;
};

/**
 * Security configuration for the application
 */
export const securityConfig = {
  /**
   * Content Security Policy (CSP) configuration
   */
  csp: {
    /**
     * Enable CSP
     */
    enabled: true,

    /**
     * Use report-only mode (doesn't block, only reports violations)
     * Defaults to true in development, false in production
     */
    reportOnly: process.env.NODE_ENV === "development",

    /**
     * URI to report CSP violations
     */
    reportUri: "/api/csp-report",

    /**
     * CSP directives
     * These define what resources can be loaded and from where
     */
    directives: {
      /**
       * Default policy for everything not explicitly specified
       */
      defaultSrc: ["'self'"],

      /**
       * Script sources
       */
      scriptSrc: ["'self'"],

      /**
       * Style sources
       */
      styleSrc: ["'self'", "'unsafe-inline'"],

      /**
       * Image sources
       */
      imgSrc: ["'self'", "data:", "https:"],

      /**
       * Font sources
       */
      fontSrc: ["'self'"],

      /**
       * Connect sources (for API, WebSockets)
       */
      connectSrc: ["'self'"],

      /**
       * Object sources (PDFs, Flash)
       */
      objectSrc: ["'none'"],

      /**
       * Media sources (audio, video)
       */
      mediaSrc: ["'self'"],

      /**
       * Frame sources
       */
      frameSrc: ["'self'"],

      /**
       * Form action destinations
       */
      formAction: ["'self'"],

      /**
       * Base URI restriction
       */
      baseUri: ["'self'"],

      /**
       * Frame ancestors (prevents clickjacking)
       */
      frameAncestors: ["'self'"],
    },
  },

  /**
   * Cross-Site Request Forgery (CSRF) protection configuration
   */
  csrf: {
    /**
     * Enable CSRF protection
     */
    enabled: true,

    /**
     * Secret for CSRF token generation
     * Should be set via environment variable in production
     */
    secret: process.env.CSRF_SECRET || "csrf-secret-change-in-production",

    /**
     * Cookie name for the CSRF token
     */
    cookieName: "csrf-token",

    /**
     * Header name for the CSRF token
     */
    headerName: "X-CSRF-Token",

    /**
     * Form field name for the CSRF token
     */
    formFieldName: "_csrf",

    /**
     * Cookie options
     */
    cookieOptions: {
      /**
       * HTTP only flag
       */
      httpOnly: true,

      /**
       * Secure flag (only send over HTTPS)
       * Defaults to true in production, false in development
       */
      secure: process.env.NODE_ENV === "production",

      /**
       * Same site policy
       */
      sameSite: "lax" as const,

      /**
       * Cookie path
       */
      path: "/",

      /**
       * Cookie max age in seconds (24 hours)
       */
      maxAge: 86400,
    },
  },

  /**
   * Cross-Origin Resource Sharing (CORS) configuration
   */
  cors: {
    /**
     * Enable CORS
     */
    enabled: true,

    /**
     * Allowed origins
     * Use ["*"] to allow all origins (not recommended for production)
     */
    origin:
      process.env.NODE_ENV === "production"
        ? [process.env.FRONTEND_URL || ""].filter(Boolean)
        : ["*"],

    /**
     * Allowed methods
     */
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],

    /**
     * Allowed headers
     */
    allowedHeaders: ["Content-Type", "Authorization", "X-CSRF-Token"],

    /**
     * Exposed headers
     */
    exposedHeaders: ["X-CSRF-Token"],

    /**
     * Allow credentials
     */
    credentials: true,

    /**
     * Max age for preflight requests (in seconds)
     */
    maxAge: 86400,
  },

  /**
   * Rate limiting configuration
   */
  rateLimit: {
    /**
     * Enable rate limiting
     */
    enabled: true,

    /**
     * Public rate limit (requests per hour)
     */
    public: {
      max: 100,
      period: 60 * 60 * 1000, // 1 hour in milliseconds
    },

    /**
     * Authenticated rate limit (requests per hour)
     */
    authenticated: {
      max: 1000,
      period: 60 * 60 * 1000, // 1 hour in milliseconds
    },

    /**
     * Admin rate limit (requests per hour)
     */
    admin: {
      max: 5000,
      period: 60 * 60 * 1000, // 1 hour in milliseconds
    },
  },
};

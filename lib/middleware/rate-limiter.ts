/**
 * Rate Limiting Middleware
 * Provides rate limiting functionality for API endpoints
 */

interface RateLimitConfig {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Maximum requests per window
  message?: string; // Custom error message
}

interface RateLimitStore {
  [key: string]: {
    count: number;
    resetTime: number;
  };
}

class RateLimiter {
  private store: RateLimitStore = {};
  private config: RateLimitConfig;

  constructor(config: RateLimitConfig) {
    this.config = config;
    
    // Clean up expired entries every minute
    setInterval(() => {
      this.cleanup();
    }, 60000);
  }

  /**
   * Check if request should be rate limited
   */
  check(identifier: string): { allowed: boolean; remaining: number; resetTime: number } {
    const now = Date.now();
    const windowStart = now - this.config.windowMs;
    
    // Clean up expired entries for this identifier
    if (this.store[identifier] && this.store[identifier].resetTime <= now) {
      delete this.store[identifier];
    }

    // Get or create entry for this identifier
    if (!this.store[identifier]) {
      this.store[identifier] = {
        count: 1,
        resetTime: now + this.config.windowMs
      };
      
      return {
        allowed: true,
        remaining: this.config.maxRequests - 1,
        resetTime: this.store[identifier].resetTime
      };
    }

    // Check if within rate limit
    if (this.store[identifier].count >= this.config.maxRequests) {
      return {
        allowed: false,
        remaining: 0,
        resetTime: this.store[identifier].resetTime
      };
    }

    // Increment counter
    this.store[identifier].count++;

    return {
      allowed: true,
      remaining: this.config.maxRequests - this.store[identifier].count,
      resetTime: this.store[identifier].resetTime
    };
  }

  /**
   * Clean up expired entries
   */
  private cleanup(): void {
    const now = Date.now();
    Object.keys(this.store).forEach(key => {
      if (this.store[key].resetTime <= now) {
        delete this.store[key];
      }
    });
  }

  /**
   * Get current status for identifier
   */
  getStatus(identifier: string): { count: number; remaining: number; resetTime: number } {
    if (!this.store[identifier]) {
      return {
        count: 0,
        remaining: this.config.maxRequests,
        resetTime: Date.now() + this.config.windowMs
      };
    }

    return {
      count: this.store[identifier].count,
      remaining: Math.max(0, this.config.maxRequests - this.store[identifier].count),
      resetTime: this.store[identifier].resetTime
    };
  }
}

// Pre-configured rate limiters
export const jobSubmissionRateLimiter = new RateLimiter({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 10, // 10 job submissions per minute
  message: 'Too many job submissions. Please wait before submitting another job.'
});

export const apiRateLimiter = new RateLimiter({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 100, // 100 API calls per minute
  message: 'Too many API requests. Please slow down.'
});

export const rosettaJobRateLimiter = new RateLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  maxRequests: 3, // 3 Rosetta jobs per hour
  message: 'Rosetta jobs are computationally expensive. You can submit up to 3 per hour.'
});

// Helper function to get client identifier
export function getClientIdentifier(request: NextRequest): string {
  // Try to get user ID from session first
  const userId = request.headers.get('x-user-id');
  if (userId) {
    return `user:${userId}`;
  }

  // Fall back to IP address
  const forwarded = request.headers.get('x-forwarded-for');
  const ip = forwarded ? forwarded.split(',')[0] : request.ip || 'unknown';
  return `ip:${ip}`;
}

// Rate limiting middleware for Next.js API routes
export function withRateLimit(
  rateLimiter: RateLimiter,
  getIdentifier: (request: NextRequest) => string = getClientIdentifier
) {
  return function rateLimitMiddleware(
    handler: (request: NextRequest, ...args: any[]) => Promise<Response>
  ) {
    return async function(request: NextRequest, ...args: any[]) {
      const identifier = getIdentifier(request);
      const result = rateLimiter.check(identifier);

      if (!result.allowed) {
        return new Response(
          JSON.stringify({
            error: rateLimiter.config.message || 'Rate limit exceeded',
            retryAfter: Math.ceil((result.resetTime - Date.now()) / 1000)
          }),
          {
            status: 429,
            headers: {
              'Content-Type': 'application/json',
              'X-RateLimit-Limit': rateLimiter.config.maxRequests.toString(),
              'X-RateLimit-Remaining': result.remaining.toString(),
              'X-RateLimit-Reset': result.resetTime.toString(),
              'Retry-After': Math.ceil((result.resetTime - Date.now()) / 1000).toString()
            }
          }
        );
      }

      // Add rate limit headers to response
      const response = await handler(request, ...args);
      response.headers.set('X-RateLimit-Limit', rateLimiter.config.maxRequests.toString());
      response.headers.set('X-RateLimit-Remaining', result.remaining.toString());
      response.headers.set('X-RateLimit-Reset', result.resetTime.toString());

      return response;
    };
  };
}

export default RateLimiter;

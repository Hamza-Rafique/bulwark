import rateLimit from 'express-rate-limit';

// Rate limiter for API endpoints
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

// Stricter rate limiter for test generation (prevent abuse)
export const testGenLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 50, // Limit each IP to 50 test generations per hour
  message: 'Test generation limit reached. Please try again in an hour.',
  standardHeaders: true,
  legacyHeaders: false,
});
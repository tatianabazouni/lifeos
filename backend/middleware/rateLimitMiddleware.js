const buckets = new Map();

export const rateLimit = ({ windowMs = 60_000, max = 20, keyFn } = {}) => (req, res, next) => {
  const key = keyFn ? keyFn(req) : req.user?._id?.toString() || req.ip;
  const now = Date.now();
  const bucket = buckets.get(key) || { count: 0, resetAt: now + windowMs };

  if (now > bucket.resetAt) {
    bucket.count = 0;
    bucket.resetAt = now + windowMs;
  }

  bucket.count += 1;
  buckets.set(key, bucket);

  if (bucket.count > max) {
    return res.status(429).json({ message: "Rate limit exceeded. Please try again later." });
  }

  return next();
};

type AttemptWindow = {
  count: number;
  windowStart: number;
};

const ONE_HOUR_MS = 60 * 60 * 1000;
const MAX_ATTEMPTS_PER_HOUR = 50;

export class LoginAttemptTracker {
  private readonly attempts = new Map<string, AttemptWindow>();

  recordFailure(ip: string): { caution: boolean; count: number } {
    const now = Date.now();
    const current = this.attempts.get(ip);

    if (!current || now - current.windowStart >= ONE_HOUR_MS) {
      this.attempts.set(ip, { count: 1, windowStart: now });
      return { caution: false, count: 1 };
    }

    current.count += 1;
    return { caution: current.count >= MAX_ATTEMPTS_PER_HOUR, count: current.count };
  }

  reset(ip: string) {
    this.attempts.delete(ip);
  }
}

/**
 * Lightweight in-process analytics job queue with retries.
 * Avoids requiring Redis/BullMQ while providing retry + concurrency control.
 * Swap implementation behind the same API if REDIS_URL + BullMQ are added later.
 */

const DEFAULT_CONCURRENCY = 2;
const DEFAULT_MAX_ATTEMPTS = 3;

const state = {
  queue: [],
  active: 0,
  concurrency: DEFAULT_CONCURRENCY,
  completed: 0,
  failed: 0,
  deadLetter: [],
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function pump() {
  while (state.active < state.concurrency && state.queue.length > 0) {
    const job = state.queue.shift();
    state.active += 1;
    runJob(job).finally(() => {
      state.active -= 1;
      pump();
    });
  }
}

async function runJob(job) {
  const { name, fn, attempts = DEFAULT_MAX_ATTEMPTS, attempt = 1, meta = {} } = job;
  try {
    const result = await fn();
    state.completed += 1;
    console.log(
      `[AnalyticsQueue] ok name=${name} attempt=${attempt} meta=${JSON.stringify(meta)}`
    );
    return result;
  } catch (err) {
    console.warn(
      `[AnalyticsQueue] fail name=${name} attempt=${attempt}/${attempts}:`,
      err.message
    );
    if (attempt < attempts) {
      const delay = Math.min(30_000, 500 * 2 ** (attempt - 1));
      await sleep(delay);
      state.queue.push({ ...job, attempt: attempt + 1 });
      return;
    }
    state.failed += 1;
    state.deadLetter.push({
      name,
      meta,
      error: err.message,
      failedAt: new Date().toISOString(),
    });
    if (state.deadLetter.length > 200) state.deadLetter.shift();
  }
}

/**
 * Enqueue a background analytics task with retries.
 * @returns {Promise<void>} resolves when accepted into queue (not when finished)
 */
export function enqueueAnalyticsJob(name, fn, { attempts = DEFAULT_MAX_ATTEMPTS, meta = {} } = {}) {
  state.queue.push({ name, fn, attempts, attempt: 1, meta });
  setImmediate(pump);
}

export function getAnalyticsQueueStats() {
  return {
    pending: state.queue.length,
    active: state.active,
    completed: state.completed,
    failed: state.failed,
    deadLetter: state.deadLetter.slice(-20),
    concurrency: state.concurrency,
  };
}

export function setAnalyticsQueueConcurrency(n) {
  state.concurrency = Math.max(1, Number(n) || DEFAULT_CONCURRENCY);
}

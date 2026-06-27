/**
 * WhatsApp Message Queue
 * 
 * In-memory FIFO queue with concurrency control, inter-task delay,
 * and retry with exponential backoff.
 * 
 * Prevents WhatsApp API rate-limit blocks when dispatching ledgers
 * triggers 100s of messages simultaneously.
 * 
 * Configuration via environment variables:
 *   WA_QUEUE_CONCURRENCY   – max parallel API calls      (default: 5)
 *   WA_QUEUE_DELAY_MS      – gap between starting tasks  (default: 200)
 *   WA_QUEUE_RETRIES       – retry count per message      (default: 2)
 *   WA_QUEUE_RETRY_DELAY_MS – base delay for exp backoff  (default: 1000)
 */

const PREFIX = '[WhatsAppQueue]';

class WhatsAppQueue {
    constructor() {
        this.concurrency    = parseInt(process.env.WA_QUEUE_CONCURRENCY, 10)    || 5;
        this.delayMs        = parseInt(process.env.WA_QUEUE_DELAY_MS, 10)       || 200;
        this.retries        = parseInt(process.env.WA_QUEUE_RETRIES, 10)        || 2;
        this.retryDelayMs   = parseInt(process.env.WA_QUEUE_RETRY_DELAY_MS, 10) || 1000;

        /** @type {Array<{ taskFn: Function, label: string }>} */
        this._queue    = [];
        this._active   = 0;
        this._draining = false;

        // Stats (useful for debugging)
        this._processed = 0;
        this._failed    = 0;

        console.log(
            `${PREFIX} Initialized — concurrency=${this.concurrency}, ` +
            `delay=${this.delayMs}ms, retries=${this.retries}, ` +
            `retryDelay=${this.retryDelayMs}ms`
        );
    }

    /**
     * Add a task to the queue.
     * @param {Function} taskFn  – async function that performs the API call
     * @param {string}   [label] – human-readable label for logs (e.g. phone number)
     */
    enqueue(taskFn, label = '') {
        this._queue.push({ taskFn, label });

        if (this._queue.length % 50 === 0 || this._queue.length === 1) {
            console.log(`${PREFIX} Queue size: ${this._queue.length}`);
        }

        // Kick the drain loop if it isn't running
        if (!this._draining) {
            this._drain();
        }
    }

    /**
     * Internal drain loop — pulls tasks off the queue respecting
     * concurrency limits and inter-task delay.
     */
    async _drain() {
        this._draining = true;

        while (this._queue.length > 0) {
            // Wait until a concurrency slot is free
            if (this._active >= this.concurrency) {
                await this._waitForSlot();
                continue;
            }

            const task = this._queue.shift();
            this._active++;

            // Fire the task (don't await — allow concurrency)
            this._executeWithRetry(task)
                .finally(() => {
                    this._active--;
                });

            // Stagger starts by delayMs
            if (this._queue.length > 0) {
                await this._sleep(this.delayMs);
            }
        }

        // Wait for all in-flight tasks to finish before declaring drain complete
        while (this._active > 0) {
            await this._sleep(100);
        }

        this._draining = false;
        console.log(
            `${PREFIX} Drain complete — processed=${this._processed}, failed=${this._failed}`
        );
    }

    /**
     * Execute a task with retry + exponential backoff.
     */
    async _executeWithRetry({ taskFn, label }) {
        for (let attempt = 0; attempt <= this.retries; attempt++) {
            try {
                await taskFn();
                this._processed++;
                return; // success
            } catch (err) {
                const isLastAttempt = attempt === this.retries;
                if (isLastAttempt) {
                    this._failed++;
                    console.error(
                        `${PREFIX} FAILED after ${this.retries + 1} attempts` +
                        `${label ? ` [${label}]` : ''}: ${err.message}`
                    );
                } else {
                    const backoff = this.retryDelayMs * Math.pow(2, attempt);
                    console.warn(
                        `${PREFIX} Attempt ${attempt + 1} failed` +
                        `${label ? ` [${label}]` : ''}, retrying in ${backoff}ms...`
                    );
                    await this._sleep(backoff);
                }
            }
        }
    }

    /** Wait until a concurrency slot opens up. */
    _waitForSlot() {
        return new Promise((resolve) => {
            const check = () => {
                if (this._active < this.concurrency) {
                    resolve();
                } else {
                    setTimeout(check, 50);
                }
            };
            check();
        });
    }

    /** Promise-based sleep. */
    _sleep(ms) {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }

    /** Current queue length (pending + active). */
    get size() {
        return this._queue.length + this._active;
    }
}

// Singleton — shared across all controllers
module.exports = new WhatsAppQueue();

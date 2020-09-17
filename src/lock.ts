export class Lock {
  private left: number;
  private queue: (() => void)[] = [];
  constructor(readonly num: number = 1) {
    this.left = num;
  }

  async acquire(): Promise<void> {
    if (this.left > 0) {
      // decriment count
      this.left--;
    } else {
      // wait for the next release
      await new Promise((resolve) => {
        this.queue.push(resolve);
      });
    }
  }

  release(): void {
    const next = this.queue.shift();
    if (next === undefined) {
      // nothing queued, return count
      this.left++;
      if (this.left > this.num) {
        throw new Error("release called more times than acquire");
      }
    } else {
      // something queued, unlock it
      next();
    }
  }
}

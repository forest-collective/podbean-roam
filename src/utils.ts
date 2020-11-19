export function anonnull<T>(
  source: Element,
  config: MutationObserverInit,
  accept: () => T | null,
  timeout?: number,
  message?: string
): Promise<T> {
  const prom = new Promise<T>((resolve, reject) => {
    try {
      const init = accept();
      if (init !== null) {
        resolve(init);
      } else {
        const observer = new MutationObserver((_, obs) => {
          try {
            const res = accept();
            if (res !== null) {
              obs.disconnect();
              resolve(res);
            }
          } catch (ex) {
            reject(ex);
          }
        });
        observer.observe(source, config);
      }
    } catch (ex) {
      reject(ex);
    }
  });

  if (!timeout) return prom;

  const defTimeout = timeout;

  async function wait(): Promise<T> {
    await sleep(defTimeout);
    throw new Error(`timed out after ${defTimeout}: ${message || ""}`);
  }

  return Promise.race([prom, wait()]);
}

export async function astate(
  source: Element,
  config: MutationObserverInit,
  accept: () => boolean,
  timeout?: number,
  message?: string
): Promise<void> {
  await anonnull(
    source,
    config,
    () => (accept() ? true : null),
    timeout,
    message
  );
}

export async function anchildren(
  source: Element,
  n: number,
  timeout?: number,
  message?: string
): Promise<HTMLCollection> {
  return await anonnull(
    source,
    { childList: true },
    () => {
      if (source.children.length >= n) {
        return source.children;
      } else {
        return null;
      }
    },
    timeout,
    message
  );
}

export function nonnull<T>(val: T | null): val is T {
  return val !== null;
}

export function pick<T>(array: T[], k: number): [T[], T[]] {
  if (array.length <= k) {
    return [array, []];
  }
  const copy = array.slice();
  for (let i = 0; i < k; ++i) {
    const swap = Math.floor(Math.random() * (array.length - i)) + i;
    [copy[i], copy[swap]] = [copy[swap], copy[i]];
  }
  return [copy.slice(0, k), copy.slice(k)];
}

export function sleep(millis: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, millis));
}

interface NewAble<T> {
  new (...args: unknown[]): T;
}

function check<T>(typ: NewAble<T>, obj: unknown): obj is T {
  return obj instanceof typ;
}

export function cast<T>(typ: NewAble<T>, obj: unknown): T {
  if (check(typ, obj)) {
    return obj;
  } else {
    throw new TypeError(`${typeof obj} was not ${typ.toString()}`);
  }
}

cast.boolean = (obj: unknown): boolean => {
  if (typeof obj === "boolean") {
    return obj;
  } else {
    throw new TypeError(`${typeof obj} was not boolean`);
  }
};

cast.number = (obj: unknown): number => {
  if (typeof obj === "number") {
    return obj;
  } else {
    throw new TypeError(`${typeof obj} was not number`);
  }
};

cast.string = (obj: unknown): string => {
  if (typeof obj === "string") {
    return obj;
  } else {
    throw new TypeError(`${typeof obj} was not string`);
  }
};

cast.object = (obj: unknown): Record<string, unknown> => {
  if (typeof obj === "object" && obj !== null) {
    return obj as Record<string, unknown>;
  } else {
    throw new TypeError(`${typeof obj} was not object`);
  }
};

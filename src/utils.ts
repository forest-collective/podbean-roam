export function anonnull<T>(
  source: Element,
  config: MutationObserverInit,
  accept: () => T | null
): Promise<T> {
  return new Promise((resolve, reject) => {
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
}

export async function astate(
  source: Element,
  config: MutationObserverInit,
  accept: () => boolean
): Promise<void> {
  await anonnull(source, config, () => (accept() ? true : null));
}

export async function anchildren(
  source: Element,
  n: number
): Promise<HTMLCollection> {
  return await anonnull(source, { childList: true }, () => {
    if (source.children.length >= n) {
      return source.children;
    } else {
      return null;
    }
  });
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

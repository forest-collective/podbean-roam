import { anonnull, astate, sleep, cast } from "./utils";
import { Lock } from "./lock";

type CallState = "calling" | "active" | "speaking";

class CCaller {
  constructor(
    private readonly handler: CCallHandler,
    private readonly clickElement: HTMLElement,
    readonly id: number | undefined,
    readonly name: string,
    readonly avatar: string,
    readonly state: CallState
  ) {}

  key(): string {
    return `${this.id || 0}\0${this.name}`;
  }

  connect(): void {
    if (this.state !== "calling") throw new Error("must be calling to connect");
    void this.handler.process(
      this.id,
      this.name,
      this.state,
      3,
      "Connect",
      false
    );
  }

  disconnect(): void {
    void this.handler.process(
      this.id,
      this.name,
      this.state,
      2,
      "Disconnect",
      this.state !== "calling"
    );
  }

  click(): void {
    this.clickElement.click();
  }
}

export type Caller = CCaller;

class NotActive extends Error {}

function createCaller(handler: CCallHandler, element: HTMLElement): CCaller {
  if (!element.classList.contains("active")) throw new NotActive();
  const img = element.querySelector(".el-avatar img");
  if (img === null) throw new Error("no image");
  const src = cast(HTMLImageElement, img).src;
  let id = undefined;
  try {
    const url = new URL(src);
    const [empty, logo, ilogo, idstr, ...rest] = url.pathname.split("/");
    const idnum = parseInt(idstr);
    if (
      rest.length === 1 &&
      url.hostname === "pbcdn1.podbean.com" &&
      empty === "" &&
      logo === "imglogo" &&
      ilogo === "image-logo" &&
      !isNaN(idnum)
    ) {
      id = idnum;
    }
  } finally {
    // keep id as undefined
  }
  let state: CallState;
  if (element.classList.contains("call-in-progress")) {
    state = "active";
  } else if (element.classList.contains("call-in-waiting")) {
    state = "calling";
  } else {
    throw new Error("unknown call state");
  }
  const nameElement = element.querySelector(".cal-item-name");
  if (nameElement === null) throw new Error("name element was null");
  const [clickElement] = element.children;
  return new CCaller(
    handler,
    cast(HTMLElement, clickElement),
    id,
    cast(HTMLElement, nameElement).innerText,
    src,
    state
  );
}

class CCallHandler {
  private actionTimeout: number = 1000;
  private lock: Lock = new Lock();
  private callbacks: ((callers: Caller[]) => void)[] = [];
  private observer: MutationObserver;
  constructor(private hosts: HTMLElement, private dialog: HTMLElement) {
    this.observer = new MutationObserver(this.callback);
  }

  private callback = (): void => {
    const callers = this.getCallers();
    for (const cb of this.callbacks) {
      cb(callers);
    }
  };

  addCallback(callback: (callers: Caller[]) => void): void {
    if (!this.callbacks.length) {
      this.observer.observe(this.hosts, { childList: true });
    }
    this.callbacks.push(callback);
  }

  removeCallback(callback: (callers: Caller[]) => void): void {
    const index = this.callbacks.indexOf(callback);
    if (index === -1) throw new Error("couldn't find callback");
    this.callbacks.splice(index, 1);
    if (!this.callbacks.length) {
      this.observer.disconnect();
    }
  }

  getCallers(): Caller[] {
    const possible = [...this.hosts.children].slice(1);
    const result: Caller[] = [];
    for (const elem of possible) {
      try {
        result.push(createCaller(this, cast(HTMLElement, elem)));
      } catch (ex) {
        if (!(ex instanceof NotActive)) {
          console.error(ex);
        }
      }
    }
    return result;
  }

  async process(
    id: number | undefined,
    name: string,
    state: CallState,
    buttonPos: number,
    buttonName: string,
    confirmation: boolean
  ): Promise<void> {
    await this.lock.acquire();
    try {
      this.dialog.classList.add("aot-hide");
      try {
        await Promise.race([
          this.processInner(
            id,
            name,
            state,
            buttonPos,
            buttonName,
            confirmation
          ),
          new Promise((_, reject) =>
            setTimeout(
              () => reject(new Error("action timeout")),
              this.actionTimeout
            )
          ),
        ]);
      } catch (ex) {
        console.error(ex);
      }
      this.dialog.classList.remove("aot-hide");
    } finally {
      this.lock.release();
    }
  }

  private async processInner(
    id: number | undefined,
    name: string,
    state: CallState,
    buttonPos: number,
    buttonName: string,
    confirmation: boolean
  ): Promise<void> {
    const caller = this.getCallers().find(
      (c) => c.id === id && c.name === name
    );
    // verify caller is still here as we expect
    if (caller === undefined) throw new Error("caller no longer active");
    if (caller.state !== state) {
      throw new Error(
        `callers state was ${caller.state} not expected ${state}`
      );
    }

    // click on caller
    caller.click();

    // await dialog popup for user
    await sleep(10);
    await astate(this.dialog, { childList: true, subtree: true }, () => {
      const answer = this.dialog.querySelector(".user-name");
      if (answer === null) return false;
      const name = cast(HTMLElement, answer).innerText;
      return name === caller.name;
    });

    // find action button
    const button = this.dialog.querySelector(
      `.el-dialog__footer button:nth-child(${buttonPos})`
    );
    if (button === null) throw new Error("didn't find dialog button");
    const htmlButton = cast(HTMLElement, button);
    if (htmlButton.innerText !== buttonName) {
      throw new Error("dialog button didn't have appropriate name");
    }

    // click action
    htmlButton.click();

    // extra confirmation
    if (confirmation) {
      await sleep(10);
      // XXX This addition might be a litle late, but since it might not
      // exist before this, this is the best we can do
      const confirmation = await anonnull(
        document.body,
        { childList: true },
        () => document.querySelector('[aria-label="Remove co-host/guest"]')
      );
      confirmation.classList.add("aot-hide");

      // XXX This dialog takes some time to register, but not sure why...
      // this is pretty hacky, but I don't know the best way
      try {
        await sleep(50);
        const confirmButton = await anonnull<HTMLElement>(
          confirmation,
          { childList: true, subtree: true },
          () =>
            confirmation.querySelector(
              ".el-message-box__btns > button:nth-child(2)"
            )
        );

        confirmButton.click();
      } finally {
        confirmation.classList.remove("aot-hide");
      }
    }

    // they finished processing
    await sleep(10);
    await astate(
      this.dialog,
      { attributes: true },
      () => this.dialog.style.display === "none"
    );
  }
}

export type CallHandler = CCallHandler;

export async function createCallHandler(): Promise<CallHandler> {
  const [hosts, dialog] = await Promise.all([
    anonnull(document.body, { childList: true, subtree: true }, () =>
      document.querySelector(".guests-callins .hosts-content")
    ),
    anonnull(document.body, { childList: true, subtree: true }, () =>
      document.querySelector(
        "main.el-main > div.el-dialog__wrapper:nth-child(3)"
      )
    ),
  ]);
  return new CCallHandler(cast(HTMLElement, hosts), cast(HTMLElement, dialog));
}

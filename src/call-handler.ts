import { anonnull, astate, sleep, cast } from "./utils";

type CallState = "calling" | "active" | "speaking";

class CCaller {
  constructor(
    private readonly handler: CCallHandler,
    private readonly clickElement: HTMLElement,
    readonly id: number,
    readonly name: string,
    readonly avatar: string,
    readonly state: CallState
  ) {}

  connect(): void {
    if (this.state !== "calling") throw new Error("must be calling to connect");
    void this.handler.process(
      new QueueState(this.id, this.state, 3, "Connect", false)
    );
  }

  disconnect(): void {
    void this.handler.process(
      new QueueState(
        this.id,
        this.state,
        2,
        "Disconnect",
        this.state !== "calling"
      )
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
  const id = parseInt(src.split("/")[5]);
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

class QueueState {
  constructor(
    readonly id: number,
    readonly state: CallState,
    readonly buttonPos: number,
    readonly buttonName: string,
    readonly confirmation: boolean
  ) {}
}

class CCallHandler {
  private queue: QueueState[] = [];
  private actionTimeout: number = 1000;
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

  async process(action: QueueState): Promise<void> {
    this.queue.push(action);
    if (this.queue.length > 1) {
      return; // something is already running;
    }
    while (this.queue.length) {
      try {
        await Promise.race([
          this.processInner(this.queue[0]),
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
      this.queue.shift();
    }
    this.dialog.classList.remove("aot-hide");
  }

  private async processInner(state: QueueState): Promise<void> {
    const caller = this.getCallers().find((c) => c.id === state.id);
    // verify caller is still here as we expect
    if (caller === undefined) throw new Error("caller no longer active");
    if (caller.state !== state.state) {
      throw new Error(
        `callers state was ${caller.state} not expected ${state.state}`
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
      `.el-dialog__footer button:nth-child(${state.buttonPos})`
    );
    if (button === null) throw new Error("didn't find dialog button");
    const htmlButton = cast(HTMLElement, button);
    if (htmlButton.innerText !== state.buttonName) {
      throw new Error("dialog button didn't have appropriate name");
    }

    // click action
    htmlButton.click();

    // extra confirmation
    if (state.confirmation) {
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
      confirmation.classList.remove("aot-hide");
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

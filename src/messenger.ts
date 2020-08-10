import { anonnull, cast } from "./utils";

const inputEvent = new Event("input", {
  bubbles: true,
  cancelable: true,
});

class CMessenger {
  constructor(
    private readonly input: HTMLInputElement,
    private readonly button: HTMLElement
  ) {}

  sendMessage(message: string): void {
    this.input.value = message;
    this.input.dispatchEvent(inputEvent);
    this.button.click();
  }
}

export type Messenger = CMessenger;

export async function createMessenger(): Promise<Messenger> {
  const [input, button] = await Promise.all([
    anonnull(document.body, { childList: true, subtree: true }, () =>
      document.querySelector("#message-input")
    ),
    anonnull(document.body, { childList: true, subtree: true }, () =>
      document.querySelector("#send-msg-btn")
    ),
  ]);
  return new CMessenger(
    cast(HTMLInputElement, input),
    cast(HTMLElement, button)
  );
}

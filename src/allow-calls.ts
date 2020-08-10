import { anonnull, cast } from "./utils";

class CAllowCalls {
  constructor(readonly element: HTMLElement) {}

  enableCalls(): void {
    if (!this.element.classList.contains("is-checked")) {
      this.element.click();
    }
  }

  disableCalls(): void {
    if (this.element.classList.contains("is-checked")) {
      this.element.click();
    }
  }
}

export type AllowCalls = CAllowCalls;

export async function createAllowCalls(): Promise<AllowCalls> {
  const element = await anonnull(
    document.body,
    { childList: true, subtree: true },
    () => document.querySelector(".left-content .guests-callins .el-switch")
  );
  return new CAllowCalls(cast(HTMLElement, element));
}

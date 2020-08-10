import { anonnull, cast } from "./utils";

const inputEvent = new Event("input", {
  bubbles: true,
  cancelable: true,
});

class CAbout {
  constructor(
    private readonly input: HTMLInputElement,
    private readonly button: HTMLElement
  ) {}

  setAbout(about: string): void {
    this.input.value = about;
    this.input.dispatchEvent(inputEvent);
    this.button.click();
  }
}

export type About = CAbout;

export async function createAbout(): Promise<About> {
  // XXX We need to render this element once so it stays

  // click edit button
  const edit = await anonnull(
    document.body,
    { childList: true, subtree: true },
    () => document.querySelector(".edit-user-profile > button")
  );
  cast(HTMLElement, edit).click();

  // click basic
  const basic = await anonnull(
    document.body,
    { childList: true, subtree: true },
    () => document.querySelector("body > ul.el-dropdown-menu > li:nth-child(1)")
  );
  cast(HTMLElement, basic).click();

  // get relevant buttons
  const [input, cancel, button] = await Promise.all([
    anonnull(document.body, { childList: true, subtree: true }, () =>
      document.querySelector(
        "main.el-main > .profile-info .el-form .el-form-item:nth-child(2) input"
      )
    ),
    anonnull(document.body, { childList: true, subtree: true }, () =>
      document.querySelector(
        "main.el-main > .profile-info .dialog-footer .el-button--default"
      )
    ),
    anonnull(document.body, { childList: true, subtree: true }, () =>
      document.querySelector(
        "main.el-main > .profile-info .dialog-footer .el-button--primary"
      )
    ),
  ]);

  // close out the opening context though
  cast(HTMLElement, cancel).click();

  return new CAbout(cast(HTMLInputElement, input), cast(HTMLElement, button));
}

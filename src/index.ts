import { createControlPanel } from "./control";
import { anonnull, anchildren, cast } from "./utils";

void (async function () {
  const right = await anonnull(
    document.body,
    { childList: true, subtree: true },
    () => document.querySelector(".live-room > :nth-child(3) .left-content")
  );
  const [, , music] = await anchildren(right, 3);

  await createControlPanel(cast(HTMLElement, music));
})();

import { createControlPanel } from "./control";
import { anonnull, anchildren, cast } from "./utils";

type NL = NodeListOf<HTMLElement>;

void (async function () {
  const right = await anonnull(
    document.body,
    { childList: true, subtree: true },
    () => document.querySelector(".live-room > :nth-child(3) .left-content")
  );
  const [dials, soundEffects, music] = await anchildren(right, 3);

  // hide silly items
  for (const node of [soundEffects, music]) {
    cast(HTMLElement, node).style.display = "none";
  }

  await createControlPanel(cast(HTMLElement, dials));
})();

import { cast, anchildren } from "./utils";

export class MusicWatcher {
  constructor(
    private readonly music: HTMLElement,
    private readonly header: HTMLElement
  ) {
    const observer = new MutationObserver(this.obs);
    observer.observe(music, { attributes: true });
  }

  obs = (): void => {
    /* left empty for now */
  };

  collapse(): void {
    if (!this.music.classList.contains("is-active")) {
      this.header.click();
    }
  }
}

export async function createMusicWatcher(
  music: HTMLElement
): Promise<MusicWatcher> {
  const [, header] = await anchildren(music, 2);
  return new MusicWatcher(music, cast(HTMLElement, header));
}

export class UserLog {
  readonly participated: Set<number>;
  readonly called: Set<number>;

  constructor(
    public readonly name: string,
    public readonly avatar: string,
    participated: Iterable<number> = [],
    called: Iterable<number> = []
  ) {
    this.participated = new Set(participated);
    this.called = new Set(called);
  }

  priority(): number {
    return this.called.size - this.participated.size;
  }

  serialize(): Record<string, unknown> {
    return {
      name: this.name,
      avatar: this.avatar,
      participated: [...this.participated],
      called: [...this.called],
    };
  }
}

function downloadText(filename: string, text: string): void {
  const element = document.createElement("a");
  element.setAttribute(
    "href",
    "data:text/plain;charset=utf-8," + encodeURIComponent(text)
  );
  element.setAttribute("download", filename);

  element.style.display = "none";
  document.body.appendChild(element);

  element.click();

  document.body.removeChild(element);
}
function getTitle(): string {
  const titleSelector = document.querySelector(
    "#user-profile > div > div.media-body > div.live-room-title"
  );
  if (titleSelector && titleSelector instanceof HTMLElement) {
    return titleSelector.innerText.toLowerCase().replace(/\s+/g, "_");
  } else {
    return "unknown_roam";
  }
}

function getTotalPeople(): number {
  const peopleSelector = document.querySelector("#live_now .total-people");
  if (!peopleSelector || !(peopleSelector instanceof HTMLElement)) {
    return 0;
  }
  const [, num] = peopleSelector.innerText.split(": ");
  const val = parseInt(num);
  if (isNaN(val)) {
    return 0;
  } else {
    return val;
  }
}

export function downloadParticipation(userLogs: Map<string, UserLog>): void {
  const head = [
    `Name (${getTotalPeople()} total)`,
    "Called",
    "Participated",
    "PodBean Profile",
  ].join("\t");
  const contents = [...userLogs.entries()]
    .map(([key, log]) => {
      const [idstr, name] = key.split("\0");
      let profile = "";
      if (idstr !== "0") {
        profile = `https://www.podbean.com/site/userCenter/followMore/blog/${idstr}`;
      }
      return [name, log.called.size, log.participated.size, profile].join("\t");
    })
    .join("\n");
  downloadText(`${getTitle()}_participation.tsv`, `${head}\n${contents}`);
}

export function downloadChat(): void {
  const head = ["Name", "Message"].join("\t");
  const messages = document.querySelector("#message-list-items");
  const contents: string[] = [];
  for (const node of messages ? messages.children : []) {
    const nameNode = node.querySelector(".nick-name");
    if (!nameNode || !(nameNode instanceof HTMLElement)) continue;
    const name = nameNode.innerText;
    const msgNode = node.querySelector(".msg-content");
    const msg =
      msgNode && msgNode instanceof HTMLElement ? msgNode.innerText : "";
    contents.push([name, msg].join("\t"));
  }
  downloadText(`${getTitle()}_chat.tsv`, `${head}\n${contents.join("\n")}`);
}

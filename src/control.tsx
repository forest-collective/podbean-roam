import * as React from "react";
import * as ReactDOM from "react-dom";

import { LeaderBoardUser } from "./leader-board-user";
import { Card } from "./card";
import { Statement } from "./statement";
import { Button } from "./button";
import { createCallHandler, CallHandler, Caller } from "./call-handler";
import { createAllowCalls, AllowCalls } from "./allow-calls";
import { pick } from "./utils";
import { createMessenger, Messenger } from "./messenger";
import { createAbout, About } from "./about";

const storageKey = "podbean_roam";

function formatTimeLeft(totalSeconds: number): string {
  let prefix = "";
  if (totalSeconds < 0) {
    prefix = "-";
    totalSeconds = Math.abs(totalSeconds);
  }
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${prefix}${minutes}:${seconds.toString().padStart(2, "0")}`;
}

function abbrev(str: string, truncation: number = 12): string {
  if (str.length <= truncation) {
    return str;
  } else {
    return str.slice(0, truncation) + "...";
  }
}

interface ControlPanelProps {
  taskId: string | null;
  questionLengthMin: number;
  maxRoamers: number;
  allowCalls: AllowCalls;
  callHandler: CallHandler;
  messenger: Messenger;
  about: About;
}

class UserLog {
  constructor(
    public readonly name: string,
    public readonly avatar: string,
    public readonly participated: Set<number> = new Set(),
    public readonly called: Set<number> = new Set()
  ) {}

  priority(): number {
    return this.called.size - this.participated.size;
  }
}

class ControlPanelState {
  constructor(
    public readonly running: boolean = false,
    public readonly startTime: Date = new Date(),
    public readonly secondsLeft: number = 0,
    public readonly statement: number = -1,
    public readonly statements: string[] = [],
    public readonly ranStatements: Set<number> = new Set(),
    public readonly canAdd: boolean = false,
    public readonly userLogs: Map<number, UserLog> = new Map<number, UserLog>()
  ) {}
}

function replacer(
  this: Record<string, unknown>,
  key: string,
  value: unknown
): unknown {
  const typedValue = this[key];
  if (typedValue instanceof Date) {
    return {
      datatype: "Date",
      value: value,
    };
  } else if (typedValue instanceof Map) {
    return {
      datatype: "Map",
      value: [...typedValue.entries()],
    };
  } else if (typedValue instanceof Set) {
    return {
      datatype: "Set",
      value: [...typedValue],
    };
  } else if (typedValue instanceof UserLog) {
    return {
      datatype: "UserLog",
      value: Object.assign({}, typedValue),
    };
  }
  return value;
}

function reviver(key: string, value: string): unknown {
  if (typeof value === "object" && value !== null) {
    const typed = value as { datatype?: string; value: unknown };
    if (typed.datatype === "Date") {
      return new Date(typed.value as string);
    } else if (typed.datatype === "Map") {
      return new Map(typed.value as [unknown, unknown][]);
    } else if (typed.datatype === "Set") {
      return new Set(typed.value as unknown[]);
    } else if (typed.datatype === "UserLog") {
      const cast = typed.value as UserLog;
      return new UserLog(
        cast.name,
        cast.avatar,
        cast.participated,
        cast.called
      );
    }
  }
  return value;
}

function loadState(currentId: string | null): ControlPanelState | null {
  try {
    if (currentId === null) return null;
    const loaded = localStorage.getItem(storageKey);
    if (loaded === null) return null;
    // XXX This is unsafe, but works if the replacer and reviver are written
    // properly, and the taskId checking should clear on every new session
    const parsed = JSON.parse(loaded, reviver) as ControlPanelState & {
      taskId: string | null;
    };
    if (parsed.taskId !== currentId) return null;
    return parsed;
  } catch (ex) {
    console.error("failed to load state:", ex);
    return null;
  }
}

class ControlPanel extends React.Component<
  ControlPanelProps,
  ControlPanelState
> {
  timerId: number = 0;

  constructor(props: ControlPanelProps) {
    super(props);
    this.state = loadState(this.props.taskId) || new ControlPanelState();
    localStorage.setItem(
      storageKey,
      JSON.stringify(
        Object.assign({ taskId: this.props.taskId }, this.state),
        replacer
      )
    );
    if (this.state.running) {
      this.props.allowCalls.enableCalls();
      this.timerId = window.setInterval(() => this.tick(), 1000);
    } else {
      this.props.allowCalls.disableCalls();
    }
    this.callerCallback(this.props.callHandler.getCallers());
  }

  setState<K extends keyof ControlPanelState>(
    callback: (
      state: Readonly<ControlPanelState>,
      props: Readonly<ControlPanelProps>
    ) => Pick<ControlPanelState, K> | null
  ): void {
    if (this.props.taskId === null) {
      super.setState(callback);
    } else {
      super.setState((olds, oldp) => {
        const newState = callback(olds, oldp);
        if (newState === null) return null;
        const oldState = localStorage.getItem(storageKey);
        localStorage.setItem(
          storageKey,
          JSON.stringify(
            Object.assign(
              { taskId: this.props.taskId },
              oldState ? JSON.parse(oldState) : olds,
              newState
            ),
            replacer
          )
        );
        return newState;
      });
    }
  }

  callerCallback = (callers: Caller[]): void => {
    this.setState((state, props) => {
      // compute changes to user stats
      if (!state.running) return null;
      let changed = false;
      let logs = state.userLogs;
      for (const caller of callers) {
        let user = logs.get(caller.id);
        if (user === undefined) {
          // not active yet
          user = new UserLog(caller.name, caller.avatar);
        }
        if (
          caller.state === "active" &&
          !user.participated.has(state.statement)
        ) {
          if (!changed) {
            logs = new Map(logs.entries());
            changed = true;
          }
          user = new UserLog(
            user.name,
            user.avatar,
            new Set(user.participated),
            user.called
          );
          user.participated.add(state.statement);
          logs.set(caller.id, user);
        } else if (
          caller.state === "calling" &&
          !user.called.has(state.statement)
        ) {
          if (!changed) {
            logs = new Map(logs.entries());
            changed = true;
          }
          user = new UserLog(
            user.name,
            user.avatar,
            user.participated,
            new Set(user.called)
          );
          user.called.add(state.statement);
          logs.set(caller.id, user);
        }
      }
      if (!changed) return null;

      // compute if adding is possible
      const numCalling = callers.reduce(
        (a, c) => a + +(c.state === "calling"),
        0
      );
      const numActive = callers.length - numCalling;

      return {
        userLogs: logs,
        canAdd: numCalling > 0 && numActive < props.maxRoamers,
      };
    });
  };

  tick = (): void => {
    this.setState((state, props) => ({
      secondsLeft:
        props.questionLengthMin * 60 -
        Math.round((+new Date() - +state.startTime) / 1000),
    }));
  };

  addStatement = (): void => {
    this.setState((state) => ({
      statements: [...state.statements, "[click to edit statement]"],
    }));
  };

  updateStatement = (index: number, statement: string): void => {
    this.setState((state) => {
      const newStatements = state.statements.slice();
      newStatements[index] = statement;
      return {
        statements: newStatements,
      };
    });
  };

  startStatement = (index: number): void => {
    this.props.allowCalls.enableCalls();
    this.timerId = window.setInterval(this.tick, 1000);
    this.setState((state, props) => {
      const stat = state.statements[index];
      props.messenger.sendMessage("Starting Statement: " + stat);
      props.about.setAbout("Current Statement: " + stat);
      let ranStatements = state.ranStatements;
      if (!ranStatements.has(index)) {
        ranStatements = new Set(ranStatements);
        ranStatements.add(index);
      }
      return {
        running: true,
        startTime: new Date(),
        secondsLeft: props.questionLengthMin * 60,
        ranStatements: ranStatements,
        statement: index,
      };
    });
    this.callerCallback(this.props.callHandler.getCallers());
  };

  endStatement = (): void => {
    this.props.allowCalls.disableCalls();
    for (const caller of this.props.callHandler.getCallers()) {
      caller.disconnect();
    }
    clearInterval(this.timerId);
    this.setState((state) => {
      return {
        running: false,
        startTime: state.startTime,
        secondsLeft: 0,
        statement: state.statement,
      };
    });
  };

  autoAdd = (): void => {
    const allCallers = this.props.callHandler.getCallers();
    const existing = allCallers.filter((caller) => caller.state === "active")
      .length;
    const eligable = allCallers.filter((caller) => caller.state === "calling");
    // TODO Better algorithm than pure random
    const [accepted, rejected] = pick(
      eligable,
      this.props.maxRoamers - existing
    );
    for (const caller of accepted) {
      caller.connect();
    }
    for (const caller of rejected) {
      caller.disconnect();
    }
  };

  componentDidMount() {
    this.props.callHandler.addCallback(this.callerCallback);
  }

  componentWillUnmount() {
    this.props.callHandler.removeCallback(this.callerCallback);
  }

  render(): React.ReactNode {
    let infoText;
    if (this.state.running) {
      const timeLeft = formatTimeLeft(this.state.secondsLeft);
      const statement = abbrev(this.state.statements[this.state.statement]);
      infoText = `${timeLeft} left in statement: ${statement}`;
    } else if (this.state.statement === -1) {
      infoText = "New roam";
    } else {
      const statement = abbrev(this.state.statements[this.state.statement]);
      infoText = `Finished statement: ${statement}`;
    }
    const autoAddClick =
      this.state.running && this.state.canAdd ? this.autoAdd : undefined;
    const renderedStatements = this.state.statements.map((stat, i) =>
      stat ? (
        <Statement
          key={i}
          index={i}
          statement={stat}
          running={this.state.running && i === this.state.statement}
          ran={this.state.ranStatements.has(i)}
          otherRunning={this.state.running && i !== this.state.statement}
          saveStatement={this.updateStatement}
          startStatement={this.startStatement}
          endStatement={this.endStatement}
        />
      ) : null
    );
    let users;
    if (this.state.userLogs.size) {
      users = [...this.state.userLogs.entries()]
        .sort(([, a], [, b]) => b.priority() - a.priority())
        .map(([id, log]) => (
          <LeaderBoardUser
            key={id}
            name={log.name}
            avatar={log.avatar}
            numCalled={log.called.size}
            numParticipated={log.participated.size}
          />
        ));
    } else {
      users = <div className="item aot-empty">No participants yet</div>;
    }
    return (
      <React.Fragment>
        <Card collapsible={false} title="AOT Controls">
          <div className="item">{infoText}</div>
          <div className="item">
            <Button
              text="Add Participants"
              isPrimary={this.state.running}
              onButtonClick={autoAddClick}
            />
          </div>
          {renderedStatements}
          <div className="item">
            <Button
              text="Add Statement"
              isPrimary={false}
              onButtonClick={this.addStatement}
            />
          </div>
        </Card>
        {/* TODO pull this out as separate element */}
        <Card collapsible={true} title="Leader Board">
          {users}
        </Card>
      </React.Fragment>
    );
  }
}

export async function createControlPanel(sibling: HTMLElement): Promise<void> {
  const taskId = new URLSearchParams(window.location.search).get(
    "live_task_id"
  );
  const [allowCalls, callHandler, messenger, about] = await Promise.all([
    createAllowCalls(),
    createCallHandler(),
    createMessenger(),
    createAbout(),
  ]);

  const root = document.createElement("div");
  root.id = "aot-control";
  sibling.insertAdjacentElement("afterend", root);
  ReactDOM.render(
    <ControlPanel
      taskId={taskId}
      questionLengthMin={7.5}
      maxRoamers={6}
      allowCalls={allowCalls}
      callHandler={callHandler}
      messenger={messenger}
      about={about}
    />,
    root
  );
}

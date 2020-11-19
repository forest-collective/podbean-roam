import React, { useState, useEffect, ReactElement } from "react";
import * as ReactDOM from "react-dom";

import { LeaderBoardUser } from "./leader-board-user";
import { Card } from "./card";
import { Statement } from "./statement";
import { Button } from "./button";
import { createCallHandler, CallHandler, Caller } from "./call-handler";
import { createAllowCalls, AllowCalls } from "./allow-calls";
import { pick, cast } from "./utils";
import { createMessenger, Messenger } from "./messenger";
import { createAbout, About } from "./about";
import { UserLog, downloadParticipation, downloadChat } from "./download";

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

interface Props {
  taskId: string | null;
  questionLengthMin: number;
  maxRoamers: number;
  allowCalls: AllowCalls;
  callHandler: CallHandler;
  messenger: Messenger;
  about: About;
}

function ControlPanel({
  taskId,
  questionLengthMin,
  maxRoamers,
  allowCalls,
  callHandler,
  messenger,
  about,
}: Props): ReactElement {
  const [running, setRunning] = useState(false);
  const [startTime, setStartTime] = useState(new Date());
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [statement, setStatement] = useState(-1);
  const [statements, setStatements] = useState<string[]>([]);
  const [ranStatements, setRanStatements] = useState(new Set<number>());
  const [canAdd, setCanAdd] = useState(false);
  const [userLogs, setUserLogs] = useState(new Map<string, UserLog>());
  const [timerId, setTimerId] = useState(0);

  function startTick(started: Date) {
    setTimerId(
      window.setInterval(() => {
        setSecondsLeft(
          questionLengthMin * 60 - Math.round((+new Date() - +started) / 1000)
        );
      }, 1000)
    );
  }

  useEffect(() => {
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored === null) return; // no data
      const loaded = cast.object(JSON.parse(stored));
      const id = cast.string(loaded.taskId);
      if (id !== taskId) return; // different session

      const newRunning = cast.boolean(loaded.running);
      const newStartTime = new Date(cast.number(loaded.startTime));
      const newSecondsLeft = cast.number(loaded.secondsLeft);
      const newStatement = cast.number(loaded.statement);
      const newStatements = cast(Array, loaded.statements).map(cast.string);
      const newRanStatements = new Set(
        cast(Array, loaded.ranStatements).map(cast.number)
      );
      const newCanAdd = cast.boolean(loaded.canAdd);
      const newUserLogs = new Map(
        cast(Array, loaded.userLogs).map((entry): [string, UserLog] => {
          const [key, log] = cast(Array, entry);
          const newKey = cast.string(key);
          const rec = cast.object(log);
          const newLog = new UserLog(
            cast.string(rec.name),
            cast.string(rec.avatar),
            cast(Array, rec.participated).map(cast.number),
            cast(Array, rec.called).map(cast.number)
          );
          return [newKey, newLog];
        })
      );

      // do all of these last, in case there are errors
      setRunning(newRunning);
      setStartTime(newStartTime);
      setSecondsLeft(newSecondsLeft);
      setStatement(newStatement);
      setStatements(newStatements);
      setRanStatements(newRanStatements);
      setCanAdd(newCanAdd);
      setUserLogs(newUserLogs);

      if (newRunning) {
        startTick(newStartTime);
        allowCalls.enableCalls();
      } else {
        allowCalls.disableCalls();
      }
    } catch (ex) {
      console.error("failed loading state:", ex);
    }
  }, []);

  useEffect(() => {
    if (taskId === null) return;
    const serializedState = {
      taskId,
      running,
      startTime: +startTime,
      secondsLeft,
      statement,
      statements,
      ranStatements: [...ranStatements],
      canAdd,
      userLogs: [...userLogs.entries()].map(([key, log]) => [
        key,
        log.serialize(),
      ]),
    };
    localStorage.setItem(storageKey, JSON.stringify(serializedState));
  });

  function callerCallback(callers: Caller[]): void {
    // compute changes to user stats
    if (!running) return;
    let changed = false;
    let logs = userLogs;
    for (const caller of callers) {
      let user = logs.get(caller.key());
      if (user === undefined) {
        // not active yet
        user = new UserLog(caller.name, caller.avatar);
      }
      if (caller.state === "active" && !user.participated.has(statement)) {
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
        user.participated.add(statement);
        logs.set(caller.key(), user);
      } else if (caller.state === "calling" && !user.called.has(statement)) {
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
        user.called.add(statement);
        logs.set(caller.key(), user);
      }
    }
    if (changed) {
      setUserLogs(logs);
    }

    // compute if adding is possible
    const numCalling = callers.reduce(
      (a, c) => a + +(c.state === "calling"),
      0
    );
    const numActive = callers.length - numCalling;
    const canAdd = numCalling > 0 && numActive < maxRoamers;
    setCanAdd(canAdd);
  }

  useEffect(() => {
    callHandler.addCallback(callerCallback);
    return () => {
      callHandler.removeCallback(callerCallback);
    };
  }, [running, canAdd, userLogs]);

  function addStatement(): void {
    setStatements([...statements, "[click to edit statement]"]);
  }

  function updateStatement(index: number, statement: string): void {
    const newStatements = statements.slice();
    newStatements[index] = statement;
    setStatements(newStatements);
  }

  function startStatement(index: number): void {
    allowCalls.enableCalls();
    const localStartTime = new Date();
    setStartTime(localStartTime);
    startTick(localStartTime);
    const stat = statements[index];
    messenger.sendMessage("Starting Statement: " + stat);
    about.setAbout("Current Statement: " + stat);
    if (!ranStatements.has(index)) {
      const newRanStatements = new Set(ranStatements);
      newRanStatements.add(index);
      setRanStatements(newRanStatements);
    }
    setRunning(true);
    setSecondsLeft(questionLengthMin * 60);
    setStatement(index);
    callerCallback(callHandler.getCallers());
  }

  function endStatement(): void {
    allowCalls.disableCalls();
    for (const caller of callHandler.getCallers()) {
      caller.disconnect();
    }
    clearInterval(timerId);
    const stat = statements[statement];
    about.setAbout("Previous Statement: " + stat);
    setRunning(false);
    setSecondsLeft(0);
  }

  function autoAdd(): void {
    const allCallers = callHandler.getCallers();
    const existing = allCallers.filter((caller) => caller.state === "active")
      .length;
    const eligable = allCallers.filter((caller) => caller.state === "calling");
    // TODO Better algorithm than pure random
    const [accepted, rejected] = pick(eligable, maxRoamers - existing);
    for (const caller of accepted) {
      caller.connect();
    }
    for (const caller of rejected) {
      caller.disconnect();
    }
  }

  let infoText;
  if (running) {
    const timeLeft = formatTimeLeft(secondsLeft);
    const stat = abbrev(statements[statement]);
    infoText = `${timeLeft} left in statement: ${stat}`;
  } else if (statement === -1) {
    infoText = "New roam";
  } else {
    const stat = abbrev(statements[statement]);
    infoText = `Finished statement: ${stat}`;
  }
  const autoAddClick = running && canAdd ? autoAdd : undefined;
  const renderedStatements = statements.map((stat, i) =>
    stat ? (
      <Statement
        key={i}
        index={i}
        statement={stat}
        running={running && i === statement}
        ran={ranStatements.has(i)}
        otherRunning={running && i !== statement}
        saveStatement={updateStatement}
        startStatement={startStatement}
        endStatement={endStatement}
      />
    ) : null
  );
  let users,
    download = undefined;
  if (userLogs.size) {
    users = [...userLogs.entries()]
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
    download = () => downloadParticipation(userLogs);
  } else {
    users = <div className="item aot-empty">No participants yet</div>;
  }
  return (
    <>
      <Card collapsible={true} title="AOT Controls">
        <div className="item">{infoText}</div>
        <div className="item">
          <Button
            text="Add Participants"
            isPrimary={running}
            onButtonClick={autoAddClick}
          />
        </div>
        {renderedStatements}
        <div className="item">
          <Button
            text="Add Statement"
            isPrimary={false}
            onButtonClick={addStatement}
          />
        </div>
      </Card>
      <Card collapsible={true} title="Leader Board">
        {users}
      </Card>
      <Card collapsible={true} title="Downloads">
        <div className="item">
          <Button
            text="Download Participation"
            isPrimary={false}
            onButtonClick={download}
          />
        </div>
        <div className="item">
          <Button
            text="Download Chat"
            isPrimary={false}
            onButtonClick={downloadChat}
          />
        </div>
      </Card>
    </>
  );
}

export async function createControlPanel(music: HTMLElement): Promise<void> {
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
  music.insertAdjacentElement("beforebegin", root);
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

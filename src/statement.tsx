import React, {
  useState,
  ReactElement,
  ChangeEvent,
  KeyboardEvent,
} from "react";

import { Button } from "./button";

interface Props {
  index: number;
  statement: string;
  running: boolean;
  ran: boolean;
  otherRunning: boolean;
  saveStatement: (index: number, statement: string) => void;
  startStatement: (index: number) => void;
  endStatement: () => void;
}

export function Statement({
  index,
  statement,
  running,
  ran,
  otherRunning,
  saveStatement,
  startStatement,
  endStatement,
}: Props): ReactElement {
  const [editStatement, setStatement] = useState(statement);
  const [beingEdited, setEditStatus] = useState(false);

  function makeEditable(): void {
    setStatement(statement);
    setEditStatus(true);
  }

  function handleChange(event: ChangeEvent<HTMLTextAreaElement>): void {
    setStatement(event.target.value);
  }

  function handleSave(): void {
    setEditStatus(false);
    saveStatement(index, editStatement);
  }

  function handleKeyPress(event: KeyboardEvent): void {
    if (event.key === "Enter") {
      handleSave();
    }
  }

  function handleStart(): void {
    startStatement(index);
  }

  let statementArea, button;
  if (beingEdited) {
    statementArea = (
      <textarea
        value={editStatement}
        onChange={handleChange}
        onKeyPress={handleKeyPress}
        autoFocus
      />
    );
  } else {
    statementArea = <div onClick={makeEditable}>{statement}</div>;
  }
  const startText = ran ? "Restart" : "Start";
  if (beingEdited) {
    button = <Button text="Save" isPrimary={true} onButtonClick={handleSave} />;
  } else if (running) {
    button = (
      <Button text="Stop" isPrimary={true} onButtonClick={endStatement} />
    );
  } else if (otherRunning) {
    button = <Button text={startText} isPrimary={false} />;
  } else {
    button = (
      <Button text={startText} isPrimary={!ran} onButtonClick={handleStart} />
    );
  }
  return (
    <div className="item aot--statement">
      {statementArea}
      <div>{button}</div>
    </div>
  );
}

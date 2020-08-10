import * as React from "react";

import { Button } from "./button";

export interface StatementProps {
  index: number;
  statement: string;
  running: boolean;
  ran: boolean;
  otherRunning: boolean;
  saveStatement: (index: number, statement: string) => void;
  startStatement: (index: number) => void;
  endStatement: () => void;
}

class StatementState {
  constructor(public statement: string, public beingEdited: boolean = false) {}
}

export class Statement extends React.Component<StatementProps, StatementState> {
  state: StatementState = new StatementState(this.props.statement);

  makeEditable = (): void => {
    this.setState({ beingEdited: true, statement: this.props.statement });
  };

  handleChange = (event: React.ChangeEvent<HTMLTextAreaElement>): void => {
    this.setState({ statement: event.target.value });
  };

  handleSave = (): void => {
    this.setState({ beingEdited: false });
    this.props.saveStatement(this.props.index, this.state.statement);
  };

  handleKeyPress = (event: React.KeyboardEvent): void => {
    if (event.key === "Enter") {
      this.handleSave();
    }
  };

  handleStart = (): void => {
    this.props.startStatement(this.props.index);
  };

  render(): React.ReactNode {
    let statementArea, button;
    if (this.state.beingEdited) {
      statementArea = (
        <textarea
          value={this.state.statement}
          onChange={this.handleChange}
          onKeyPress={this.handleKeyPress}
          autoFocus
        />
      );
    } else {
      statementArea = (
        <div onClick={this.makeEditable}>{this.props.statement}</div>
      );
    }
    const startText = this.props.ran ? "Restart" : "Start";
    if (this.state.beingEdited) {
      button = (
        <Button text="Save" isPrimary={true} onButtonClick={this.handleSave} />
      );
    } else if (this.props.running) {
      button = (
        <Button
          text="Stop"
          isPrimary={true}
          onButtonClick={this.props.endStatement}
        />
      );
    } else if (this.props.otherRunning) {
      button = <Button text={startText} isPrimary={false} />;
    } else {
      button = (
        <Button
          text={startText}
          isPrimary={!this.props.ran}
          onButtonClick={this.handleStart}
        />
      );
    }
    return (
      <div className="item aot--statement">
        {statementArea}
        <div>{button}</div>
      </div>
    );
  }
}

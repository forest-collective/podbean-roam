import * as React from "react";

export interface ButtonProps {
  isPrimary: boolean;
  text: string;
  onButtonClick?: (e: React.MouseEvent) => void;
}

export class Button extends React.Component<ButtonProps> {
  render(): React.ReactNode {
    let classes = "el-button el-button--small";
    if (this.props.isPrimary) {
      classes += " el-button--primary";
    }
    if (this.props.onButtonClick === undefined) {
      classes += " is-disabled";
    }
    return (
      <button
        type="button"
        className={classes}
        disabled={this.props.onButtonClick === undefined}
        onClick={this.props.onButtonClick}
      >
        {this.props.text}
      </button>
    );
  }
}

import React, { ReactElement, MouseEvent } from "react";

interface Props {
  isPrimary: boolean;
  text: string;
  onButtonClick?: (e: MouseEvent) => void;
}

export function Button({
  isPrimary,
  text,
  onButtonClick,
}: Props): ReactElement {
  let classes = "el-button el-button--small";
  if (isPrimary) {
    classes += " el-button--primary";
  }
  if (onButtonClick === undefined) {
    classes += " is-disabled";
  }
  return (
    <button
      type="button"
      className={classes}
      disabled={onButtonClick === undefined}
      onClick={onButtonClick}
    >
      {text}
    </button>
  );
}

const defaultProps: Partial<Props> = {
  isPrimary: false,
};
Button.defaultProps = defaultProps;

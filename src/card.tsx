import React, { useState, ReactElement, PropsWithChildren } from "react";

interface Props {
  title: string;
  collapsible: boolean;
}

export function Card({
  title,
  collapsible,
  children,
}: PropsWithChildren<Props>): ReactElement {
  const [collapsed, setCollapsed] = useState(true);

  function toggle(): void {
    setCollapsed(!collapsed);
  }

  let headerClass, headerCallback, arrow;
  if (collapsible) {
    const classSuffix = collapsed ? "" : " is-active";
    const iconClass = `el-collapse-item__arrow el-icon-arrow-right${classSuffix}`;
    headerClass = `el-collapse-item__header${classSuffix}`;
    arrow = <i className={iconClass}></i>;
    headerCallback = toggle;
  } else {
    headerClass = "el-card__header";
  }
  const body =
    collapsible && collapsed ? null : (
      <div className="el-card__body">{children}</div>
    );
  return (
    <div className="el-card is-always-shadow">
      <div className={headerClass} onClick={headerCallback}>
        {title}
        {arrow}
      </div>
      {body}
    </div>
  );
}
const defaultProps: Partial<Props> = {
  collapsible: true,
};
Card.defaultProps = defaultProps;

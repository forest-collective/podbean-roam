import * as React from "react";

export interface CardProps {
  title: string;
  collapsible: boolean;
}

class CardState {
  constructor(public readonly collapsed: boolean = false) {}
}

export class Card extends React.Component<CardProps, CardState> {
  state: CardState = new CardState();

  toggleCollapsed = (): void => {
    this.setState((state) => ({ collapsed: !state.collapsed }));
  };

  render(): React.ReactNode {
    let headerClass, headerCallback, arrow;
    if (this.props.collapsible) {
      const classSuffix = this.state.collapsed ? "" : " is-active";
      const iconClass = `el-collapse-item__arrow el-icon-arrow-right${classSuffix}`;
      headerClass = `el-collapse-item__header${classSuffix}`;
      arrow = <i className={iconClass}></i>;
      headerCallback = this.toggleCollapsed;
    } else {
      headerClass = "el-card__header";
    }
    const body = this.state.collapsed ? null : (
      <div className="el-card__body">{this.props.children}</div>
    );
    return (
      <div className="el-card is-always-shadow">
        <div className={headerClass} onClick={headerCallback}>
          {this.props.title}
          {arrow}
        </div>
        {body}
      </div>
    );
  }
}

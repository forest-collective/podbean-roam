import * as React from "react";

export interface AvatarProps {
  src: string;
}

export class Avatar extends React.Component<AvatarProps> {
  render(): React.ReactNode {
    return (
      <span className="el-avatar el-avatar--circle aot--avatar">
        <img src={this.props.src} />
      </span>
    );
  }
}

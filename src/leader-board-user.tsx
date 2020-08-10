import * as React from "react";

import { Avatar } from "./avatar";

export interface LeaderBoardUserProps {
  name: string;
  avatar: string;
  numCalled: number;
  numParticipated: number;
}

export class LeaderBoardUser extends React.Component<LeaderBoardUserProps> {
  render(): React.ReactNode {
    return (
      <div className="item aot-stats">
        <Avatar src={this.props.avatar} />
        <span className="aot-stats--name">{this.props.name}</span>
        <span>
          C: {this.props.numCalled} P: {this.props.numParticipated}
        </span>
      </div>
    );
  }
}

import React, { ReactElement } from "react";

import { Avatar } from "./avatar";

interface Props {
  name: string;
  avatar: string;
  numCalled: number;
  numParticipated: number;
}

export function LeaderBoardUser({
  name,
  avatar,
  numCalled,
  numParticipated,
}: Props): ReactElement {
  return (
    <div className="item aot-stats">
      <Avatar src={avatar} />
      <span className="aot-stats--name">{name}</span>
      <span>
        C: {numCalled} P: {numParticipated}
      </span>
    </div>
  );
}

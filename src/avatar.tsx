import React, { ReactElement } from "react";

export interface AvatarProps {
  src: string;
}

export function Avatar({ src }: { src: string }): ReactElement {
  return (
    <span className="el-avatar el-avatar--circle aot--avatar">
      <img src={src} />
    </span>
  );
}

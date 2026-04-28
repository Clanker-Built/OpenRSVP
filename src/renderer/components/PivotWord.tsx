import type { CSSProperties } from 'react';

interface Props {
  display: string;
  pivotIdx: number;
  fontSizePx: number;
  pivotColor: string;
}

export function PivotWord({ display, pivotIdx, fontSizePx, pivotColor }: Props) {
  // Split the displayed unit into [pre][pivot][post]. The pivot column is rendered at
  // a fixed horizontal position via CSS grid so the eye never has to move.
  const chars = [...display];
  const idx = Math.max(0, Math.min(pivotIdx, chars.length - 1));
  const pre = chars.slice(0, idx).join('');
  const pivot = chars[idx] ?? ' ';
  const post = chars.slice(idx + 1).join('');

  const style: CSSProperties = {
    fontSize: `${fontSizePx}px`,
    lineHeight: 1.1,
    minHeight: `${fontSizePx * 1.1}px`
  };

  return (
    <div className="pivotword" style={style}>
      <span className="pre">{pre}</span>
      <span className="pivot" style={{ color: pivotColor }}>{pivot}</span>
      <span className="post">{post}</span>
    </div>
  );
}

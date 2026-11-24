import { memo, useEffect, useState, type RefObject } from 'react';
import type { GameBoard } from '../data/gameMechanics';

type Board = Extract<GameBoard, { kind: 'association' }>;
type Point = { x: number; y: number };

export const GameBeams = memo(function GameBeams({ grid, board }: { grid: RefObject<HTMLDivElement | null>; board: Board }) {
  const [ends, setEnds] = useState<{ sources: Point[]; destinations: Point[] }>();
  const { sources, destinations, pairs, locked, checked } = board;

  useEffect(() => {
    const root = grid.current;
    if (!root) return;
    const sourceButtons = [...root.querySelectorAll<HTMLElement>('[data-source-index]')];
    const destinationButtons = [...root.querySelectorAll<HTMLElement>('[data-destination-index]')];
    let frame = 0;
    const observer = new ResizeObserver(() => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const origin = root.getBoundingClientRect();
        const measure = (button: HTMLElement, edge: 'left' | 'right') => {
          const rect = button.getBoundingClientRect();
          return { x: rect[edge] - origin.left, y: rect.top + rect.height / 2 - origin.top };
        };
        setEnds({ sources: sourceButtons.map(button => measure(button, 'right')),
          destinations: destinationButtons.map(button => measure(button, 'left')) });
      });
    });
    [root, ...sourceButtons, ...destinationButtons].forEach(element => observer.observe(element));
    return () => { observer.disconnect(); cancelAnimationFrame(frame); };
  }, [grid, sources, destinations]);

  return <svg className="game-beams" aria-hidden="true" focusable="false">
    {ends && Object.entries(pairs).map(([source, destination]) => {
      const sourceIndex = sources.indexOf(source), destinationIndex = destinations.indexOf(destination);
      const from = ends.sources[sourceIndex], to = ends.destinations[destinationIndex];
      if (!from || !to) return null;
      const middle = (from.x + to.x) / 2;
      return <path key={`${source}:${destination}`} data-source={sourceIndex} data-destination={destinationIndex}
        data-pair={locked.includes(source) ? 'correct' : checked ? 'wrong' : undefined} pathLength="1"
        d={`M${from.x} ${from.y} C${middle} ${from.y} ${middle} ${to.y} ${to.x} ${to.y}`} />;
    })}
  </svg>;
});

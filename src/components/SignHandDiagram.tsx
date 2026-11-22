import { useEffect, useRef } from 'react';
import type { Finger, HandDiagram } from '../data/library';

const fingers = [
  { id: 'little', x: 55, top: 71, bend: -8 }, { id: 'ring', x: 72, top: 48, bend: -5 },
  { id: 'middle', x: 90, top: 38, bend: -1 }, { id: 'index', x: 109, top: 45, bend: 2 },
] as const;

/** Original diagram of extended and flexed fingers in the MINEDU numeric postures. */
export function SignHandDiagram({ diagram }: { diagram: HandDiagram }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const drawing = ref.current?.getContext('2d');
    if (!drawing) return;
    drawing.setTransform(2, 0, 0, 2, 0, 0);
    drawing.clearRect(0, 0, 180, 220);
    drawing.lineJoin = 'round';
    drawing.lineCap = 'round';
    const draw = (path: string, fill?: string, ink = '#382750', weight = 3) => {
      const shape = new Path2D(path);
      if (fill) { drawing.fillStyle = fill; drawing.fill(shape); }
      drawing.lineWidth = weight;
      drawing.strokeStyle = ink;
      drawing.stroke(shape);
    };
    const open = new Set<Finger>(diagram.extended);
    const skin = '#f2c7a5';

    for (const finger of fingers) {
      if (!open.has(finger.id)) continue;
      const { x, top, bend } = finger, tip = x + bend;
      draw(`M${x - 8} 136 Q${tip - 8} 88 ${tip - 8} ${top + 10} Q${tip - 8} ${top} ${tip} ${top} Q${tip + 8} ${top} ${tip + 8} ${top + 11}
        L${x + 9} 136 Z`, skin);
      draw(`M${tip - 4} ${top + 23} Q${tip} ${top + 21} ${tip + 4} ${top + 24}`, undefined, '#a97365', 1.5);
    }
    const raisedThumb = 'C132 142 140 120 152 116 Q162 114 161 124 C157 136 150 149 145 158 C140 173 132 183 123 191 L121 209';
    const tuckedThumb = 'C132 144 140 157 134 170 Q131 179 116 191 L114 209';
    draw(`M72 209 L71 189 C56 180 49 161 48 142 Q46 127 57 122 Q72 117 82 123 Q99 117 112 123 Q123 121 126 136 ${open.has('thumb') ? raisedThumb : tuckedThumb}
      Q93 213 72 209 Z`, skin);
    for (const { id, x } of fingers) {
      if (open.has(id)) continue;
      draw(`M${x - 9} 134 Q${x - 10} 122 ${x - 4} 119 Q${x + 7} 115 ${x + 9} 126 L${x + 10} 147 Q${x + 6} 155 ${x - 2} 152 Q${x - 9} 147 ${x - 9} 134 Z`, '#e8af91');
      draw(`M${x - 4} 140 Q${x + 1} 138 ${x + 5} 141`, undefined, '#a97365', 1.5);
    }
    if (!open.has('thumb')) draw('M129 168 Q126 147 116 139 L105 130 Q97 126 93 131 Q91 138 99 145 L111 158', skin);
    draw(open.has('thumb') ? 'M133 147 Q114 156 113 179 M66 161 Q78 174 96 169' : 'M72 163 Q80 177 98 176', undefined, '#a97365', 2);
  }, [diagram]);

  return <canvas className="sign-hand-diagram" ref={ref} width={360} height={440} role="img" aria-label={diagram.description} />;
}

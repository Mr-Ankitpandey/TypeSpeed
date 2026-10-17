import { memo, useEffect, useMemo, useRef, type RefObject } from 'react';
import type { Operation } from '@typespeed/typing-engine';
// Static and completed blocks keep their DOM; only the active block reconciles.
const CharacterBlock = memo(function CharacterBlock({
  text,
  typed,
  cursorIndex,
  cursor,
}: {
  text: string;
  typed: string;
  cursorIndex: number;
  cursor: RefObject<HTMLSpanElement | null>;
}) {
  return (
    <>
      {Array.from(text).map((char, i) => (
        <span
          key={i}
          ref={i === cursorIndex ? cursor : undefined}
          className={`${i < typed.length ? (typed[i] === char ? 'correct' : 'incorrect') : ''} ${i === cursorIndex ? 'cursor' : ''}`}
        >
          {char}
        </span>
      ))}
    </>
  );
});
export function TypingArea({
  passage,
  typed,
  onOperation,
  disabled = false,
}: {
  passage: string;
  typed: string;
  onOperation: (op: Operation) => void;
  disabled?: boolean;
}) {
  const cursor = useRef<HTMLSpanElement>(null);
  const area = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (cursor.current && area.current)
      area.current.scrollTop = Math.max(0, cursor.current.offsetTop - 55);
  }, [typed.length]);
  const characters = useMemo(
    () =>
      Array.from({ length: Math.ceil(passage.length / 80) }, (_, block) => {
        const start = block * 80;
        const cursorIndex =
          typed.length >= start && typed.length < start + 80
            ? typed.length - start
            : -1;
        return (
          <CharacterBlock
            key={block}
            text={passage.slice(start, start + 80)}
            typed={typed.slice(start, start + 80)}
            cursorIndex={cursorIndex}
            cursor={cursor}
          />
        );
      }),
    [passage, typed],
  );
  return (
    <div
      className={`typing-area ${disabled ? 'disabled' : ''}`}
      ref={area}
      tabIndex={disabled ? -1 : 0}
      role="textbox"
      aria-label="Typing passage"
      aria-multiline="true"
      aria-disabled={disabled}
      onPaste={(e) => e.preventDefault()}
      onDrop={(e) => e.preventDefault()}
      onKeyDown={(e) => {
        if (
          disabled ||
          e.ctrlKey ||
          e.altKey ||
          e.metaKey ||
          e.nativeEvent.isComposing
        )
          return;
        if (e.key === 'Backspace') {
          e.preventDefault();
          onOperation({ kind: 'delete' });
        } else if (/^[\x20-\x7e]$/.test(e.key)) {
          e.preventDefault();
          onOperation({ kind: 'insert', char: e.key });
        }
      }}
    >
      {characters}
    </div>
  );
}

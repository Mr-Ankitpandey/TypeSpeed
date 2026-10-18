import { memo, useEffect, useMemo, useRef, type RefObject } from 'react';
import { isTypingCharacter, type Operation } from '@typespeed/typing-engine';
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
  multiline = false,
}: {
  passage: string;
  typed: string;
  onOperation: (op: Operation) => void;
  disabled?: boolean;
  multiline?: boolean;
}) {
  const cursor = useRef<HTMLSpanElement>(null);
  const area = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLTextAreaElement>(null);
  const composed = useRef<string | null>(null);
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
    <div className="typing-surface">
      <div
        className={`typing-area ${disabled ? 'disabled' : ''}`}
        ref={area}
        tabIndex={disabled ? -1 : 0}
        role="textbox"
        aria-label="Typing passage"
        aria-multiline="true"
        aria-disabled={disabled}
        onClick={() => {
          if (!disabled) input.current?.focus({ preventScroll: true });
        }}
        onFocus={() => {
          if (!disabled) input.current?.focus({ preventScroll: true });
        }}
        onPaste={(e) => e.preventDefault()}
        onDrop={(e) => e.preventDefault()}
        onKeyDown={(e) => {
          if (
            disabled ||
            e.target instanceof HTMLTextAreaElement ||
            e.ctrlKey ||
            e.altKey ||
            e.metaKey ||
            e.nativeEvent.isComposing
          )
            return;
          if (multiline && e.key === 'Enter') {
            e.preventDefault();
            onOperation({ kind: 'insert', char: '\n' });
          } else if (e.key === 'Backspace') {
            e.preventDefault();
            onOperation({ kind: 'delete' });
          } else if (isTypingCharacter(e.key)) {
            e.preventDefault();
            onOperation({ kind: 'insert', char: e.key });
          }
        }}
      >
        {characters}
      </div>
      <textarea
        ref={input}
        tabIndex={-1}
        className="mobile-typing-input"
        aria-label="Mobile typing input"
        defaultValue={'\u200b'}
        disabled={disabled}
        autoCapitalize="off"
        autoCorrect="off"
        spellCheck={false}
        onPaste={(e) => e.preventDefault()}
        onDrop={(e) => e.preventDefault()}
        onInput={(e) => {
          const event = e.nativeEvent as InputEvent;
          if (event.isComposing) return;
          if (
            composed.current !== null &&
            (event.inputType === 'insertCompositionText' ||
              event.data === composed.current)
          ) {
            composed.current = null;
            e.currentTarget.value = '\u200b';
            return;
          }
          composed.current = null;
          if (multiline && event.inputType === 'insertLineBreak')
            onOperation({ kind: 'insert', char: '\n' });
          else if (event.inputType === 'deleteContentBackward')
            onOperation({ kind: 'delete' });
          else if (
            event.inputType !== 'insertFromPaste' &&
            event.inputType !== 'insertFromDrop'
          ) {
            for (const char of (
              event.data ?? e.currentTarget.value.replace(/\u200b/g, '')
            )
              .normalize('NFC')
              .slice(0, 32))
              if (isTypingCharacter(char))
                onOperation({ kind: 'insert', char });
          }
          e.currentTarget.value = '\u200b';
        }}
        onCompositionEnd={(e) => {
          composed.current = e.data;
          setTimeout(() => {
            composed.current = null;
          }, 0);
          for (const char of e.data.normalize('NFC').slice(0, 32))
            if (isTypingCharacter(char)) onOperation({ kind: 'insert', char });
          e.currentTarget.value = '\u200b';
        }}
      />
    </div>
  );
}

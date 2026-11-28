// Renders WhatsApp-formatted text as React nodes (no innerHTML):
// *bold*  _italic_  ~strike~  `inline`  ```block```  bullet lines  and bare URLs.

const INLINE_PATTERN =
  /(?<![\w*])\*(?!\s)([^*\n]+?)(?<!\s)\*(?![\w*])|(?<![\w_])_(?!\s)([^_\n]+?)(?<!\s)_(?![\w_])|(?<![\w~])~(?!\s)([^~\n]+?)(?<!\s)~(?![\w~])|`([^`\n]+)`|(https?:\/\/[^\s<>()]+[^\s<>().,!?;:'"])/g;

function renderInline(text, keyBase) {
  const nodes = [];
  let lastIndex = 0;
  let match;
  let index = 0;
  INLINE_PATTERN.lastIndex = 0;
  while ((match = INLINE_PATTERN.exec(text)) !== null) {
    if (match.index > lastIndex) nodes.push(text.slice(lastIndex, match.index));
    const key = `${keyBase}-${index++}`;
    if (match[1] !== undefined) nodes.push(<strong key={key} className="font-semibold">{match[1]}</strong>);
    else if (match[2] !== undefined) nodes.push(<em key={key}>{match[2]}</em>);
    else if (match[3] !== undefined) nodes.push(<s key={key}>{match[3]}</s>);
    else if (match[4] !== undefined)
      nodes.push(
        <code key={key} className="rounded bg-black/5 px-1 font-mono text-[0.92em]">
          {match[4]}
        </code>,
      );
    else if (match[5] !== undefined)
      nodes.push(
        <a
          key={key}
          href={match[5]}
          target="_blank"
          rel="noopener noreferrer"
          className="break-all text-sky-600 underline underline-offset-2"
        >
          {match[5]}
        </a>,
      );
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < text.length) nodes.push(text.slice(lastIndex));
  return nodes;
}

const BULLET_PATTERN = /^\s*(?:[•\-*]|\d{1,2}[.)])\s+/;

function renderLines(text, keyBase) {
  const lines = text.split("\n");
  return lines.map((line, i) => {
    const key = `${keyBase}-l${i}`;
    if (!line.trim()) return <span key={key} className="block h-2" aria-hidden="true" />;
    const bullet = line.match(BULLET_PATTERN);
    if (bullet) {
      const marker = bullet[0].trim();
      const isNumbered = /\d/.test(marker);
      return (
        <span key={key} className="flex gap-1.5">
          <span className="shrink-0 select-none opacity-70">{isNumbered ? marker : "•"}</span>
          <span className="min-w-0">{renderInline(line.slice(bullet[0].length), key)}</span>
        </span>
      );
    }
    return (
      <span key={key} className="block">
        {renderInline(line, key)}
      </span>
    );
  });
}

export default function WhatsAppText({ text, className = "" }) {
  const source = String(text || "");
  const parts = source.split(/```/);
  return (
    <div className={`whitespace-normal break-words leading-snug ${className}`}>
      {parts.map((part, i) =>
        i % 2 === 1 ? (
          <pre
            key={`b${i}`}
            className="my-1 overflow-x-auto whitespace-pre-wrap rounded-md bg-black/5 p-2 font-mono text-[0.85em]"
          >
            {part.replace(/^\n|\n$/g, "")}
          </pre>
        ) : (
          <span key={`t${i}`} className="block">
            {renderLines(part, `t${i}`)}
          </span>
        ),
      )}
    </div>
  );
}

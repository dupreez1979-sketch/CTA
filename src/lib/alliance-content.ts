/**
 * Markdown-lite parser for Alliance update content. The admin types into one
 * big box; groupings differ every time, so the format is deliberately light:
 *
 *   ## Group heading      -> Heading 1 ( # or ## )
 *   ### Sub heading       -> Heading 2 ( ### or deeper )
 *   - a point             -> a bullet ( -, * or • start a list item )
 *   ![caption](url)       -> an inline image (a line on its own)
 *   ![caption](url =50%)  -> the same image at 50% width (1–100%, default 100)
 *   ![](url center)       -> block image aligned left / center / right
 *   ![](url =40% wrap-left)  -> image floats so following text wraps around it
 *                              (wrap-left / wrap-right). Width + alignment can
 *                              appear in any order after the URL.
 *   plain text            -> a paragraph (consecutive lines join with a space)
 *   (blank line)          -> separates blocks
 *
 * Output is a list of blocks the email template renders into styled headings,
 * bullet lists, images and paragraphs. Pure and dependency-free so it is easy
 * to test.
 */

export type Block =
  | { type: "heading"; level: 1 | 2; text: string }
  | { type: "para"; text: string }
  | { type: "list"; items: string[] }
  | {
      type: "image";
      url: string;
      alt: string;
      /** Display width as a percent of the column (1–100). */
      width?: number;
      /** Block alignment when the image sits on its own line. */
      align?: "left" | "center" | "right";
      /** Float so following text wraps around the image ("inline with text"). */
      float?: "left" | "right";
    };

export function parseAllianceContent(input: string): Block[] {
  const lines = (input ?? "").replace(/\r\n?/g, "\n").split("\n");
  const blocks: Block[] = [];
  let para: string[] = [];
  let list: string[] = [];

  const flushPara = () => {
    if (para.length) {
      blocks.push({ type: "para", text: para.join(" ") });
      para = [];
    }
  };
  const flushList = () => {
    if (list.length) {
      blocks.push({ type: "list", items: list });
      list = [];
    }
  };
  const flush = () => {
    flushPara();
    flushList();
  };

  for (const raw of lines) {
    const line = raw.trim();
    if (line === "") {
      flush();
      continue;
    }
    // A line on its own that is a markdown image, with an optional trailing
    // width percentage and/or alignment keyword in any order:
    //   ![caption](url)                  ![caption](url =50%)
    //   ![](url center)                  ![](url =40% wrap-left)
    const image = line.match(/^!\[([^\]]*)\]\((\S+?)(\s+[^)]*)?\)$/);
    if (image) {
      flush();
      const tail = image[3] ?? "";
      const pctMatch = tail.match(/=(\d{1,3})%/);
      const pct = pctMatch ? Number(pctMatch[1]) : undefined;
      // wrap-* must be tested before the bare left/right so it wins.
      const kw = tail
        .match(/\b(wrap-left|wrap-right|centre|center|left|right)\b/i)?.[1]
        .toLowerCase();
      const float =
        kw === "wrap-left" ? "left" : kw === "wrap-right" ? "right" : undefined;
      const align =
        kw === "left" || kw === "right"
          ? (kw as "left" | "right")
          : kw === "center" || kw === "centre"
            ? "center"
            : undefined;
      blocks.push({
        type: "image",
        alt: image[1].trim(),
        url: image[2].trim(),
        ...(pct ? { width: Math.min(100, Math.max(1, pct)) } : {}),
        ...(align ? { align } : {}),
        ...(float ? { float } : {}),
      });
      continue;
    }
    const heading = line.match(/^(#{1,6})\s*(.+)$/);
    if (heading) {
      flush();
      // # and ## are Heading 1; ### (or deeper) is a Heading 2 sub heading.
      const level = heading[1].length >= 3 ? 2 : 1;
      blocks.push({ type: "heading", level, text: heading[2].trim() });
      continue;
    }
    const bullet = line.match(/^[-*•]\s+(.+)$/);
    if (bullet) {
      flushPara();
      list.push(bullet[1].trim());
      continue;
    }
    // A plain line: part of a paragraph. Close any open list first.
    flushList();
    para.push(line);
  }
  flush();
  return blocks;
}

/** An inline run inside a paragraph or bullet: plain text or a link. */
export type Inline =
  | { type: "text"; text: string }
  | { type: "link"; text: string; url: string };

/**
 * Split a paragraph/bullet string into text runs and markdown links
 * `[link text](url)`. Pure and render-agnostic (the email template turns links
 * into <a>). Text with no links returns a single text run.
 */
export function parseInline(input: string): Inline[] {
  const out: Inline[] = [];
  const re = /\[([^\]]+)\]\(([^)\s]+)\)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(input)) !== null) {
    if (m.index > last) {
      out.push({ type: "text", text: input.slice(last, m.index) });
    }
    out.push({ type: "link", text: m[1], url: m[2] });
    last = m.index + m[0].length;
  }
  if (last < input.length) {
    out.push({ type: "text", text: input.slice(last) });
  }
  if (out.length === 0) out.push({ type: "text", text: input });
  return out;
}

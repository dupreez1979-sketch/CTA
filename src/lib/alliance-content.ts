/**
 * Markdown-lite parser for Alliance update content. The admin types into one
 * big box; groupings differ every time, so the format is deliberately light:
 *
 *   ## Group heading      -> Heading 1 ( # or ## )
 *   ### Sub heading       -> Heading 2 ( ### or deeper )
 *   - a point             -> a bullet ( -, * or • start a list item )
 *   ![caption](url)       -> an inline image (a line on its own)
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
  | { type: "image"; url: string; alt: string };

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
    // A line on its own that is a markdown image: ![caption](url).
    const image = line.match(/^!\[([^\]]*)\]\(([^)]+)\)$/);
    if (image) {
      flush();
      blocks.push({
        type: "image",
        alt: image[1].trim(),
        url: image[2].trim(),
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

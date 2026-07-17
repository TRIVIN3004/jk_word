import { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, HeadingLevel, AlignmentType, WidthType } from 'docx';

/**
 * Programmatically converts chapters' HTML content back into a professional DOCX buffer.
 */
export async function exportChaptersToDocx(chapters) {
  const docSections = [];

  // 1. Cover Page / Title Section
  const titleParagraphs = [
    new Paragraph({
      text: "CORPORATE KNOWLEDGE PORTAL",
      heading: HeadingLevel.TITLE,
      alignment: AlignmentType.CENTER,
      spacing: { before: 1200, after: 300 }
    }),
    new Paragraph({
      text: "Interactive System Documentation Handbook",
      heading: HeadingLevel.HEADING_1,
      alignment: AlignmentType.CENTER,
      spacing: { after: 1200 }
    }),
    new Paragraph({
      text: `Generated on: ${new Date().toLocaleDateString()}`,
      alignment: AlignmentType.CENTER,
      spacing: { after: 200 }
    }),
    new Paragraph({
      text: "Classification: Internal Confidential",
      alignment: AlignmentType.CENTER
    })
  ];

  docSections.push({
    properties: {},
    children: [
      ...titleParagraphs,
      new Paragraph({ text: "", spacing: { before: 240 } }) // Spacing or page break helper
    ]
  });

  // Sort chapters by order
  const sortedChapters = [...chapters].sort((a, b) => a.order - b.order);

  // 2. Chapters Sections
  const chapterChildren = [];
  
  for (const ch of sortedChapters) {
    // Add page break or space before new chapter
    chapterChildren.push(
      new Paragraph({
        text: "",
        spacing: { before: 400, after: 100 }
      })
    );

    chapterChildren.push(
      new Paragraph({
        text: ch.title,
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 400, after: 200 }
      })
    );

    // Simple HTML parsing to extract text blocks and tables
    const html = ch.content || '';
    
    // Split content by tags (p, table, ul, ol, h2, h3)
    const tagRegex = /(<p[^>]*>.*?<\/p>|<table[^>]*>.*?<\/table>|<ul[^>]*>.*?<\/ul>|<ol[^>]*>.*?<\/ol>|<h2[^>]*>.*?<\/h2>|<h3[^>]*>.*?<\/h3>)/gis;
    const blocks = html.match(tagRegex) || [html];

    for (const block of blocks) {
      const cleanBlock = block.trim();
      if (!cleanBlock) continue;

      if (cleanBlock.startsWith('<h2')) {
        const text = cleanText(cleanBlock);
        chapterChildren.push(new Paragraph({ text, heading: HeadingLevel.HEADING_2, spacing: { before: 200, after: 100 } }));
      } else if (cleanBlock.startsWith('<h3')) {
        const text = cleanText(cleanBlock);
        chapterChildren.push(new Paragraph({ text, heading: HeadingLevel.HEADING_3, spacing: { before: 150, after: 80 } }));
      } else if (cleanBlock.startsWith('<table')) {
        // Table Parser
        const table = parseHtmlTableToDocx(cleanBlock);
        if (table) {
          chapterChildren.push(table);
        }
      } else if (cleanBlock.startsWith('<ul') || cleanBlock.startsWith('<ol')) {
        const isNumbered = cleanBlock.startsWith('<ol');
        const liRegex = /<li[^>]*>(.*?)<\/li>/gis;
        const lis = cleanBlock.match(liRegex) || [];
        
        lis.forEach((li, idx) => {
          const rawLiText = cleanText(li);
          chapterChildren.push(
            new Paragraph({
              text: rawLiText,
              bullet: isNumbered ? undefined : { level: 0 },
              numbering: isNumbered ? { reference: "numbered-list", level: 0 } : undefined,
              spacing: { after: 60 }
            })
          );
        });
      } else {
        // Standard paragraph
        const textRuns = parseTextRuns(cleanBlock);
        if (textRuns.length > 0) {
          chapterChildren.push(
            new Paragraph({
              children: textRuns,
              spacing: { after: 120 }
            })
          );
        }
      }
    }
  }

  docSections.push({
    properties: {},
    children: chapterChildren
  });

  const doc = new Document({
    sections: docSections
  });

  return await Packer.toBuffer(doc);
}

// Helpers for clean strings and text formatting
function cleanText(htmlStr) {
  return htmlStr.replace(/<[^>]*>/g, '').trim();
}

/**
 * Parses bold, italic, underline, and links inside text blocks into TextRuns
 */
function parseTextRuns(htmlStr) {
  // Strip outer paragraph tags if present
  let content = htmlStr.replace(/^<p[^>]*>/i, '').replace(/<\/p>$/i, '').trim();
  if (!content) return [];

  // A simplified parser that breaks text by tags and creates text runs
  // For production complexity, we tokenise or split by format tags
  // We'll scan tags and build TextRuns
  const runs = [];
  const tagRegex = /(<strong>.*?<\/strong>|<b>.*?<\/b>|<em>.*?<\/em>|<i>.*?<\/i>|<u>.*?<\/u>|<code[^>]*>.*?<\/code>)/gi;
  const parts = content.split(tagRegex);

  for (const part of parts) {
    if (!part) continue;

    let bold = false;
    let italic = false;
    let underline = false;
    let text = part;

    if (part.startsWith('<strong>') || part.startsWith('<b>')) {
      bold = true;
      text = cleanText(part);
    } else if (part.startsWith('<em>') || part.startsWith('<i>')) {
      italic = true;
      text = cleanText(part);
    } else if (part.startsWith('<u>')) {
      underline = true;
      text = cleanText(part);
    } else if (part.startsWith('<code')) {
      text = cleanText(part);
    }

    // Decode HTML entities
    text = text
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>');

    runs.push(
      new TextRun({
        text,
        bold,
        italic,
        underline: underline ? {} : undefined,
        font: "Arial",
        size: 22 // 11pt
      })
    );
  }

  return runs;
}

/**
 * Parses simple HTML tables and builds a docx Table object.
 */
function parseHtmlTableToDocx(tableHtml) {
  const trRegex = /<tr[^>]*>(.*?)<\/tr>/gis;
  const tdRegex = /<t[dh][^>]*>(.*?)<\/td|th>/gis;

  const rows = [];
  const trMatches = tableHtml.match(trRegex) || [];

  for (const tr of trMatches) {
    const tdMatches = tr.match(tdRegex) || [];
    const cells = [];

    for (const td of tdMatches) {
      const text = cleanText(td);
      cells.push(
        new TableCell({
          children: [new Paragraph({ text, spacing: { before: 80, after: 80 } })],
          width: { size: 3000, type: WidthType.DXA }
        })
      );
    }

    if (cells.length > 0) {
      rows.push(new TableRow({ children: cells }));
    }
  }

  if (rows.length === 0) return null;

  return new Table({
    rows,
    width: { size: 100, type: WidthType.PERCENTAGE }
  });
}

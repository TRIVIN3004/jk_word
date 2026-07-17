import mammoth from 'mammoth';

/**
 * Parses a DOCX buffer and splits it into chapters based on H1 tags.
 * If no H1 tags are found, splits by H2 tags. If neither, creates a single chapter.
 * Returns an array of chapters ready for database insertion.
 */
export async function parseDocxToChapters(buffer) {
  // Extract HTML with custom options if needed (e.g. to preserve styles)
  const options = {
    styleMap: [
      "p[style-name='Heading 1'] => h1:fresh",
      "p[style-name='Heading 2'] => h2:fresh",
      "p[style-name='Heading 3'] => h3:fresh",
      "p[style-name='List Bullet'] => ul > li:fresh",
      "p[style-name='List Number'] => ol > li:fresh"
    ]
  };

  const result = await mammoth.convertToHtml({ buffer }, options);
  const html = result.value;
  const messages = result.messages;
  
  if (messages && messages.length > 0) {
    console.log("Mammoth parse warnings:", messages);
  }

  // Regex to split by <h1> tags and keep the delimiter
  // This matches <h1>...</h1> and captures the full tag and its content
  const h1Regex = /(<h1[^>]*>.*?<\/h1>)/gi;
  
  // Split the HTML
  const parts = html.split(h1Regex);
  
  const chapters = [];
  let currentChapter = null;
  let orderCounter = 1;

  // If there's content before the first H1, save it as an Intro chapter
  if (parts[0] && parts[0].trim().replace(/<[^>]*>/g, '').length > 0) {
    chapters.push({
      id: 'chapter-0',
      title: 'Imported Document Introduction',
      category: 'Introduction',
      content: parts[0],
      order: orderCounter++,
      pageCount: Math.max(1, Math.ceil(parts[0].length / 1200)),
      lastUpdated: new Date().toISOString()
    });
  }

  // Loop through split results, alternating between heading and content
  for (let i = 1; i < parts.length; i += 2) {
    const headingHtml = parts[i];
    const contentHtml = parts[i + 1] || '';
    
    // Extract raw text from heading for title
    const headingText = headingHtml.replace(/<[^>]*>/g, '').trim();
    const chapterId = headingText
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '') || `chapter-${orderCounter}`;

    const finalContent = headingHtml + '\n' + contentHtml;
    
    chapters.push({
      id: chapterId,
      title: headingText,
      category: headingText.toLowerCase().includes('policy') ? 'Policies' 
                : headingText.toLowerCase().includes('standard') ? 'Standards'
                : headingText.toLowerCase().includes('guideline') ? 'Guidelines'
                : headingText.toLowerCase().includes('reference') ? 'References'
                : 'Services', // default fallback category
      content: finalContent,
      order: orderCounter++,
      pageCount: Math.max(1, Math.ceil(finalContent.length / 1500)), // Approximate page count based on length
      lastUpdated: new Date().toISOString()
    });
  }

  // Fallback: If no H1 chapters were parsed, try parsing with H2 tags
  if (chapters.length === 0) {
    const h2Regex = /(<h2[^>]*>.*?<\/h2>)/gi;
    const h2Parts = html.split(h2Regex);
    if (h2Parts.length > 1) {
      if (h2Parts[0] && h2Parts[0].trim().replace(/<[^>]*>/g, '').length > 0) {
        chapters.push({
          id: 'chapter-0',
          title: 'Imported Document Introduction',
          category: 'Introduction',
          content: h2Parts[0],
          order: orderCounter++,
          pageCount: Math.max(1, Math.ceil(h2Parts[0].length / 1200)),
          lastUpdated: new Date().toISOString()
        });
      }
      for (let i = 1; i < h2Parts.length; i += 2) {
        const headingHtml = h2Parts[i];
        const contentHtml = h2Parts[i + 1] || '';
        const headingText = headingHtml.replace(/<[^>]*>/g, '').trim();
        const chapterId = headingText
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/(^-|-$)/g, '') || `chapter-${orderCounter}`;
        const finalContent = headingHtml + '\n' + contentHtml;
        chapters.push({
          id: chapterId,
          title: headingText,
          category: 'Services',
          content: finalContent,
          order: orderCounter++,
          pageCount: Math.max(1, Math.ceil(finalContent.length / 1500)),
          lastUpdated: new Date().toISOString()
        });
      }
    }
  }

  // Double fallback: If still empty, make the entire document a single chapter
  if (chapters.length === 0) {
    chapters.push({
      id: 'imported-document',
      title: 'Imported Document',
      category: 'Introduction',
      content: html || '<p>No content extracted.</p>',
      order: 1,
      pageCount: Math.max(1, Math.ceil(html.length / 1500)),
      lastUpdated: new Date().toISOString()
    });
  }

  return chapters;
}

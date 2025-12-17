/**
 * Format AI responses for better readability on all screen sizes
 * 
 * Rules:
 * - Max 20-25 words per line conceptually
 * - Max 3 lines per paragraph
 * - Use bullet points for lists
 * - No overflow content
 */

export function formatAIResponse(text: string): string {
  if (!text) return '';

  // Split into paragraphs
  let paragraphs = text.split(/\n\n+/);

  // Process each paragraph
  paragraphs = paragraphs.map(para => {
    // Skip if already a list item
    if (para.trim().startsWith('-') || para.trim().startsWith('•') || /^\d+\./.test(para.trim())) {
      return para;
    }

    // Split long paragraphs into shorter ones
    const sentences = para.split(/(?<=[.!?])\s+/);
    const chunks: string[] = [];
    let currentChunk = '';
    let lineCount = 0;

    for (const sentence of sentences) {
      const words = sentence.split(/\s+/).length;
      
      // If adding this sentence would make the chunk too long
      if (currentChunk && (words > 25 || lineCount >= 3)) {
        chunks.push(currentChunk.trim());
        currentChunk = sentence;
        lineCount = 1;
      } else {
        currentChunk += (currentChunk ? ' ' : '') + sentence;
        lineCount++;
      }
    }

    if (currentChunk) {
      chunks.push(currentChunk.trim());
    }

    return chunks.join('\n\n');
  });

  // Convert numbered lists to bullet points for consistency
  let result = paragraphs.join('\n\n');
  
  // Break long lines (over ~80 chars) at natural points
  result = result.split('\n').map(line => {
    if (line.length <= 80) return line;
    
    // Find a good break point
    const words = line.split(' ');
    const lines: string[] = [];
    let currentLine = '';
    
    for (const word of words) {
      if ((currentLine + ' ' + word).length > 70 && currentLine) {
        lines.push(currentLine);
        currentLine = word;
      } else {
        currentLine += (currentLine ? ' ' : '') + word;
      }
    }
    
    if (currentLine) lines.push(currentLine);
    return lines.join('\n');
  }).join('\n');

  return result;
}

/**
 * Convert long explanations to bullet points
 */
export function toBulletPoints(text: string): string {
  const sentences = text.split(/(?<=[.!?])\s+/);
  
  if (sentences.length <= 2) return text;
  
  return sentences
    .filter(s => s.trim())
    .map(s => `• ${s.trim()}`)
    .join('\n');
}

/**
 * Format numbered steps
 */
export function toNumberedSteps(text: string): string {
  const sentences = text.split(/(?<=[.!?])\s+/);
  
  if (sentences.length <= 2) return text;
  
  return sentences
    .filter(s => s.trim())
    .map((s, i) => `${i + 1}. ${s.trim()}`)
    .join('\n');
}

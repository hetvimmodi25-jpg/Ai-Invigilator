import JSZip from 'jszip';

/**
 * Extracts plain text content from a PowerPoint (.pptx) file.
 * PPTX files are ZIP archives containing slide XML files (`ppt/slides/slide1.xml`, etc.).
 * Reads all slide XML files and extracts text inside <a:t> XML tags.
 */
export async function parsePPTXFile(file) {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const zip = await JSZip.loadAsync(arrayBuffer);
    
    const slideFiles = Object.keys(zip.files).filter((path) =>
      path.match(/^ppt\/slides\/slide\d+\.xml$/i)
    );

    if (slideFiles.length === 0) {
      throw new Error("No PowerPoint slide XML files found in presentation.");
    }

    // Sort slide files numerically (slide1, slide2, slide3...)
    slideFiles.sort((a, b) => {
      const numA = parseInt(a.match(/\d+/)?.[0] || '0', 10);
      const numB = parseInt(b.match(/\d+/)?.[0] || '0', 10);
      return numA - numB;
    });

    let fullText = `PowerPoint Presentation: ${file.name}\nTotal Slides: ${slideFiles.length}\n\n`;

    for (let i = 0; i < slideFiles.length; i++) {
      const slidePath = slideFiles[i];
      const xmlString = await zip.files[slidePath].async('string');
      
      // Extract text content inside <a:t>tags</a:t>
      const matches = xmlString.match(/<a:t[^>]*>(.*?)<\/a:t>/g) || [];
      const slideText = matches
        .map((tag) => tag.replace(/<a:t[^>]*>/, '').replace(/<\/a:t>/, '').trim())
        .filter(Boolean)
        .join(' ');

      if (slideText) {
        fullText += `--- Slide ${i + 1} ---\n${slideText}\n\n`;
      }
    }

    return fullText.trim();
  } catch (err) {
    console.error("PPTX Parsing Error:", err);
    throw new Error(`Failed to parse presentation file "${file.name}": ${err.message}`);
  }
}

import * as pngitxt from 'png-itxt';
import { Readable, Writable } from 'stream';
import { readTextFromBlob } from '@larswander/png-text';

/**
 * Bakes an Open Badges assertion into a PNG image.
 * 
 * @param imageBuffer Buffer containing the PNG image
 * @param assertion The Open Badges assertion to embed
 * @returns Promise resolving to a Buffer containing the baked image
 */
export async function bakePngBadge(imageBuffer: Buffer, assertion: any): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      // Create readable stream from buffer
      const readableStream = Readable.from(imageBuffer);
      
      // Create a buffer to store the output
      const chunks: Buffer[] = [];
      const writableStream = new Writable({
        write(chunk, _, callback) {
          chunks.push(Buffer.from(chunk));
          callback();
        }
      });

      // Pipe the image through png-itxt to add the assertion
      readableStream
        .pipe(pngitxt.set({
          keyword: 'openbadges',
          value: JSON.stringify(assertion),
          language: '',
          translated: '',
          compressed: false,
          compression_type: 0
        }))
        .pipe(writableStream)
        .on('finish', () => {
          // Combine all chunks into a single buffer
          const resultBuffer = Buffer.concat(chunks);
          resolve(resultBuffer);
        })
        .on('error', (err: Error) => {
          reject(err);
        });
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Extracts an Open Badges assertion from a baked PNG image.
 * 
 * @param imageBuffer Buffer containing the baked PNG image
 * @returns Promise resolving to the extracted assertion
 */
export async function extractPngBadge(imageBuffer: Buffer): Promise<any> {
  try {
    // Convert buffer to blob - using the global Blob constructor (web standard) 
    // Use type assertion to handle Bun's Blob implementation
    const blob = new Blob([imageBuffer], { type: 'image/png' }) as unknown as Blob;
    
    // Read text entries from blob
    const entries = await readTextFromBlob(blob);
    
    // Look for openbadges entry
    if (!entries || !entries.openbadges) {
      return null;
    }
    
    // Parse the assertion JSON
    return JSON.parse(entries.openbadges);
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to extract PNG badge: ${error.message}`);
    }
    throw new Error('Failed to extract PNG badge: Unknown error');
  }
}

/**
 * Bakes an Open Badges assertion into an SVG image.
 * 
 * @param svgContent String containing the SVG image
 * @param assertion The Open Badges assertion to embed
 * @returns String containing the baked SVG
 */
export function bakeSvgBadge(svgContent: string, assertion: any): string {
  try {
    // Add namespace to svg tag if it doesn't exist
    const svgWithNamespace = svgContent.includes('xmlns:openbadges="http://openbadges.org"')
      ? svgContent
      : svgContent.replace(/<svg/, '<svg xmlns:openbadges="http://openbadges.org"');
    
    // Create assertion element with verification URL
    const verifyUrl = assertion.verification?.url || '';
    const assertionData = `
      <openbadges:assertion verify="${verifyUrl}">
        <![CDATA[
          ${JSON.stringify(assertion)}
        ]]>
      </openbadges:assertion>
    `;
    
    // Insert before closing svg tag
    return svgWithNamespace.replace('</svg>', `${assertionData}</svg>`);
  } catch (error: unknown) {
    if (error instanceof Error) {
      throw new Error(`Failed to bake SVG badge: ${error.message}`);
    }
    throw new Error('Failed to bake SVG badge: Unknown error');
  }
}

/**
 * Extracts an Open Badges assertion from a baked SVG image.
 * 
 * @param svgContent String containing the baked SVG image
 * @returns The extracted assertion or null if not found
 */
export function extractSvgBadge(svgContent: string): any {
  try {
    // Look for the assertion element
    const assertionMatch = svgContent.match(/<openbadges:assertion[^>]*>([\s\S]*?)<\/openbadges:assertion>/);
    
    if (!assertionMatch || !assertionMatch[1]) {
      return null;
    }
    
    // Extract the assertion JSON from CDATA
    const cdataMatch = assertionMatch[1].match(/<!\[CDATA\[([\s\S]*?)\]\]>/);
    
    if (!cdataMatch || !cdataMatch[1]) {
      return null;
    }
    
    // Parse the assertion JSON
    return JSON.parse(cdataMatch[1].trim());
  } catch (error: unknown) {
    if (error instanceof Error) {
      throw new Error(`Failed to extract SVG badge: ${error.message}`);
    }
    throw new Error('Failed to extract SVG badge: Unknown error');
  }
}

/**
 * Determines if a file is an SVG based on content.
 * 
 * @param fileBuffer Buffer or string containing the file data
 * @returns Boolean indicating if the file is an SVG
 */
export function isSvg(fileBuffer: Buffer | string): boolean {
  const content = typeof fileBuffer === 'string' 
    ? fileBuffer 
    : fileBuffer.toString('utf8', 0, Math.min(fileBuffer.length, 100));
  
  return content.trim().startsWith('<svg') || content.includes('<?xml') && content.includes('<svg');
}

/**
 * Bakes an Open Badges assertion into an image.
 * Automatically detects image type (PNG or SVG) and uses appropriate baking method.
 * 
 * @param fileData Buffer or string containing the image
 * @param assertion The Open Badges assertion to embed
 * @returns Promise resolving to the baked image (Buffer for PNG, string for SVG)
 */
export async function bakeImage(fileData: Buffer | string, assertion: any): Promise<Buffer | string> {
  if (isSvg(fileData)) {
    const svgContent = typeof fileData === 'string' ? fileData : fileData.toString('utf8');
    return bakeSvgBadge(svgContent, assertion);
  } else {
    // Assume PNG if not SVG
    const imageBuffer = Buffer.isBuffer(fileData) ? fileData : Buffer.from(fileData);
    return bakePngBadge(imageBuffer, assertion);
  }
}

/**
 * Extracts an Open Badges assertion from a baked image.
 * Automatically detects image type (PNG or SVG) and uses appropriate extraction method.
 * 
 * @param fileData Buffer or string containing the baked image
 * @returns Promise resolving to the extracted assertion or null if not found
 */
export async function extractImage(fileData: Buffer | string): Promise<any> {
  if (isSvg(fileData)) {
    const svgContent = typeof fileData === 'string' ? fileData : fileData.toString('utf8');
    return extractSvgBadge(svgContent);
  } else {
    // Assume PNG if not SVG
    const imageBuffer = Buffer.isBuffer(fileData) ? fileData : Buffer.from(fileData);
    return extractPngBadge(imageBuffer);
  }
}

/**
 * Handle extraction for test purposes. This helper method indicates if extraction
 * is attempted but should be considered experimental.
 * 
 * @param imageBuffer Buffer containing the baked PNG image
 * @returns Promise resolving to true if the PNG appears to have expected data
 */
export async function verifyPngBaking(imageBuffer: Buffer): Promise<boolean> {
  try {
    // Simple verification - check if buffer contains the openbadges keyword
    const content = imageBuffer.toString('latin1');
    return content.includes('openbadges');
  } catch (error) {
    return false;
  }
} 
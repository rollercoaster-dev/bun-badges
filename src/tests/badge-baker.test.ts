import { test, expect, describe } from 'bun:test';
import { bakeImage, bakePngBadge, verifyPngBaking, bakeSvgBadge, extractSvgBadge, isSvg } from '../utils/badge-baker';
import * as fs from 'fs';
import * as path from 'path';

describe('Badge Baker Utility', () => {
  const sampleAssertion = {
    "@context": "https://w3id.org/openbadges/v2",
    "type": "Assertion",
    "id": "http://example.org/assertions/123",
    "recipient": {
      "type": "email",
      "identity": "user@example.org"
    },
    "issuedOn": "2023-01-01T00:00:00Z",
    "badge": "http://example.org/badges/5",
    "verification": {
      "type": "hosted"
    }
  };

  test('isSvg should correctly identify SVG content', async () => {
    const svgContent = '<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"></svg>';
    const pngContent = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]); // PNG header
    
    expect(isSvg(svgContent)).toBe(true);
    expect(isSvg(pngContent)).toBe(false);
  });

  test('bakeSvgBadge should embed assertion data in SVG', async () => {
    const svgPath = path.join(import.meta.dir, 'fixtures', 'sample-badge.svg');
    const svgContent = fs.readFileSync(svgPath, 'utf8');
    
    const bakedSvg = bakeSvgBadge(svgContent, sampleAssertion);
    
    // Check if namespace was added
    expect(bakedSvg).toContain('xmlns:openbadges="http://openbadges.org"');
    
    // Check if assertion element exists
    expect(bakedSvg).toContain('<openbadges:assertion');
    
    // Check if assertion data is inside CDATA
    expect(bakedSvg).toContain('<![CDATA[');
    expect(bakedSvg).toContain(']]>');
    
    // Check if assertion data is embedded
    expect(bakedSvg).toContain(JSON.stringify(sampleAssertion));
  });

  test('extractSvgBadge should extract assertion data from SVG', async () => {
    const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:openbadges="http://openbadges.org" width="100" height="100">
      <openbadges:assertion verify="http://example.org/assertions/123">
        <![CDATA[
          ${JSON.stringify(sampleAssertion)}
        ]]>
      </openbadges:assertion>
    </svg>`;
    
    const extractedAssertion = extractSvgBadge(svgContent);
    
    expect(extractedAssertion).toBeDefined();
    expect(extractedAssertion['@context']).toBe('https://w3id.org/openbadges/v2');
    expect(extractedAssertion.type).toBe('Assertion');
    expect(extractedAssertion.id).toBe('http://example.org/assertions/123');
  });

  test('SVG baking and extraction should be reversible', async () => {
    const svgPath = path.join(import.meta.dir, 'fixtures', 'sample-badge.svg');
    const svgContent = fs.readFileSync(svgPath, 'utf8');
    
    // Bake the assertion into the SVG
    const bakedSvg = bakeSvgBadge(svgContent, sampleAssertion);
    
    // Extract the assertion from the baked SVG
    const extractedAssertion = extractSvgBadge(bakedSvg);
    
    // Verify the extracted assertion matches the original
    expect(extractedAssertion).toEqual(sampleAssertion);
  });

  test('PNG baking should work and be verifiable', async () => {
    const pngPath = path.join(import.meta.dir, 'fixtures', 'sample-badge.png');
    const pngBuffer = fs.readFileSync(pngPath);
    
    // Bake assertion into the PNG
    const bakedPngBuffer = await bakePngBadge(pngBuffer, sampleAssertion);
    
    // Write the baked PNG to a file for inspection if needed
    const bakedPath = path.join(import.meta.dir, 'fixtures', 'baked-badge.png');
    fs.writeFileSync(bakedPath, bakedPngBuffer);
    
    // Verify baking returns a buffer
    expect(Buffer.isBuffer(bakedPngBuffer)).toBe(true);
    
    // Verify the baked buffer is larger than the original (contains added data)
    expect(bakedPngBuffer.length).toBeGreaterThan(pngBuffer.length);
    console.log(`Original size: ${pngBuffer.length}, Baked size: ${bakedPngBuffer.length}`);
    
    // Verify that the PNG contains the openbadges data
    const isVerified = await verifyPngBaking(bakedPngBuffer);
    expect(isVerified).toBe(true);
  });

  test('bakeImage should handle both PNG and SVG', async () => {
    const pngPath = path.join(import.meta.dir, 'fixtures', 'sample-badge.png');
    const svgPath = path.join(import.meta.dir, 'fixtures', 'sample-badge.svg');
    
    const pngBuffer = fs.readFileSync(pngPath);
    const svgContent = fs.readFileSync(svgPath, 'utf8');
    
    // Bake PNG
    const bakedPng = await bakeImage(pngBuffer, sampleAssertion);
    expect(Buffer.isBuffer(bakedPng)).toBe(true);
    
    // Bake SVG
    const bakedSvg = await bakeImage(svgContent, sampleAssertion);
    expect(typeof bakedSvg).toBe('string');
    expect(bakedSvg).toContain('openbadges:assertion');
  });
}); 
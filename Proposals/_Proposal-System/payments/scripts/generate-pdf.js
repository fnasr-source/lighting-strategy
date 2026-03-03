#!/usr/bin/env node
/**
 * Admireworks Invoice PDF Generator
 * ==================================
 * Converts a static HTML invoice to a professionally formatted PDF.
 * 
 * Usage:
 *   node generate-pdf.js <path-to-invoice.html> [output-path.pdf]
 * 
 * If no output path is given, saves as invoice.pdf in the same directory.
 * 
 * Requirements:
 *   npm install puppeteer-core  (in this directory)
 *   Google Chrome installed at the standard macOS path
 */

const puppeteer = require('puppeteer-core');
const path = require('path');
const fs = require('fs');

// System Chrome path (macOS)
const CHROME_PATH = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

async function generatePDF(htmlPath, outputPath) {
    const absoluteHtmlPath = path.resolve(htmlPath);

    if (!fs.existsSync(absoluteHtmlPath)) {
        console.error(`❌ File not found: ${absoluteHtmlPath}`);
        process.exit(1);
    }

    if (!outputPath) {
        outputPath = path.join(path.dirname(absoluteHtmlPath), 'invoice.pdf');
    }
    outputPath = path.resolve(outputPath);

    console.log(`📄 Source:  ${absoluteHtmlPath}`);
    console.log(`📁 Output:  ${outputPath}`);

    const browser = await puppeteer.launch({
        headless: true,
        executablePath: CHROME_PATH,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    try {
        const page = await browser.newPage();

        // Set viewport to standard desktop for consistent rendering
        await page.setViewport({ width: 1200, height: 800 });

        const fileUrl = `file://${absoluteHtmlPath}`;
        await page.goto(fileUrl, { waitUntil: 'networkidle0', timeout: 30000 });

        // Generate PDF — A4 with print styles and professional margins
        await page.pdf({
            path: outputPath,
            format: 'A4',
            printBackground: true,
            preferCSSPageSize: false,
            margin: {
                top: '12mm',
                right: '12mm',
                bottom: '16mm',
                left: '12mm'
            },
            displayHeaderFooter: false,
        });

        console.log(`\n✅ PDF generated successfully: ${outputPath}`);
        console.log(`   Size: ${(fs.statSync(outputPath).size / 1024).toFixed(1)} KB`);
    } catch (err) {
        console.error(`❌ Error generating PDF: ${err.message}`);
        process.exit(1);
    } finally {
        await browser.close();
    }
}

// CLI entry point
const args = process.argv.slice(2);
if (args.length === 0) {
    console.log('Admireworks Invoice PDF Generator');
    console.log('Usage: node generate-pdf.js <invoice.html> [output.pdf]');
    process.exit(0);
}

generatePDF(args[0], args[1]);

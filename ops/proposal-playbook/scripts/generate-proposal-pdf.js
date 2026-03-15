#!/usr/bin/env node
/**
 * Admireworks Proposal PDF Generator
 * ====================================
 * Converts a paginated HTML proposal to a professionally formatted PDF.
 * Optimized for A4 multi-page documents with background colors and images.
 * 
 * Usage:
 *   node generate-proposal-pdf.js <path-to-proposal.html> [output-path.pdf]
 * 
 * If no output path is given, saves as proposal.pdf in the same directory.
 * 
 * Requirements:
 *   npm install puppeteer-core  (in Proposals/_Proposal-System/payments/)
 *   Google Chrome installed at the standard macOS path
 */

const path = require('path');
const fs = require('fs');

// Resolve puppeteer-core from the shared payments package in the current repo layout.
const puppeteerPath = path.join(__dirname, '..', '..', 'proposal-system', 'payments', 'node_modules', 'puppeteer-core');
const puppeteer = require(puppeteerPath);

// Cross-platform Chrome detection
function findChrome() {
    const candidates = process.platform === 'win32'
        ? [
            'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
            'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
            process.env.LOCALAPPDATA && path.join(process.env.LOCALAPPDATA, 'Google', 'Chrome', 'Application', 'chrome.exe'),
        ].filter(Boolean)
        : ['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'];
    for (const p of candidates) {
        if (fs.existsSync(p)) return p;
    }
    console.error('❌ Chrome not found. Please set CHROME_PATH environment variable.');
    process.exit(1);
}
const CHROME_PATH = process.env.CHROME_PATH || findChrome();

async function generateProposalPDF(htmlPath, outputPath) {
    const absoluteHtmlPath = path.resolve(htmlPath);

    if (!fs.existsSync(absoluteHtmlPath)) {
        console.error(`❌ File not found: ${absoluteHtmlPath}`);
        process.exit(1);
    }

    if (!outputPath) {
        outputPath = path.join(path.dirname(absoluteHtmlPath), 'proposal.pdf');
    }
    outputPath = path.resolve(outputPath);

    console.log('');
    console.log('╔══════════════════════════════════════════════╗');
    console.log('║   Admireworks Proposal PDF Generator         ║');
    console.log('╚══════════════════════════════════════════════╝');
    console.log('');
    console.log(`📄 Source:  ${absoluteHtmlPath}`);
    console.log(`📁 Output:  ${outputPath}`);
    console.log('');

    const browser = await puppeteer.launch({
        headless: 'shell',
        executablePath: CHROME_PATH,
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu']
    });

    try {
        const page = await browser.newPage();

        // Set wider viewport for proposal layouts
        await page.setViewport({ width: 1400, height: 900 });

        const { pathToFileURL } = require('url');
        const fileUrl = pathToFileURL(absoluteHtmlPath).href;
        console.log('⏳ Loading HTML...');
        await page.goto(fileUrl, { waitUntil: 'networkidle0', timeout: 60000 });

        // Wait a bit for fonts to load
        await new Promise(r => setTimeout(r, 2000));

        console.log('⏳ Generating PDF...');

        // Generate PDF — orientation controlled by CSS @page { size: 297mm 210mm }
        await page.pdf({
            path: outputPath,
            printBackground: true,
            preferCSSPageSize: true,
            margin: {
                top: '0',
                right: '0',
                bottom: '0',
                left: '0'
            },
            displayHeaderFooter: false,
        });

        const size = fs.statSync(outputPath).size;
        const sizeMB = (size / (1024 * 1024)).toFixed(2);
        const sizeKB = (size / 1024).toFixed(1);

        console.log('');
        console.log(`✅ PDF generated successfully!`);
        console.log(`   📄 ${outputPath}`);
        console.log(`   📦 Size: ${size > 1024 * 1024 ? sizeMB + ' MB' : sizeKB + ' KB'}`);
        console.log('');
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
    console.log('Admireworks Proposal PDF Generator');
    console.log('Usage: node generate-proposal-pdf.js <proposal.html> [output.pdf]');
    process.exit(0);
}

generateProposalPDF(args[0], args[1]);

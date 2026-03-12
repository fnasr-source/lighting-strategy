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

// Resolve puppeteer-core from the shared _Proposal-System/payments location
const puppeteerPath = path.join(__dirname, '..', '..', '_Proposal-System', 'payments', 'node_modules', 'puppeteer-core');
const puppeteer = require(puppeteerPath);

// System Chrome path (macOS)
const CHROME_PATH = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

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
        headless: true,
        executablePath: CHROME_PATH,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    try {
        const page = await browser.newPage();

        // Set wider viewport for proposal layouts
        await page.setViewport({ width: 1200, height: 800 });

        const fileUrl = `file://${absoluteHtmlPath}`;
        console.log('⏳ Loading HTML...');
        await page.goto(fileUrl, { waitUntil: 'networkidle0', timeout: 60000 });

        // Wait a bit for fonts to load
        await new Promise(r => setTimeout(r, 2000));

        console.log('⏳ Generating PDF...');

        // Generate PDF — A4 with CSS-controlled page breaks
        await page.pdf({
            path: outputPath,
            format: 'A4',
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

/**
 * Admireworks Proposal Base JS
 * Minimal JavaScript for proposal documents.
 * Currently handles print mode detection only.
 */

document.addEventListener('DOMContentLoaded', () => {
    // If ?print is in the URL, add print-mode class to body
    if (window.location.search.includes('print')) {
        document.body.classList.add('print-mode');
    }
});

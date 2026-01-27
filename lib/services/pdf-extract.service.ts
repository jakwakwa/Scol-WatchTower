/**
 * PDF Text Extraction Service
 *
 * Provides utilities for processing bank statements and documents.
 * For AI-based document analysis, the raw file is passed directly
 * to multimodal AI models that can process PDFs natively.
 */

export interface PDFExtractionResult {
    /** Extracted text content or base64 for AI */
    text: string;
    /** Number of pages (0 if unknown) */
    pages: number;
    /** PDF metadata */
    metadata?: {
        title?: string;
        author?: string;
        creationDate?: string;
    };
    /** Extraction success */
    success: boolean;
    /** Error message if failed */
    error?: string;
}

/**
 * Prepare PDF buffer for AI analysis
 * Returns base64 encoded content for multimodal AI models
 */
export function preparePDFForAI(pdfBuffer: Buffer): PDFExtractionResult {
    return {
        text: pdfBuffer.toString('base64'),
        pages: 0, // Unknown without parsing
        success: true,
    };
}

/**
 * Extract text from a base64-encoded PDF
 * Returns the base64 content for AI processing
 */
export function extractTextFromBase64PDF(base64Content: string): PDFExtractionResult {
    try {
        // Validate base64
        Buffer.from(base64Content, 'base64');
        return {
            text: base64Content,
            pages: 0,
            success: true,
        };
    } catch (err) {
        console.error('[PDFExtract] Invalid base64 content:', err);
        return {
            text: '',
            pages: 0,
            success: false,
            error: 'Invalid base64 content',
        };
    }
}

/**
 * Clean extracted text for AI processing
 */
export function cleanExtractedText(text: string): string {
    return (
        text
            // Remove excessive whitespace
            .replace(/\s+/g, ' ')
            // Remove page numbers/headers that repeat
            .replace(/Page \d+ of \d+/gi, '')
            // Normalize line breaks
            .replace(/\r\n/g, '\n')
            .replace(/\n{3,}/g, '\n\n')
            // Trim
            .trim()
    );
}

/**
 * Extract key sections from bank statement text
 */
export function extractBankStatementSections(text: string): {
    accountInfo: string;
    transactions: string;
    summary: string;
} {
    const cleanedText = cleanExtractedText(text);

    // Try to identify sections (patterns vary by bank)
    const accountInfoMatch = cleanedText.match(/(?:account|holder|number|branch).*?(?=statement|transaction)/is);
    const transactionsMatch = cleanedText.match(/(?:date|description|debit|credit|balance).*$/is);
    const summaryMatch = cleanedText.match(/(?:closing|balance|total|summary).*$/is);

    return {
        accountInfo: accountInfoMatch?.[0] || cleanedText.slice(0, 500),
        transactions: transactionsMatch?.[0] || cleanedText,
        summary: summaryMatch?.[0] || cleanedText.slice(-500),
    };
}

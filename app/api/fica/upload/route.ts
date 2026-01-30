/**
 * FICA Upload API
 *
 * Handles file uploads for FICA documents (bank statements, accountant letters).
 * Triggers the 'upload/fica.received' event to resume the workflow.
 *
 * POST /api/fica/upload
 * Body: FormData with files and metadata
 */

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { inngest } from '@/inngest/client';
import { getDatabaseClient } from '@/app/utils';
import { documents, workflows } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { auth } from '@clerk/nextjs/server';

// ============================================
// Types
// ============================================

const UploadMetadataSchema = z.object({
    workflowId: z.coerce.number().int().positive('Workflow ID is required'),
    leadId: z.coerce.number().int().positive('Lead ID is required'),
    documentType: z.enum(['BANK_STATEMENT', 'ACCOUNTANT_LETTER', 'ID_DOCUMENT', 'PROOF_OF_ADDRESS']),
});

interface UploadedDocument {
    type: 'BANK_STATEMENT' | 'ACCOUNTANT_LETTER' | 'ID_DOCUMENT' | 'PROOF_OF_ADDRESS';
    filename: string;
    url: string;
    uploadedAt: string;
}

const documentCategoryMap: Record<UploadedDocument['type'], string> = {
    BANK_STATEMENT: 'fica_business',
    ACCOUNTANT_LETTER: 'fica_business',
    ID_DOCUMENT: 'fica_individual',
    PROOF_OF_ADDRESS: 'fica_individual',
};

// ============================================
// POST Handler
// ============================================

export async function POST(request: NextRequest) {
    try {
        // Authenticate (optional for client uploads via magic link)
        const { userId } = await auth();

        // Parse multipart form data
        const formData = await request.formData();

        // Extract metadata
        const workflowId = formData.get('workflowId');
        const leadId = formData.get('leadId');
        const documentType = formData.get('documentType');

        // Validate metadata
        const metadataResult = UploadMetadataSchema.safeParse({
            workflowId,
            leadId,
            documentType,
        });

        if (!metadataResult.success) {
            return NextResponse.json(
                {
                    error: 'Validation failed',
                    details: metadataResult.error.flatten().fieldErrors,
                },
                { status: 400 },
            );
        }

        const metadata = metadataResult.data;

        // Get uploaded files
        const files = formData.getAll('files') as File[];

        if (files.length === 0) {
            return NextResponse.json({ error: 'No files uploaded' }, { status: 400 });
        }

        console.log(`[FicaUpload] Processing ${files.length} file(s) for workflow ${metadata.workflowId}`);

        // Verify workflow exists
        const db = getDatabaseClient();
        if (!db) {
            return NextResponse.json({ error: 'Database connection failed' }, { status: 500 });
        }

        const workflowResult = await db.select().from(workflows).where(eq(workflows.id, metadata.workflowId));

        if (workflowResult.length === 0) {
            return NextResponse.json({ error: `Workflow ${metadata.workflowId} not found` }, { status: 404 });
        }

        // Process and store files
        // In production, this would upload to S3/Cloudflare R2/etc.
        const uploadedDocuments: UploadedDocument[] = [];

        for (const file of files) {
            // Validate file type
            const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];

            if (!allowedTypes.includes(file.type)) {
                console.warn(`[FicaUpload] Invalid file type: ${file.type}`);
                continue;
            }

            // Validate file size (max 10MB)
            const maxSize = 10 * 1024 * 1024;
            if (file.size > maxSize) {
                console.warn(`[FicaUpload] File too large: ${file.size} bytes`);
                continue;
            }

            // Generate storage URL (mock for now)
            // In production: await uploadToStorage(file)
            const storageUrl = await mockUploadFile(file, metadata.workflowId);

            const uploadedDocument = {
                type: metadata.documentType,
                filename: file.name,
                url: storageUrl,
                uploadedAt: new Date().toISOString(),
            };

            uploadedDocuments.push(uploadedDocument);

            const [inserted] = await db
                .insert(documents)
                .values([
                    {
                        leadId: metadata.leadId,
                        type: metadata.documentType,
                        status: 'uploaded',
                        category: documentCategoryMap[metadata.documentType],
                        source: 'client',
                        fileName: file.name,
                        storageUrl,
                        uploadedBy: userId || 'client',
                        uploadedAt: new Date(),
                    },
                ])
                .returning();

            if (inserted) {
                await inngest.send({
                    name: 'document/uploaded',
                    data: {
                        workflowId: metadata.workflowId,
                        leadId: metadata.leadId,
                        documentId: inserted.id,
                        documentType: metadata.documentType,
                        category: documentCategoryMap[metadata.documentType],
                        uploadedAt: uploadedDocument.uploadedAt,
                    },
                });
            }

            console.log(`[FicaUpload] Uploaded: ${file.name} -> ${storageUrl}`);
        }

        if (uploadedDocuments.length === 0) {
            return NextResponse.json({ error: 'No valid files were uploaded' }, { status: 400 });
        }

        // Send event to Inngest to resume workflow
        await inngest.send({
            name: 'upload/fica.received',
            data: {
                workflowId: metadata.workflowId,
                leadId: metadata.leadId,
                documents: uploadedDocuments,
                uploadedBy: userId || 'client',
            },
        });

        console.log(`[FicaUpload] Event sent to Inngest for workflow ${metadata.workflowId}`);

        return NextResponse.json({
            success: true,
            message: `${uploadedDocuments.length} document(s) uploaded successfully`,
            workflowId: metadata.workflowId,
            documents: uploadedDocuments,
        });
    } catch (error) {
        console.error('[FicaUpload] Error processing upload:', error);

        return NextResponse.json(
            {
                error: 'Internal server error',
                message: error instanceof Error ? error.message : 'Unknown error',
            },
            { status: 500 },
        );
    }
}

// ============================================
// Mock File Upload
// ============================================

/**
 * Mock file upload - in production, replace with actual storage
 */
async function mockUploadFile(file: File, workflowId: number): Promise<string> {
    // Simulate upload delay
    await new Promise(resolve => setTimeout(resolve, 100));

    // Generate a mock URL
    const timestamp = Date.now();
    const safeFilename = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

    return `${baseUrl}/uploads/workflows/${workflowId}/${timestamp}-${safeFilename}`;
}

// ============================================
// GET Handler - Check upload status
// ============================================

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const workflowId = searchParams.get('workflowId');

    if (!workflowId) {
        return NextResponse.json({ error: 'workflowId is required' }, { status: 400 });
    }

    // In production, query the documents table
    return NextResponse.json({
        workflowId: parseInt(workflowId),
        status: 'pending',
        requiredDocuments: [
            { type: 'BANK_STATEMENT', required: true, uploaded: false },
            { type: 'ACCOUNTANT_LETTER', required: true, uploaded: false },
        ],
    });
}

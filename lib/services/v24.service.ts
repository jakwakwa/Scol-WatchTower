/**
 * V24 Integration Service
 *
 * Mock implementation for V24 core system integration.
 * Handles the final handoff of approved clients into the V24 ledger.
 *
 * In production:
 * - createV24ClientProfile: CREATE_CLIENT transaction to V24 SQL/API
 * - scheduleTrainingSession: Integration with calendar/booking system
 * - sendWelcomePack: Email with credentials and portal access
 */

import { getDatabaseClient } from '@/app/utils';
import { leads, workflows } from '@/db/schema';
import { eq } from 'drizzle-orm';
import {
    type V24ClientProfile,
    type V24Response,
    type TrainingSession,
    type MandateType,
    V24ResponseSchema,
} from '@/lib/types';
import { v4 as uuidv4 } from 'uuid';

export interface CreateClientOptions {
    leadId: number;
    workflowId: number;
    mandateType: MandateType;
    approvedVolume: number;
    feePercent: number; // Basis points
}

export interface ScheduleTrainingOptions {
    email: string;
    clientName: string;
    preferredDate?: Date;
}

export interface WelcomePackOptions {
    email: string;
    clientName: string;
    v24Reference: string;
    portalUrl: string;
    temporaryPassword?: string;
}

/**
 * Create a client profile in V24 core system
 */
export async function createV24ClientProfile(options: CreateClientOptions): Promise<V24Response> {
    const { leadId, workflowId, mandateType, approvedVolume, feePercent } = options;

    console.log(`[V24Service] Creating client profile for Lead ${leadId}, Workflow ${workflowId}`);

    // Fetch lead data
    const db = getDatabaseClient();
    let leadData = null;

    if (db) {
        try {
            const leadResults = await db.select().from(leads).where(eq(leads.id, leadId));
            if (leadResults.length > 0) {
                leadData = leadResults[0];
            }
        } catch (err) {
            console.error('[V24Service] Failed to fetch lead:', err);
            return {
                success: false,
                error: `Database error: ${err instanceof Error ? err.message : String(err)}`,
            };
        }
    }

    if (!leadData) {
        return {
            success: false,
            error: `Lead ${leadId} not found`,
        };
    }

    // Check for external V24 API
    const v24ApiUrl = process.env.V24_API_URL;

    if (v24ApiUrl) {
        try {
            const response = await fetch(`${v24ApiUrl}/clients`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${process.env.V24_API_KEY || ''}`,
                },
                body: JSON.stringify({
                    companyName: leadData.companyName,
                    contactName: leadData.contactName,
                    email: leadData.email,
                    phone: leadData.phone,
                    mandateType,
                    volumeLimit: approvedVolume,
                    feePercent,
                }),
            });

            if (response.ok) {
                const result = await response.json();
                return V24ResponseSchema.parse(result);
            } else {
                const errorText = await response.text();
                return {
                    success: false,
                    error: `V24 API error: ${response.status} - ${errorText}`,
                };
            }
        } catch (err) {
            console.warn('[V24Service] External API failed, using mock:', err);
        }
    }

    // Mock V24 client creation
    const v24Reference = `V24-${Date.now().toString(36).toUpperCase()}-${leadId}`;
    const clientId = uuidv4();

    console.log(`[V24Service] Mock client created:`, {
        clientId,
        v24Reference,
        companyName: leadData.companyName,
        mandateType,
    });

    // Simulate some processing delay
    await new Promise(resolve => setTimeout(resolve, 500));

    return {
        success: true,
        clientId,
        v24Reference,
        message: `Client ${leadData.companyName} successfully created in V24`,
    };
}

/**
 * Schedule a training session for a new client
 */
export async function scheduleTrainingSession(options: ScheduleTrainingOptions): Promise<TrainingSession> {
    const { email, clientName, preferredDate } = options;

    console.log(`[V24Service] Scheduling training session for ${email}`);

    // Check for external calendar API
    const calendarApiUrl = process.env.TRAINING_CALENDAR_API_URL;

    if (calendarApiUrl) {
        try {
            const response = await fetch(calendarApiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email,
                    clientName,
                    preferredDate: preferredDate?.toISOString(),
                    type: 'ONBOARDING',
                }),
            });

            if (response.ok) {
                const result = await response.json();
                return result as TrainingSession;
            }
        } catch (err) {
            console.warn('[V24Service] External calendar API failed, using mock:', err);
        }
    }

    // Mock training session
    // Schedule for next available slot (next business day, 10am)
    const scheduledDate = preferredDate ?? getNextBusinessDay();
    scheduledDate.setHours(10, 0, 0, 0);

    const session: TrainingSession = {
        sessionId: uuidv4(),
        clientEmail: email,
        scheduledDate,
        duration: 60,
        type: 'ONBOARDING',
        meetingLink: `https://meet.stratcol.co.za/training/${uuidv4().slice(0, 8)}`,
        status: 'SCHEDULED',
    };

    console.log(`[V24Service] Training session scheduled:`, {
        sessionId: session.sessionId,
        date: session.scheduledDate.toISOString(),
        link: session.meetingLink,
    });

    return session;
}

/**
 * Send welcome pack email to new client
 */
export async function sendWelcomePack(
    options: WelcomePackOptions,
): Promise<{ success: boolean; messageId?: string; error?: string }> {
    const { email, clientName, v24Reference, portalUrl, temporaryPassword } = options;

    console.log(`[V24Service] Sending welcome pack to ${email}`);

    // Check for Resend API
    const resendApiKey = process.env.RESEND_API_KEY;

    if (resendApiKey) {
        try {
            const { Resend } = await import('resend');
            const resend = new Resend(resendApiKey);

            const { data, error } = await resend.emails.send({
                from: 'StratCol Onboarding <onboarding@stratcol.co.za>',
                to: email,
                subject: `Welcome to StratCol - Your Account is Ready! (Ref: ${v24Reference})`,
                html: generateWelcomeEmailHtml({
                    clientName,
                    v24Reference,
                    portalUrl,
                    temporaryPassword,
                }),
            });

            if (error) {
                return { success: false, error: error.message };
            }

            return { success: true, messageId: data?.id };
        } catch (err) {
            console.warn('[V24Service] Resend API failed, using mock:', err);
        }
    }

    // Mock email sending
    console.log(`[V24Service] Mock welcome email sent:`, {
        to: email,
        subject: `Welcome to StratCol - ${v24Reference}`,
        hasPassword: !!temporaryPassword,
    });

    return {
        success: true,
        messageId: `mock-${Date.now()}`,
    };
}

/**
 * Generate welcome email HTML
 */
function generateWelcomeEmailHtml(options: {
    clientName: string;
    v24Reference: string;
    portalUrl: string;
    temporaryPassword?: string;
}): string {
    const { clientName, v24Reference, portalUrl, temporaryPassword } = options;

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #1e3a5f 0%, #2d5a87 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
    .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
    .button { display: inline-block; background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
    .credentials { background: #fff; border: 1px solid #e5e7eb; padding: 20px; border-radius: 6px; margin: 20px 0; }
    .footer { text-align: center; color: #6b7280; font-size: 12px; margin-top: 30px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Welcome to StratCol!</h1>
      <p>Your account has been activated</p>
    </div>
    <div class="content">
      <p>Dear ${clientName},</p>
      
      <p>Congratulations! Your StratCol account has been successfully set up and is ready for use.</p>
      
      <div class="credentials">
        <h3>Your Account Details</h3>
        <p><strong>Reference Number:</strong> ${v24Reference}</p>
        ${temporaryPassword ? `<p><strong>Temporary Password:</strong> ${temporaryPassword}</p>` : ''}
        <p><strong>Portal URL:</strong> <a href="${portalUrl}">${portalUrl}</a></p>
      </div>
      
      <p>Click below to access your client portal:</p>
      
      <a href="${portalUrl}" class="button">Access Your Portal</a>
      
      <h3>What's Next?</h3>
      <ul>
        <li>Complete your profile setup</li>
        <li>Set up your banking details for mandate processing</li>
        <li>Attend your scheduled onboarding training session</li>
        <li>Start processing your first transactions!</li>
      </ul>
      
      <p>If you have any questions, our support team is here to help.</p>
      
      <p>Best regards,<br>The StratCol Team</p>
    </div>
    <div class="footer">
      <p>© ${new Date().getFullYear()} StratCol. All rights reserved.</p>
      <p>This email was sent to ${clientName}. If you received this in error, please contact support.</p>
    </div>
  </div>
</body>
</html>
  `.trim();
}

/**
 * Get next business day (skip weekends)
 */
function getNextBusinessDay(): Date {
    const date = new Date();
    date.setDate(date.getDate() + 1);

    // Skip Saturday and Sunday
    while (date.getDay() === 0 || date.getDay() === 6) {
        date.setDate(date.getDate() + 1);
    }

    return date;
}

/**
 * Generate a temporary password
 */
export function generateTemporaryPassword(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$%';
    let password = '';
    for (let i = 0; i < 12; i++) {
        password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
}

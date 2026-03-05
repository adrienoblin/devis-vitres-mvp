import { NextRequest, NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { to, subject, text, pdfBase64, credentials } = body;

        if (!to || !subject || !text || !pdfBase64 || !credentials?.address || !credentials?.password) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        const safeEmail = credentials.address.trim().toLowerCase();
        const safePassword = credentials.password.replace(/\s+/g, '');

        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: safeEmail,
                pass: safePassword,
            },
        });

        // Convert base64 dataURI to buffer
        const base64Data = pdfBase64.split(';base64,').pop();
        const buffer = Buffer.from(base64Data, 'base64');

        const mailOptions = {
            from: safeEmail,
            to: to,
            subject: subject,
            text: text,
            attachments: [
                {
                    filename: 'devis.pdf',
                    content: buffer,
                    contentType: 'application/pdf',
                },
            ],
        };

        await transporter.sendMail(mailOptions);

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('Email error:', error);
        return NextResponse.json({ error: error.message || 'Failed to send email' }, { status: 500 });
    }
}

import { NextRequest, NextResponse } from 'next/server';

const API_BASE = 'https://api.hubapi.com';

async function handler(request: NextRequest, { params }: { params: Promise<{ path?: string[] }> }) {
    const resolvedParams = await params;
    const pathSegments = resolvedParams.path || [];
    const path = pathSegments.join('/');

    const targetUrl = `${API_BASE}/${path}${request.nextUrl.search}`;
    let authHeader = request.headers.get('Authorization');

    if (process.env.HUBSPOT_TOKEN) {
        const cleanToken = process.env.HUBSPOT_TOKEN.replace(/['"]/g, '');
        authHeader = `Bearer ${cleanToken}`;
    }

    if (!authHeader) {
        return NextResponse.json({ error: 'No authorization header ou token dans .env' }, { status: 401 });
    }

    const headers = new Headers();
    headers.set('Authorization', authHeader);

    const contentType = request.headers.get('Content-Type');
    if (contentType) {
        headers.set('Content-Type', contentType);
    }

    const options: RequestInit = {
        method: request.method,
        headers,
    };

    // Forward the body for POST/PUT/PATCH
    if (request.method !== 'GET' && request.method !== 'HEAD') {
        const bodyBuffer = await request.arrayBuffer();
        if (bodyBuffer.byteLength > 0) {
            options.body = bodyBuffer;
        }
    }

    try {
        const res = await fetch(targetUrl, options);
        const data = await res.text();

        let responseBody;
        try {
            responseBody = JSON.parse(data);
        } catch {
            responseBody = { text: data };
        }

        return NextResponse.json(responseBody, { status: res.status });
    } catch (e: any) {
        console.error('HubSpot Proxy Error:', e);
        return NextResponse.json({ error: e.message || 'Internal Server Error' }, { status: 500 });
    }
}

export { handler as GET, handler as POST, handler as PUT, handler as DELETE, handler as PATCH };

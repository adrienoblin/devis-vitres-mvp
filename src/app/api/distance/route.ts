import { NextResponse } from 'next/server';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const origins = searchParams.get('origins');
    const destinations = searchParams.get('destinations');

    if (!origins || !destinations) {
        return NextResponse.json({ error: 'Missing origins or destinations' }, { status: 400 });
    }

    const apiKey = process.env.GOOGLE_MAPS_API_KEY;

    // 1. Try Google Maps if key is provided
    if (apiKey && apiKey.trim() !== '') {
        try {
            const response = await fetch(
                `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${encodeURIComponent(origins)}&destinations=${encodeURIComponent(destinations)}&key=${apiKey}`
            );

            if (response.ok) {
                const data = await response.json();
                // If Google says OK, or even if it's over query limit, sometimes returns status content.
                // We'll trust data if rows exist.
                if (data.rows && data.rows[0].elements[0].status === 'OK') {
                    return NextResponse.json(data);
                }
            }
        } catch (error) {
            console.error('Error fetching from Google Maps:', error);
            // Continue to fallback
        }
    }

    // 2. Fallback: OpenStreetMap (Nominatim for Geocoding + OSRM for Routing)
    // This is 100% free and requires no API key.
    try {
        console.log(`Fallback driving distance for: ${origins} -> ${destinations}`);

        // A. Geocode Origin
        const originGeoResponse = await fetch(
            `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(origins)}&format=json&limit=1`,
            { headers: { 'User-Agent': 'DevisVitres-Fallback/1.0' } }
        );
        const originGeoData = await originGeoResponse.json();

        // B. Geocode Destination
        const destGeoResponse = await fetch(
            `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(destinations)}&format=json&limit=1`,
            { headers: { 'User-Agent': 'DevisVitres-Fallback/1.0' } }
        );
        const destGeoData = await destGeoResponse.json();

        if (!originGeoData.length || !destGeoData.length) {
            return NextResponse.json({ error: 'Impossible de localiser les adresses avec OpenStreetMap' }, { status: 404 });
        }

        const originLat = originGeoData[0].lat;
        const originLon = originGeoData[0].lon;
        const destLat = destGeoData[0].lat;
        const destLon = destGeoData[0].lon;

        // C. Route Calculation (OSRM)
        // OSRM expects: lon,lat;lon,lat
        const routeResponse = await fetch(
            `http://router.project-osrm.org/route/v1/driving/${originLon},${originLat};${destLon},${destLat}?overview=false`
        );
        const routeData = await routeResponse.json();

        if (routeData.code !== 'Ok' || !routeData.routes.length) {
            return NextResponse.json({ error: 'Calcul itinéraire échoué avec OSRM' }, { status: 502 });
        }

        const distanceMeters = routeData.routes[0].distance; // distance in meters

        // D. Simulate Google Maps response structure
        const simulatedGoogleResponse = {
            rows: [
                {
                    elements: [
                        {
                            status: 'OK',
                            distance: {
                                value: distanceMeters,
                                text: `${(distanceMeters / 1000).toFixed(1)} km`
                            }
                        }
                    ]
                }
            ]
        };

        return NextResponse.json(simulatedGoogleResponse);
    } catch (error) {
        console.error('Error in OpenStreetMap fallback:', error);
        return NextResponse.json({ error: 'Calcul distance échoué' }, { status: 500 });
    }
}

import { NextResponse } from 'next/server';

function extractCoordinatesFromText(text: string): { latitude: number; longitude: number } | null {
  if (!text) return null;
  const cleaned = text.trim();

  // Pattern 1: Universal coordinate pattern (lat, lng after query params, @, or raw)
  const universalMatch = cleaned.match(
    /(?:q=|ll=|query=|destination=|sll=|center=|search\/|@|^)(-?\d+\.\d+)(?:,|%2C|\+|\s)+(-?\d+\.\d+)/i
  );
  if (universalMatch) {
    const lat = parseFloat(universalMatch[1]);
    const lng = parseFloat(universalMatch[2]);
    if (!isNaN(lat) && !isNaN(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
      return { latitude: lat, longitude: lng };
    }
  }

  // Pattern 2: OpenStreetMap #map=zoom/lat/lng
  const osmMatch = cleaned.match(/#map=\d+\/(-?\d+\.\d+)\/(-?\d+\.\d+)/i);
  if (osmMatch) {
    const lat = parseFloat(osmMatch[1]);
    const lng = parseFloat(osmMatch[2]);
    if (!isNaN(lat) && !isNaN(lng)) {
      return { latitude: lat, longitude: lng };
    }
  }

  // Pattern 3: Google Maps embed or internal data array e.g. !3d-1.2882!4d37.1082
  const embedMatch = cleaned.match(/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/i);
  if (embedMatch) {
    const lat = parseFloat(embedMatch[1]);
    const lng = parseFloat(embedMatch[2]);
    if (!isNaN(lat) && !isNaN(lng)) {
      return { latitude: lat, longitude: lng };
    }
  }

  return null;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const input = (body.input || body.url || '').trim();

    if (!input) {
      return NextResponse.json(
        { error: 'Please provide a location link, coordinates, or Google Maps URL.' },
        { status: 400 }
      );
    }

    // 1. First check if coordinates can be extracted directly without network fetch
    const directCoords = extractCoordinatesFromText(input);
    if (directCoords) {
      return NextResponse.json({
        success: true,
        ...directCoords,
        source: 'direct',
      });
    }

    // 2. If it's a URL (such as a shortened maps.app.goo.gl link), resolve the redirect on the server
    const urlMatch = input.match(/https?:\/\/[^\s]+/i);
    if (!urlMatch) {
      return NextResponse.json(
        {
          error:
            'Could not extract coordinates. Please paste a valid Google Maps link, Apple Maps link, or numeric coordinates (e.g. -1.2921, 36.8219).',
        },
        { status: 422 }
      );
    }

    const targetUrl = urlMatch[0];

    try {
      const response = await fetch(targetUrl, {
        method: 'GET',
        redirect: 'follow',
        headers: {
          'User-Agent':
            'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
        },
      });

      const finalUrl = response.url;
      const coordsFromFinalUrl = extractCoordinatesFromText(finalUrl);
      if (coordsFromFinalUrl) {
        return NextResponse.json({
          success: true,
          ...coordsFromFinalUrl,
          source: 'redirect_url',
        });
      }

      // If not in final URL string, inspect HTML response body
      const htmlText = await response.text();
      const coordsFromHtml = extractCoordinatesFromText(htmlText);
      if (coordsFromHtml) {
        return NextResponse.json({
          success: true,
          ...coordsFromHtml,
          source: 'page_content',
        });
      }

      return NextResponse.json(
        {
          error:
            'The link was resolved, but no geographic coordinates could be identified. Please verify the link or enter coordinates manually.',
        },
        { status: 422 }
      );
    } catch (networkErr) {
      console.error('Link resolution network error:', networkErr);
      return NextResponse.json(
        {
          error:
            'Could not connect to the location link. Please check your network or paste raw coordinates directly.',
        },
        { status: 502 }
      );
    }
  } catch (err) {
    console.error('Resolve location route error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

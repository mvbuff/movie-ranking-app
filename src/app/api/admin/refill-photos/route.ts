import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

// TEMPORARY one-time route: refill expired Google Places photo URLs.
// Deleted after use. Gated by a one-time token passed as ?token=.
const ONE_TIME_TOKEN = process.env.REFILL_PHOTOS_TOKEN || '';
const GOOGLE_KEY = process.env.GOOGLE_PLACES_API_KEY || '';

async function urlOk(url: string): Promise<boolean> {
  try {
    const res = await fetch(url, { redirect: 'follow' });
    return res.ok;
  } catch {
    return false;
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get('token') || '';
  if (!ONE_TIME_TOKEN || token !== ONE_TIME_TOKEN) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  const offset = parseInt(searchParams.get('offset') || '0', 10);
  const limit = parseInt(searchParams.get('limit') || '25', 10);

  const restaurants = await prisma.restaurant.findMany({
    orderBy: { name: 'asc' },
    skip: offset,
    take: limit,
    select: { id: true, name: true, googleMapsUrl: true, metadata: true },
  });

  const fixed: string[] = [];
  const skipped: string[] = [];
  const alreadyOk: string[] = [];

  for (const r of restaurants) {
    const meta = (r.metadata as Record<string, unknown> | null) || {};
    const photos = (meta.photos as string[] | undefined) || [];

    if (photos.length > 0 && (await urlOk(photos[0]))) {
      alreadyOk.push(r.name);
      continue;
    }

    const gurl = r.googleMapsUrl || '';
    const placeId = gurl.includes('place_id:')
      ? gurl.split('place_id:')[1].split('&')[0].split('/')[0]
      : null;
    if (!placeId) {
      skipped.push(`${r.name} (no place_id)`);
      continue;
    }

    try {
      const detailsRes = await fetch(
        `https://maps.googleapis.com/maps/api/place/details/json?place_id=${encodeURIComponent(placeId)}&fields=photos&key=${GOOGLE_KEY}`
      );
      const details = await detailsRes.json();
      const refs: string[] = ((details?.result?.photos as Array<{ photo_reference?: string }> | undefined) || [])
        .map((p) => p.photo_reference)
        .filter((x): x is string => !!x)
        .slice(0, 3);
      if (refs.length === 0) {
        skipped.push(`${r.name} (no photos from Google)`);
        continue;
      }
      const newPhotos = refs.map(
        (ref) => `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photo_reference=${ref}&key=${GOOGLE_KEY}`
      );
      if (!(await urlOk(newPhotos[0]))) {
        skipped.push(`${r.name} (fresh URL failed check)`);
        continue;
      }
      await prisma.restaurant.update({
        where: { id: r.id },
        data: { metadata: { ...(meta as object), photos: newPhotos } },
      });
      fixed.push(r.name);
    } catch (e) {
      skipped.push(`${r.name} (error: ${e instanceof Error ? e.message : 'unknown'})`);
    }
  }

  return NextResponse.json({ processed: restaurants.length, offset, alreadyOk, fixed, skipped });
}

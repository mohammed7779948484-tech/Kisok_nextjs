import { ImageResponse } from 'next/og';

const sizes: Record<string, number> = {
  '192.png': 192,
  '512.png': 512,
  '180.png': 180,
  'badge.png': 96,
  'maskable.png': 512,
};

export async function GET(_request: Request, { params }: { params: Promise<{ size: string }> }) {
  const { size } = await params;
  const pixels = sizes[size];
  if (!pixels) return new Response('Not found', { status: 404 });
  const badge = size === 'badge.png';

  return new ImageResponse(
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%',
        height: '100%',
        background: badge ? 'transparent' : '#f6f7fa',
        color: badge ? '#ffffff' : '#1b2336',
        fontWeight: 900,
        fontSize: pixels * (badge ? 0.65 : 0.18),
        letterSpacing: -pixels * 0.012,
      }}
    >
      {badge ? 'K' : 'KISOK'}
      {badge ? null : <span style={{ color: '#3159c9' }}>.</span>}
    </div>,
    {
      width: pixels,
      height: pixels,
      headers: { 'Cache-Control': 'public, max-age=86400' },
    },
  );
}

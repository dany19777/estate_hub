type CbuRate = {
  Ccy: string;
  Nominal: string;
  Rate: string;
  Date: string;
};

let cached:
  | {
      expiresAt: number;
      payload: { usdUzs: number; date: string; source: string };
    }
  | undefined;

export async function GET() {
  if (cached && cached.expiresAt > Date.now()) {
    return Response.json(cached.payload, {
      headers: {
        'Cache-Control': 'public, max-age=3600, stale-while-revalidate=21600',
      },
    });
  }

  try {
    const response = await fetch(
      'https://cbu.uz/ru/arkhiv-kursov-valyut/json/USD/',
      { headers: { Accept: 'application/json' } },
    );
    if (!response.ok) throw new Error(`CBU responded with ${response.status}`);
    const rates = (await response.json()) as CbuRate[];
    const usd = rates.find((rate) => rate.Ccy === 'USD');
    const rate = Number(usd?.Rate) / Number(usd?.Nominal || 1);
    if (!usd || !Number.isFinite(rate) || rate <= 0)
      throw new Error('CBU returned an invalid USD rate');

    const payload = {
      usdUzs: rate,
      date: usd.Date,
      source: 'Central Bank of the Republic of Uzbekistan',
    };
    cached = { expiresAt: Date.now() + 60 * 60 * 1000, payload };
    return Response.json(payload, {
      headers: {
        'Cache-Control': 'public, max-age=3600, stale-while-revalidate=21600',
      },
    });
  } catch (error) {
    console.error(
      'Official exchange rate unavailable',
      error instanceof Error ? error.message : 'unknown',
    );
    return Response.json(
      { message: 'Официальный курс временно недоступен.' },
      { status: 503, headers: { 'Cache-Control': 'no-store' } },
    );
  }
}

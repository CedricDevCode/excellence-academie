export const GENIUSPAY_API_BASE = process.env.GENIUSPAY_API_BASE || 'https://geniuspay.ci/api/v1/merchant';
export const GENIUSPAY_API_KEY = process.env.GENIUSPAY_API_KEY || '';
export const GENIUSPAY_SECRET_KEY = process.env.GENIUSPAY_SECRET_KEY || '';
export const GENIUSPAY_ENVIRONMENT = process.env.GENIUSPAY_ENVIRONMENT || 'sandbox';
export const GENIUSPAY_WEBHOOK_SECRET = process.env.GENIUSPAY_WEBHOOK_SECRET || '';

export const geniusPayHeaders = () => ({
  'X-API-Key': GENIUSPAY_API_KEY,
  'X-API-Secret': GENIUSPAY_SECRET_KEY,
  'Content-Type': 'application/json',
  'Accept': 'application/json',
});

export async function handleGeniusPayResponse(response: Response) {
  const contentType = response.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    const text = await response.text();
    console.error(`GeniusPay error (${response.status}) body:`, text.slice(0, 500));
    return null;
  }
  const result = await response.json();
  if (!result.success) {
    console.error('GeniusPay API error:', JSON.stringify(result.error));
    return null;
  }
  return result.data;
}

const momoEndpoint = process.env.MOMO_API || 'https://test-payment.momo.vn';

// Get the base URL for callbacks (should be set via environment variable)
// For local development with ngrok: https://your-ngrok-url.ngrok-free.app
// For production: https://yourdomain.com
const getBaseUrl = () => {
  if (process.env.MOMO_BASE_URL) {
    return process.env.MOMO_BASE_URL;
  }
  // Fallback for development - will need to update when ngrok tunnel changes
  if (process.env.NODE_ENV === 'development') {
    console.warn(
      'MOMO_BASE_URL not set. Momo callbacks may fail. Set MOMO_BASE_URL environment variable.',
    );
  }
  return 'http://localhost:3000'; // Won't work for Momo, must use public URL
};

const baseUrl = getBaseUrl();

export const MomoConfig = {
  accessKey: process.env.MOMO_ACCESS_KEY || 'F8BBA842ECF85',
  secretKey: process.env.MOMO_SECRET_KEY || 'K951B6PE1waDMi640xX08PD3vg6EkVlz',
  partnerCode: 'MOMO',
  endpoint: `${momoEndpoint}/v2/gateway/api/create`,
  queryEndpoint: `${momoEndpoint}/v2/gateway/api/query`,
  refundEndpoint: `${momoEndpoint}/v2/gateway/api/refund`,
  redirectUrl:
    process.env.MOMO_REDIRECT_URL || `${baseUrl}/bookings/payment-result`,
  ipnUrl: process.env.MOMO_IPN_URL || `${baseUrl}/orders/momo/callback`,
  requestType: 'captureWallet',
  lang: 'en',
  autoCapture: true,
};

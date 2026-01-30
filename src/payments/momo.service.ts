import { Injectable, BadRequestException } from '@nestjs/common';
import * as crypto from 'crypto';
import axios from 'axios';
import { MomoConfig } from './config/momo.config';

interface MomoPaymentRequest {
  amount: number;
  bookingId: string;
  orderInfo: string;
  extraData?: string;
}

export interface MomoPaymentResponse {
  partnerCode: string;
  bookingId: string;
  requestId: string;
  amount: number;
  orderInfo: string;
  orderType: string;
  transId: number;
  resultCode: number;
  message: string;
  payUrl?: string | null;
  qrCodeUrl?: string | null;
  qrCode?: string | null;
  deeplink?: string | null;
  signature: string;
  responseTime: number;
  orderId?: string;
}

export interface MomoIPNCallback {
  partnerCode: string;
  orderId: string;
  requestId: string;
  amount: string;
  orderInfo: string;
  orderType: string;
  transId: string;
  resultCode: number;
  message: string;
  payType: string;
  responseTime: number;
  extraData: string;
  signature: string;
}

export interface MomoIPNResponse {
  resultCode: number;
  message: string;
}

export interface MomoTransactionQueryResponse {
  partnerCode: string;
  requestId: string;
  orderId: string;
  transId?: string;
  resultCode: number;
  message: string;
  payType?: string;
  responseTime: number;
}

@Injectable()
export class MomoPaymentService {
  async createPayment(
    paymentData: MomoPaymentRequest,
  ): Promise<MomoPaymentResponse> {
    try {
      const {
        accessKey,
        secretKey,
        partnerCode,
        endpoint,
        requestType,
        redirectUrl,
        ipnUrl,
        lang,
        autoCapture,
      } = MomoConfig;

      const { amount, orderInfo, bookingId, extraData = '' } = paymentData;
      // Validate amount
      if (amount < 1000) {
        throw new BadRequestException('Amount must be at least 1000 VND');
      }

      // Create unique orderId for each payment attempt (to avoid Momo duplicated orderId error)
      // Use bookingId + timestamp to ensure uniqueness for multiple payments on same booking
      const uniqueOrderId = `${bookingId}_${new Date().getTime()}`;
      const requestId = `${partnerCode}_${new Date().getTime()}_${bookingId}`;

      // Create signature
      const rawSignature = `accessKey=${accessKey}&amount=${amount}&extraData=${extraData}&ipnUrl=${ipnUrl}&orderId=${uniqueOrderId}&orderInfo=${orderInfo}&partnerCode=${partnerCode}&redirectUrl=${redirectUrl}&requestId=${requestId}&requestType=${requestType}`;

      const signature = crypto
        .createHmac('sha256', secretKey)
        .update(rawSignature)
        .digest('hex');

      const requestBody = {
        partnerCode,
        partnerName: 'Wedding Studio Hamy',
        storeId: 'WeddingStudioHamy',
        requestId,
        amount: amount.toString(),
        orderId: uniqueOrderId,
        orderInfo,
        redirectUrl,
        ipnUrl,
        lang,
        requestType,
        autoCapture,
        extraData,
        signature,
      };

      // Send request to Momo
      const response = await axios.post(endpoint, requestBody, {
        headers: {
          'Content-Type': 'application/json',
        },
      });

      // For captureWallet with QR code, MOMO returns qrCodeUrl or deeplink
      const momoResponse = response.data as MomoPaymentResponse;

      // Check if Momo returned an error (resultCode != 0 and != 9000)
      if (
        momoResponse.resultCode &&
        momoResponse.resultCode !== 0 &&
        momoResponse.resultCode !== 9000
      ) {
        console.warn(
          `Momo returned error code ${momoResponse.resultCode}: ${momoResponse.message}`,
        );
      }
      // Return complete response including all URLs for QR code display
      // Make sure to include the original uniqueOrderId in response for tracking
      return {
        ...momoResponse,
        payUrl: momoResponse.payUrl || null,
        qrCodeUrl: momoResponse.qrCodeUrl || null, // MOMO QR code URL for displaying QR
        deeplink: momoResponse.deeplink || null, // Mobile app deeplink
        qrCode: momoResponse.qrCode || null, // Base64 encoded QR code if available
        orderId: uniqueOrderId, // Return the unique order ID we created
      };
    } catch (error) {
      throw new BadRequestException(
        `Momo payment creation failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Query transaction status from Momo
   * Can be used to check payment status if IPN is delayed or to complement IPN callbacks
   * @param orderId - The unique order ID returned from createPayment (includes timestamp)
   */
  async queryTransactionStatus(
    orderId: string,
  ): Promise<MomoTransactionQueryResponse> {
    try {
      const { accessKey, secretKey, partnerCode, queryEndpoint, lang } =
        MomoConfig;

      // For query, use the exact orderId provided (could be the unique ID with timestamp)
      const rawSignature = `accessKey=${accessKey}&orderId=${orderId}&partnerCode=${partnerCode}&requestId=${orderId}`;

      const signature = crypto
        .createHmac('sha256', secretKey)
        .update(rawSignature)
        .digest('hex');

      const requestBody = {
        partnerCode,
        requestId: orderId,
        orderId: orderId,
        signature,
        lang,
      };

      const response = await axios.post(queryEndpoint, requestBody, {
        headers: {
          'Content-Type': 'application/json',
        },
      });

      return response.data as MomoTransactionQueryResponse;
    } catch (error) {
      throw new BadRequestException(
        `Momo status query failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  verifySignature(data: Record<string, unknown>, signature: string): boolean {
    const { secretKey } = MomoConfig;
    const rawData = `accessKey=${MomoConfig.accessKey}&amount=${String(data.amount)}&extraData=${String(data.extraData)}&ipnUrl=${MomoConfig.ipnUrl}&orderId=${String(data.orderId)}&orderInfo=${String(data.orderInfo)}&partnerCode=${String(data.partnerCode)}&redirectUrl=${MomoConfig.redirectUrl}&requestId=${String(data.requestId)}&requestType=${MomoConfig.requestType}`;

    const expectedSignature = crypto
      .createHmac('sha256', secretKey)
      .update(rawData)
      .digest('hex');

    return expectedSignature === signature;
  }

  /**
   * Verify IPN callback signature from Momo
   * IPN signature uses different order of fields than payment creation
   */
  verifyIPNSignature(data: MomoIPNCallback, signature: string): boolean {
    const { secretKey } = MomoConfig;

    // IPN signature verification order (different from payment creation)
    // rawSignature = accessKey=...&amount=...&extraData=...&message=...&orderId=...&orderInfo=...&orderType=...&partnerCode=...&payType=...&requestId=...&responseTime=...&resultCode=...&transId=...
    const rawSignature = `accessKey=${MomoConfig.accessKey}&amount=${data.amount}&extraData=${data.extraData}&message=${data.message}&orderId=${data.orderId}&orderInfo=${data.orderInfo}&orderType=${data.orderType}&partnerCode=${data.partnerCode}&payType=${data.payType}&requestId=${data.requestId}&responseTime=${data.responseTime}&resultCode=${data.resultCode}&transId=${data.transId}`;

    const expectedSignature = crypto
      .createHmac('sha256', secretKey)
      .update(rawSignature)
      .digest('hex');

    return expectedSignature === signature;
  }

  /**
   * Generate IPN response signature
   * Response must be signed before sending back to Momo
   */
  generateIPNResponseSignature(resultCode: number): string {
    const { secretKey } = MomoConfig;
    const rawSignature = `accessKey=${MomoConfig.accessKey}&resultCode=${resultCode}`;

    return crypto
      .createHmac('sha256', secretKey)
      .update(rawSignature)
      .digest('hex');
  }
}

import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';

/**
 * Payment event types emitted when payment status changes
 */
export enum PaymentEventType {
  /**
   * Emitted when IPN callback is received and payment is successful
   */
  PAYMENT_SUCCESSFUL = 'payment.successful',

  /**
   * Emitted when IPN callback indicates payment failure
   */
  PAYMENT_FAILED = 'payment.failed',

  /**
   * Emitted when IPN callback is received but duplicate (idempotent)
   */
  PAYMENT_DUPLICATE = 'payment.duplicate',

  /**
   * Emitted when order payment status changes (e.g., UNPAID -> PARTIAL -> PAID)
   */
  ORDER_PAYMENT_STATUS_CHANGED = 'order.payment_status_changed',
}

/**
 * Payment event payload structure
 */
export interface PaymentEventPayload {
  bookingId: string;
  transId: string;
  amount: number;
  method: string;
  timestamp: Date;
  message?: string;
  resultCode?: number;
}

/**
 * Order payment status event payload
 */
export interface OrderPaymentStatusEventPayload {
  bookingId: string;
  previousStatus: string;
  newStatus: string;
  totalPaid: number;
  totalPrice: number;
  remainingBalance: number;
  timestamp: Date;
}

@Injectable()
export class PaymentEventsService {
  private readonly logger = new Logger('PaymentEventsService');

  constructor(private readonly eventEmitter: EventEmitter2) {}

  /**
   * Emit payment successful event
   * Frontend can listen to this event via WebSocket/polling to update UI
   */
  emitPaymentSuccessful(payload: PaymentEventPayload): void {
    this.logger.log(
      `Emitting PAYMENT_SUCCESSFUL event for booking: ${payload.bookingId}`,
    );
    this.eventEmitter.emit(PaymentEventType.PAYMENT_SUCCESSFUL, payload);
  }

  /**
   * Emit payment failed event
   */
  emitPaymentFailed(payload: PaymentEventPayload): void {
    this.logger.log(
      `Emitting PAYMENT_FAILED event for booking: ${payload.bookingId}`,
    );
    this.eventEmitter.emit(PaymentEventType.PAYMENT_FAILED, payload);
  }

  /**
   * Emit payment duplicate event (idempotent request)
   */
  emitPaymentDuplicate(payload: PaymentEventPayload): void {
    this.logger.log(
      `Emitting PAYMENT_DUPLICATE event for booking: ${payload.bookingId}`,
    );
    this.eventEmitter.emit(PaymentEventType.PAYMENT_DUPLICATE, payload);
  }

  /**
   * Emit order payment status changed event
   */
  emitOrderPaymentStatusChanged(payload: OrderPaymentStatusEventPayload): void {
    this.logger.log(
      `Emitting ORDER_PAYMENT_STATUS_CHANGED event for booking: ${payload.bookingId}. ` +
        `Status: ${payload.previousStatus} -> ${payload.newStatus}`,
    );
    this.eventEmitter.emit(
      PaymentEventType.ORDER_PAYMENT_STATUS_CHANGED,
      payload,
    );
  }
}

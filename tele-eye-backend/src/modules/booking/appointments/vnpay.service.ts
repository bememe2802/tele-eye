import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import dayjs from 'dayjs';

@Injectable()
export class VnpayService {
  constructor(private configService: ConfigService) {}

  createPaymentUrl(orderId: string, amount: number, ip: string) {
    const date = dayjs();
    const secretKey = this.configService.get<string>('VNPAY_SECRET_KEY');
    if (!secretKey) throw new Error('Missing VNPAY_SECRET_KEY in config');
    const tmnCode = this.configService.get<string>('VNPAY_TMN_CODE');
    const returnUrl = this.configService.get<string>('VNPAY_RETURN_URL');
    const vnpUrl = 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html';

    let vnp_Params: any = {
      vnp_Version: '2.1.0',
      vnp_Command: 'pay',
      vnp_TmnCode: tmnCode,
      vnp_Amount: (amount * 100).toString(),
      vnp_CurrCode: 'VND',
      vnp_TxnRef: orderId,
      vnp_OrderInfo: `Thanh toan don hang ${orderId}`,
      vnp_OrderType: 'other',
      vnp_Locale: 'vn',
      vnp_ReturnUrl: returnUrl,
      vnp_IpAddr: ip,
      vnp_CreateDate: date.format('YYYYMMDDHHmmss'),
    };

    vnp_Params = this.sortObject(vnp_Params);

    const rawData = Object.keys(vnp_Params)
      .map(
        (key) =>
          `${encodeURIComponent(key)}=${encodeURIComponent(vnp_Params[key]).replace(/%20/g, '+')}`,
      )
      .join('&');

    const hmac = crypto.createHmac('sha512', secretKey);
    const signed = hmac.update(Buffer.from(rawData, 'utf-8')).digest('hex');

    const finalQuery = Object.keys(vnp_Params)
      .map(
        (key) =>
          `${encodeURIComponent(key)}=${encodeURIComponent(vnp_Params[key]).replace(/%20/g, '+')}`,
      )
      .join('&');

    return `${vnpUrl}?${finalQuery}&vnp_SecureHash=${signed}`;
  }

  verifyReturnUrl(query: any) {
    // FIX #9: clone object thay vì mutate thẳng query gốc
    const vnp_Params = { ...query };
    const vnp_SecureHash = vnp_Params['vnp_SecureHash'];
    delete vnp_Params['vnp_SecureHash'];
    delete vnp_Params['vnp_SecureHashType'];

    const sortedParams = this.sortObject(vnp_Params);

    const signData = Object.keys(sortedParams)
      .map(
        (key) =>
          `${encodeURIComponent(key)}=${encodeURIComponent(sortedParams[key]).replace(/%20/g, '+')}`,
      )
      .join('&');

    const secretKey = this.configService.get<string>('VNPAY_SECRET_KEY');
    if (!secretKey) throw new Error('Missing VNPAY_SECRET_KEY in config');
    const hmac = crypto.createHmac('sha512', secretKey);
    const signed = hmac.update(Buffer.from(signData, 'utf-8')).digest('hex');

    if (vnp_SecureHash === signed) {
      return {
        success: vnp_Params['vnp_ResponseCode'] === '00',
        orderId: vnp_Params['vnp_TxnRef'],
        amount: vnp_Params['vnp_Amount'] / 100,
        message:
          vnp_Params['vnp_ResponseCode'] === '00'
            ? 'Thành công'
            : 'Thất bại hoặc bị hủy',
      };
    } else {
      return { success: false, message: 'Chữ ký không hợp lệ' };
    }
  }

  private sortObject(obj: any) {
    const sorted = {};
    const keys = Object.keys(obj).sort();
    keys.forEach((key) => {
      sorted[key] = obj[key];
    });
    return sorted;
  }
}

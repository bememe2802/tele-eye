import * as crypto from 'crypto';
import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { VnpayService } from './vnpay.service';

describe('VnpayService', () => {
  let service: VnpayService;
  let configService: { get: jest.Mock };

  const toQueryObject = (url: string) =>
    Object.fromEntries(new URL(url).searchParams.entries());

  const createSignedQuery = (
    extra: Record<string, string>,
    secret = 'secret-key',
  ) => {
    const params = {
      vnp_Amount: '10000',
      vnp_CreateDate: '20260523093000',
      vnp_IpAddr: '127.0.0.1',
      vnp_Locale: 'vn',
      vnp_OrderInfo: 'Thanh toan don hang 123',
      vnp_OrderType: 'other',
      vnp_ResponseCode: '00',
      vnp_ReturnUrl: 'https://tele-eye.vn/return',
      vnp_TmnCode: 'TMNCODE',
      vnp_TxnRef: '123',
      vnp_Version: '2.1.0',
      ...extra,
    };
    const sorted = Object.keys(params)
      .sort()
      .reduce<Record<string, string>>((acc, key) => {
        acc[key] = params[key];
        return acc;
      }, {});

    const signData = Object.keys(sorted)
      .map(
        (key) =>
          `${encodeURIComponent(key)}=${encodeURIComponent(sorted[key]).replace(/%20/g, '+')}`,
      )
      .join('&');

    const vnp_SecureHash = crypto
      .createHmac('sha512', secret)
      .update(Buffer.from(signData, 'utf-8'))
      .digest('hex');

    return {
      ...sorted,
      vnp_SecureHash,
    };
  };

  beforeEach(async () => {
    configService = {
      get: jest.fn((key: string) => {
        const config: Record<string, string> = {
          VNPAY_SECRET_KEY: 'secret-key',
          VNPAY_TMN_CODE: 'TMNCODE',
          VNPAY_RETURN_URL: 'https://tele-eye.vn/return',
        };
        return config[key];
      }),
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        VnpayService,
        {
          provide: ConfigService,
          useValue: configService,
        },
      ],
    }).compile();

    service = moduleRef.get(VnpayService);
  });

  describe('createPaymentUrl', () => {
    it('builds a signed payment url', () => {
      const url = service.createPaymentUrl('ORDER-1', 150000, '127.0.0.1');
      const query = toQueryObject(url);

      expect(url).toContain('https://sandbox.vnpayment.vn/paymentv2/vpcpay.html');
      expect(query.vnp_TxnRef).toBe('ORDER-1');
      expect(query.vnp_Amount).toBe('15000000');
      expect(query.vnp_IpAddr).toBe('127.0.0.1');
      expect(query.vnp_SecureHash).toBeTruthy();
    });

    it('throws when the secret key is missing', () => {
      configService.get.mockImplementation((key: string) =>
        key === 'VNPAY_SECRET_KEY' ? undefined : 'value',
      );

      expect(() =>
        service.createPaymentUrl('ORDER-1', 150000, '127.0.0.1'),
      ).toThrow('Missing VNPAY_SECRET_KEY in config');
    });
  });

  describe('verifyReturnUrl', () => {
    it('returns a successful payment result for valid signatures', () => {
      const result = service.verifyReturnUrl(createSignedQuery({}));

      expect(result).toEqual({
        success: true,
        orderId: '123',
        amount: 100,
        message: 'Thành công',
      });
    });

    it('returns a failed payment result when VNPAY reports failure', () => {
      const result = service.verifyReturnUrl(
        createSignedQuery({ vnp_ResponseCode: '24' }),
      );

      expect(result).toEqual({
        success: false,
        orderId: '123',
        amount: 100,
        message: 'Thất bại hoặc bị hủy',
      });
    });

    it('returns an invalid-signature response for mismatched hashes', () => {
      const result = service.verifyReturnUrl({
        ...createSignedQuery({}),
        vnp_SecureHash: 'invalid',
      });

      expect(result).toEqual({
        success: false,
        message: 'Chữ ký không hợp lệ',
      });
    });

    it('throws when the secret key is missing during verification', () => {
      configService.get.mockReturnValue(undefined);

      expect(() => service.verifyReturnUrl(createSignedQuery({}))).toThrow(
        'Missing VNPAY_SECRET_KEY in config',
      );
    });
  });
});

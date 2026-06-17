import { ConfigService } from '@nestjs/config';
import { UnauthorizedException } from '@nestjs/common';
import { validateSepayAuthorization } from './sepay-webhook.util';

describe('validateSepayAuthorization', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('skips validation when no token is configured', () => {
    const configService = {
      get: jest.fn().mockReturnValue(undefined),
    } as unknown as ConfigService;
    const warnSpy = jest
      .spyOn(console, 'warn')
      .mockImplementation(() => undefined);

    expect(() =>
      validateSepayAuthorization(configService, 'Bearer anything'),
    ).not.toThrow();
    expect(warnSpy).toHaveBeenCalled();
  });

  it('accepts raw api key headers', () => {
    const configService = {
      get: jest
        .fn()
        .mockImplementation((key: string) =>
          key === 'SEPAY_API_KEY' ? ' token-123 ' : undefined,
        ),
    } as unknown as ConfigService;

    expect(() =>
      validateSepayAuthorization(configService, 'token-123'),
    ).not.toThrow();
  });

  it('accepts apikey and bearer prefixes with mixed casing', () => {
    const configService = {
      get: jest
        .fn()
        .mockImplementation((key: string) =>
          key === 'SEPAY_API_KEY' ? 'secret' : undefined,
        ),
    } as unknown as ConfigService;

    expect(() =>
      validateSepayAuthorization(configService, '  Bearer   secret '),
    ).not.toThrow();
    expect(() =>
      validateSepayAuthorization(configService, 'ApIKey secret'),
    ).not.toThrow();
  });

  it('throws when the header does not match any accepted token format', () => {
    const configService = {
      get: jest
        .fn()
        .mockImplementation((key: string) =>
          key === 'SEPAY_WEBHOOK_TOKEN' ? 'webhook-secret' : undefined,
        ),
    } as unknown as ConfigService;

    expect(() =>
      validateSepayAuthorization(configService, 'Bearer wrong-token'),
    ).toThrow(UnauthorizedException);
  });
});

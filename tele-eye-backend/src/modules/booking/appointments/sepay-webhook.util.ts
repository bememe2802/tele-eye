import { ConfigService } from '@nestjs/config';
import { UnauthorizedException } from '@nestjs/common';

function normalizeAuthHeader(value: string) {
  return value.trim().replace(/\s+/g, ' ').toLowerCase();
}

export function validateSepayAuthorization(
  configService: ConfigService,
  authorization?: string,
) {
  const configuredToken =
    configService.get<string>('SEPAY_API_KEY')?.trim() ||
    configService.get<string>('SEPAY_WEBHOOK_TOKEN')?.trim();

  if (!configuredToken) {
    console.warn(
      '[SePay Webhook] No webhook token configured, skipping auth check',
    );
    return;
  }

  const acceptedHeaders = new Set(
    [
      configuredToken,
      `apikey ${configuredToken}`,
      `bearer ${configuredToken}`,
    ].map(normalizeAuthHeader),
  );

  if (
    !authorization ||
    !acceptedHeaders.has(normalizeAuthHeader(authorization))
  ) {
    throw new UnauthorizedException('Invalid SePay webhook authorization');
  }
}

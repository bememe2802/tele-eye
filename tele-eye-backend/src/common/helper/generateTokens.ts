import { JwtService } from '@nestjs/jwt';
// Nhớ import UserRole từ chỗ bạn định nghĩa (ví dụ schema prisma hoặc enum riêng)
// import { UserRole } from '@prisma/client';

export async function generateTokens(
  jwtService: JwtService, // Phải truyền instance vào đây
  userId: number,
  email: string,
  role: string, // hoặc UserRole
) {
  const payload = { sub: userId, email, role };

  const [accessToken, refreshToken] = await Promise.all([
    // Access Token
    jwtService.signAsync(payload, { expiresIn: '15m' }),

    // Refresh Token (Nên cấu hình secret riêng nếu muốn xịn)
    jwtService.signAsync(payload, {
      expiresIn: '7d',
      // secret: 'REFRESH_TOKEN_SECRET' // Nếu có biến môi trường riêng
    }),
  ]);

  return { accessToken, refreshToken };
}

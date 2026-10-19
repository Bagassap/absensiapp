import { Body, Controller, Delete, Get, Headers, Post, Request, UseGuards } from '@nestjs/common';
import { PushService } from './push.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('push')
export class PushController {
  constructor(private readonly push: PushService) {}

  @Get('public-key')
  publicKey() {
    return { enabled: this.push.isEnabled, publicKey: this.push.publicKey };
  }

  @Post('subscribe')
  subscribe(
    @Request() req: any,
    @Body() body: { endpoint: string; keys: { p256dh: string; auth: string } },
    @Headers('user-agent') userAgent?: string,
  ) {
    return this.push.subscribe(req.user.id, {
      endpoint: body.endpoint,
      p256dh: body.keys.p256dh,
      auth: body.keys.auth,
      userAgent,
    });
  }

  @Delete('subscribe')
  unsubscribe(@Request() req: any, @Body() body: { endpoint: string }) {
    return this.push.unsubscribe(req.user.id, body.endpoint);
  }
}

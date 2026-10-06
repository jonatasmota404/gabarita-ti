import { Controller, Get } from '@nestjs/common';
import { Publico } from './auth/publico.decorator.js';

@Controller('saude')
export class SaudeController {
  @Publico()
  @Get()
  saude() {
    return { status: 'ok' };
  }
}

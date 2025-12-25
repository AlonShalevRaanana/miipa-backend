import { Controller, Get } from '@nestjs/common';

@Controller('meta')
export class MetaController {
  @Get('last-updates')
  lastUpdates() {
    // For MVP, hard-code or wire to PG table later
    return {
      epidemiology: '2025-01-01',
      therapies: '2025-01-01',
      pricing: '2025-01-01',
      competition: '2025-01-01'
    };
  }

  @Get('health')
  health() {
    return { status: 'ok' };
  }
}

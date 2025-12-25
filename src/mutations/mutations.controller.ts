import { Controller, Get, Query } from '@nestjs/common';
import { MutationsService, SortBy, SortOrder } from './mutations.service';

@Controller('mutations')
export class MutationsController {
  constructor(private mutationsService: MutationsService) {}

  @Get('all')
  async getAllMutations(
    @Query('limit') limit = '50',
    @Query('sortBy') sortBy: SortBy = 'actionability',
    @Query('sortOrder') sortOrder: SortOrder = 'desc',
    @Query('regions') regionsParam = 'USA,EU,APAC'
  ) {
    const regions = regionsParam.split(',').filter(r => r.trim());
    return this.mutationsService.getAllMutations(Number(limit), sortBy, sortOrder, regions);
  }
}

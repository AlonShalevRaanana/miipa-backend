import { Controller, Get, Post, Query, Body } from '@nestjs/common';
import { IndicationsService, IndicationSortBy, SortOrder } from './indications.service';
import { IndicationResearchService } from './indication-research.service';

@Controller('indications')
export class IndicationsController {
  constructor(
    private indicationsService: IndicationsService,
    private indicationResearchService: IndicationResearchService
  ) {}

  @Get('top-prevalence')
  async topPrevalence(
    @Query('limit') limit = '10',
    @Query('regions') regionsParam = 'USA,EU,APAC',
    @Query('sortBy') sortBy: IndicationSortBy = 'prevalence',
    @Query('sortOrder') sortOrder: SortOrder = 'desc'
  ) {
    const regions = regionsParam.split(',').filter(r => r.trim());
    return this.indicationsService.getTopIndications(
      Number(limit),
      regions,
      sortBy,
      sortOrder
    );
  }

  @Get('search-new')
  async searchNewIndications(
    @Query('q') query: string,
    @Query('limit') limit = '10'
  ) {
    return this.indicationResearchService.searchNewIndications(query, Number(limit));
  }

  @Post('add')
  async addIndication(@Body() body: { indicationName: string }) {
    return this.indicationResearchService.conductDeepResearch(body.indicationName);
  }
}
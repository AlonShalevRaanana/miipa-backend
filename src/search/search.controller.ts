import { Controller, Get, Query } from '@nestjs/common';
import { SearchService } from './search.service';

@Controller('search')
export class SearchController {
  constructor(private searchService: SearchService) {}

  @Get()
  async search(@Query('q') q: string) {
    if (!q || !q.trim()) return { results: [] };
    const results = await this.searchService.search(q.trim());
    return { results };
  }

  @Get('autocomplete')
  async autocomplete(
    @Query('q') q: string,
    @Query('limit') limit = '10'
  ) {
    if (!q || q.trim().length < 2) return [];
    return this.searchService.autocomplete(q.trim(), Number(limit));
  }
}
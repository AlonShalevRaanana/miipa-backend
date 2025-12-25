import { Controller, Get, Param, Query, NotFoundException } from '@nestjs/common';
import { MiipaService } from './miipa.service';

@Controller()
export class MiipaController {
  constructor(private readonly miipaService: MiipaService) {}

  @Get('indications/:id/miipa')
  async indicationMiipa(
    @Param('id') id: string,
    @Query('regions') regions?: string
  ) {
    const regionList = regions ? regions.split(',') : ['USA', 'EU', 'APAC'];
    const result = await this.miipaService.getIndicationMiipa(id, regionList);
    if (!result) throw new NotFoundException('Indication not found');
    return result;
  }

  @Get('mutations/:id/miipa')
  async mutationMiipa(
    @Param('id') id: string,
    @Query('regions') regions?: string
  ) {
    const regionList = regions ? regions.split(',') : ['USA', 'EU', 'APAC'];
    const result = await this.miipaService.getMutationMiipa(id, regionList);
    if (!result) throw new NotFoundException('Mutation not found');
    return result;
  }
}
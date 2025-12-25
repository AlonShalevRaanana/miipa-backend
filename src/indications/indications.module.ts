import { Module } from '@nestjs/common';
import { IndicationsService } from './indications.service';
import { IndicationResearchService } from './indication-research.service';
import { IndicationsController } from './indications.controller';

@Module({
  providers: [IndicationsService, IndicationResearchService],
  controllers: [IndicationsController],
  exports: [IndicationsService, IndicationResearchService]
})
export class IndicationsModule {}
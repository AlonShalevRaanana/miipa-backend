import { Module } from '@nestjs/common';
import { MiipaService } from './miipa.service';
import { MiipaController } from './miipa.controller';

@Module({
  providers: [MiipaService],
  controllers: [MiipaController]
})
export class MiipaModule {}
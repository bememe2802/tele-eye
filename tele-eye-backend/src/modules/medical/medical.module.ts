import { Module } from '@nestjs/common';
import { DrugController } from './drugs/drugs.controller';
import { DrugService } from './drugs/drugs.service';
import { RecordsController } from './records/records.controller';
import { RecordsService } from './records/records.service';

@Module({
  controllers: [RecordsController, DrugController],
  providers: [RecordsService, DrugService],
})
export class MedicalModule {}

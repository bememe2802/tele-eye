import { Module } from '@nestjs/common';
import { DoctorsController } from './doctors/doctors.controller';
import { DoctorsService } from './doctors/doctors.service';
import { PatientsController } from './patients/patients.controller';
import { PatientsService } from './patients/patients.service';

@Module({
  controllers: [DoctorsController, PatientsController],
  providers: [DoctorsService, PatientsService],
})
export class ProfileModule {}

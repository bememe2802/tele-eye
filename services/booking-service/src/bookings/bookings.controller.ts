import { Controller, Get, Post, Put, Param, Body, UseGuards, Req, Query } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { BookingsService } from './bookings.service';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { UpdateAppointmentDto } from './dto/update-appointment.dto';

@Controller()
export class BookingsController {
    constructor(private readonly bookingsService: BookingsService) { }

    @Post('appointments')
    @UseGuards(AuthGuard('jwt'))
    async createAppointment(@Body() dto: CreateAppointmentDto) {
        return this.bookingsService.createAppointment(dto);
    }

    @Get('appointments/:id')
    @UseGuards(AuthGuard('jwt'))
    async getAppointment(@Param('id') id: string) {
        return this.bookingsService.getAppointment(Number(id));
    }

    @Get('patients/:patientId/appointments')
    @UseGuards(AuthGuard('jwt'))
    async getPatientAppointments(@Param('patientId') patientId: string) {
        return this.bookingsService.getPatientAppointments(Number(patientId));
    }

    @Get('doctors/:doctorId/appointments')
    @UseGuards(AuthGuard('jwt'))
    async getDoctorAppointments(@Param('doctorId') doctorId: string) {
        return this.bookingsService.getDoctorAppointments(Number(doctorId));
    }

    @Put('appointments/:id')
    @UseGuards(AuthGuard('jwt'))
    async updateAppointment(@Param('id') id: string, @Body() dto: UpdateAppointmentDto) {
        return this.bookingsService.updateAppointment(Number(id), dto);
    }

    @Put('appointments/:id/cancel')
    @UseGuards(AuthGuard('jwt'))
    async cancelAppointment(@Param('id') id: string) {
        return this.bookingsService.cancelAppointment(Number(id));
    }

    @Get('doctors/:doctorId/schedule')
    async getDoctorSchedule(@Param('doctorId') doctorId: string) {
        return this.bookingsService.getDoctorSchedule(Number(doctorId));
    }

    @Put('doctors/:doctorId/schedule')
    @UseGuards(AuthGuard('jwt'))
    async updateDoctorSchedule(@Param('doctorId') doctorId: string, @Body() schedules: any[]) {
        return this.bookingsService.updateDoctorSchedule(Number(doctorId), schedules);
    }
}
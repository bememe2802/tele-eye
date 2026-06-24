import { Controller, Get, Post, Put, Delete, Patch, Param, Body, UseGuards, Req, Query, Headers } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { BookingsService } from './bookings.service';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { UpdateAppointmentDto } from './dto/update-appointment.dto';

@Controller()
export class BookingsController {
    constructor(private readonly bookingsService: BookingsService) { }

    @Get('schedule/system-slots')
    async getSystemSlots() {
        return this.bookingsService.getSystemSlots();
    }

    @Post('schedule/system-slots')
    @UseGuards(AuthGuard('jwt'))
    async createSystemSlot(@Body() dto: any) {
        return this.bookingsService.createSystemSlot(dto);
    }

    @Post('schedule/doctor-availability')
    @UseGuards(AuthGuard('jwt'))
    async registerAvailability(@Req() req: any, @Body() dto: any) {
        return this.bookingsService.registerAvailability(req.user.id, dto);
    }

    @Get('schedule/doctor-availability/me')
    @UseGuards(AuthGuard('jwt'))
    async getMyAvailability(@Req() req: any) {
        return this.bookingsService.getDoctorAvailability(req.user.id);
    }

    @Delete('schedule/doctor-availability/:id')
    @UseGuards(AuthGuard('jwt'))
    async deleteAvailability(@Req() req: any, @Param('id') id: string) {
        return this.bookingsService.deleteAvailability(req.user.id, Number(id));
    }

    @Post('schedule/generate-slots')
    @UseGuards(AuthGuard('jwt'))
    async generateSlots() {
        return { success: true };
    }

    @Get('schedule/calendar-slots')
    async getAvailableSlots(@Query() query: any) {
        return this.bookingsService.getAvailableSlots(query);
    }

    @Patch('schedule/calendar-slots/:id/lock')
    @UseGuards(AuthGuard('jwt'))
    async lockCalendarSlot(@Param('id') id: string, @Req() req: any) {
        return this.bookingsService.lockCalendarSlot(Number(id), req.user.id);
    }

    @Post('appointments')
    @UseGuards(AuthGuard('jwt'))
    async createAppointment(@Req() req: any, @Body() dto: CreateAppointmentDto) {
        return this.bookingsService.createAppointment(req.user.id, dto);
    }

    @Post('appointments/webhook/sepay')
    async handleSepayWebhook(
        @Headers('authorization') authorization: string | undefined,
        @Body() body: any,
    ) {
        return this.bookingsService.handleSepayWebhook(authorization, body);
    }

    @Get('appointments/patient/my')
    @UseGuards(AuthGuard('jwt'))
    async getMyAppointments(@Req() req: any) {
        return this.bookingsService.getMyAppointments(req.user.id);
    }

    @Get('appointments/doctor/today')
    @UseGuards(AuthGuard('jwt'))
    async getDoctorAppointmentsToday(@Req() req: any) {
        return this.bookingsService.getDoctorAppointmentsToday(req.user.id);
    }

    @Patch('appointments/:id/start')
    @UseGuards(AuthGuard('jwt'))
    async startAppointment(@Req() req: any, @Param('id') id: string) {
        return this.bookingsService.startAppointment(req.user.id, Number(id));
    }

    @Patch('appointments/:id/complete')
    @UseGuards(AuthGuard('jwt'))
    async completeAppointment(@Req() req: any, @Param('id') id: string, @Body() dto: any) {
        return this.bookingsService.completeAppointment(req.user.id, Number(id), dto);
    }

    @Get('appointments/:id/medical-record')
    @UseGuards(AuthGuard('jwt'))
    async getAppointmentMedicalRecord(@Req() req: any, @Param('id') id: string) {
        return this.bookingsService.getAppointmentMedicalRecord(req.user.id, Number(id));
    }

    @Get('appointments/:id/payment-status')
    @UseGuards(AuthGuard('jwt'))
    async getPaymentStatus(@Param('id') id: string, @Req() req: any) {
        return this.bookingsService.getPaymentStatus(Number(id), req.user.id);
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

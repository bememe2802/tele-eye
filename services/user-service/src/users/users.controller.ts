import { Controller, Get, Put, Patch, Post, Param, Body, UseGuards, Req } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { UsersService } from './users.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { CreateDoctorDto } from './dto/create-doctor.dto';

@Controller()
export class UsersController {
    constructor(private readonly usersService: UsersService) { }

    @Get('profile')
    @UseGuards(AuthGuard('jwt'))
    async getProfile(@Req() req: any) {
        return this.usersService.getProfile(req.user.id);
    }

    @Put('profile')
    @UseGuards(AuthGuard('jwt'))
    async updateProfile(@Req() req: any, @Body() dto: UpdateProfileDto) {
        return this.usersService.updateProfile(req.user.id, dto);
    }

    @Post('doctors')
    @UseGuards(AuthGuard('jwt'))
    async createDoctor(@Body() dto: CreateDoctorDto) {
        return this.usersService.createDoctor(dto);
    }

    @Get('doctors')
    async listDoctors() {
        return this.usersService.listDoctors();
    }

    @Get('doctors/me')
    @UseGuards(AuthGuard('jwt'))
    async getMyDoctorProfile(@Req() req: any) {
        return this.usersService.getDoctorProfileByUserId(req.user.id);
    }

    @Patch('doctors/me')
    @UseGuards(AuthGuard('jwt'))
    async updateMyDoctorProfile(@Req() req: any, @Body() dto: any) {
        return this.usersService.updateDoctorProfileByUserId(req.user.id, dto);
    }

    @Get('doctors/by-user/:userId')
    async getDoctorProfileByUserId(@Param('userId') userId: string) {
        return this.usersService.getDoctorProfileByUserId(Number(userId));
    }

    @Patch('doctors/:id')
    @UseGuards(AuthGuard('jwt'))
    async updateDoctorProfile(@Param('id') id: string, @Body() dto: any) {
        return this.usersService.updateDoctorProfileByDoctorId(Number(id), dto);
    }

    @Get('doctors/:id')
    async getDoctorProfile(@Param('id') id: string) {
        return this.usersService.getDoctorProfile(Number(id));
    }

    @Get('patients/me')
    @UseGuards(AuthGuard('jwt'))
    async getMyPatientProfile(@Req() req: any) {
        return this.usersService.getProfile(req.user.id);
    }

    @Patch('patients/me')
    @UseGuards(AuthGuard('jwt'))
    async updateMyPatientProfile(@Req() req: any, @Body() dto: UpdateProfileDto) {
        return this.usersService.updateProfile(req.user.id, dto);
    }

    @Get('patients/:id')
    @UseGuards(AuthGuard('jwt'))
    async getPatientProfile(@Param('id') id: string) {
        return this.usersService.getPatientProfile(Number(id));
    }
}

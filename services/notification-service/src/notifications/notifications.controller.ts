import { Controller, Get, Post, Patch, Param, Body } from '@nestjs/common';
import { NotificationsService } from './notifications.service';

@Controller()
export class NotificationsController {
    constructor(private readonly notificationsService: NotificationsService) { }

    @Post('notifications')
    async createNotification(
        @Body('userId') userId: number,
        @Body('type') type: string,
        @Body('title') title: string,
        @Body('message') message: string,
    ) {
        return this.notificationsService.createNotification(
            userId,
            type as any,
            title,
            message,
        );
    }

    @Get('users/:userId/notifications')
    async getUserNotifications(@Param('userId') userId: string) {
        return this.notificationsService.getUserNotifications(Number(userId));
    }

    @Patch('notifications/:id/read')
    async markAsRead(@Param('id') id: string) {
        return this.notificationsService.markAsRead(id);
    }

    @Patch('users/:userId/notifications/read-all')
    async markAllAsRead(@Param('userId') userId: string) {
        await this.notificationsService.markAllAsRead(Number(userId));
        return { success: true };
    }
}
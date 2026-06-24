import { Injectable } from '@nestjs/common';

export interface Notification {
    id: string;
    userId: number;
    type: 'APPOINTMENT_REMINDER' | 'PAYMENT_CONFIRMATION' | 'TEST_RESULT' | 'GENERAL';
    title: string;
    message: string;
    read: boolean;
    createdAt: Date;
}

@Injectable()
export class NotificationsService {
    private notifications: Notification[] = [];

    async createNotification(
        userId: number,
        type: Notification['type'],
        title: string,
        message: string,
    ): Promise<Notification> {
        const notification: Notification = {
            id: Math.random().toString(36).substring(2, 15),
            userId,
            type,
            title,
            message,
            read: false,
            createdAt: new Date(),
        };

        this.notifications.push(notification);
        return notification;
    }

    async getUserNotifications(userId: number): Promise<Notification[]> {
        return this.notifications
            .filter((n) => n.userId === userId)
            .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    }

    async markAsRead(id: string): Promise<Notification | null> {
        const notification = this.notifications.find((n) => n.id === id);
        if (notification) {
            notification.read = true;
        }
        return notification || null;
    }

    async markAllAsRead(userId: number): Promise<void> {
        this.notifications
            .filter((n) => n.userId === userId)
            .forEach((n) => (n.read = true));
    }
}
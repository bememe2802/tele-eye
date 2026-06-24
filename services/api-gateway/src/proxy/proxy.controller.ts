import {
    Controller,
    All,
    Req,
    Res,
    HttpStatus,
    HttpException,
} from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { AxiosResponse } from 'axios';
import { Request, Response } from 'express';
import { firstValueFrom } from 'rxjs';
import { ConfigService } from '@nestjs/config';

@Controller()
export class ProxyController {
    private readonly serviceUrls: Record<string, string>;

    constructor(
        private readonly httpService: HttpService,
        private readonly configService: ConfigService,
    ) {
        this.serviceUrls = {
            auth: this.configService.get<string>('AUTH_SERVICE_URL', 'http://localhost:8081'),
            users: this.configService.get<string>('USER_SERVICE_URL', 'http://localhost:8082'),
            booking: this.configService.get<string>('BOOKING_SERVICE_URL', 'http://localhost:8083'),
            medical: this.configService.get<string>('MEDICAL_SERVICE_URL', 'http://localhost:8084'),
            payment: this.configService.get<string>('PAYMENT_SERVICE_URL', 'http://localhost:8085'),
            notifications: this.configService.get<string>('NOTIFICATION_SERVICE_URL', 'http://localhost:8086'),
        };
    }

    @All('auth/*path')
    async proxyAuth(@Req() req: Request, @Res() res: Response) {
        return this.proxyToService('auth', req, res);
    }

    @All('users/*path')
    async proxyUsers(@Req() req: Request, @Res() res: Response) {
        return this.proxyToService('users', req, res);
    }

    @All('profile/*path')
    async proxyProfile(@Req() req: Request, @Res() res: Response) {
        return this.proxyToService('users', req, res, 'profile');
    }

    @All('booking/*path')
    async proxyBooking(@Req() req: Request, @Res() res: Response) {
        return this.proxyToService('booking', req, res);
    }

    @All('medical/*path')
    async proxyMedical(@Req() req: Request, @Res() res: Response) {
        return this.proxyToService('medical', req, res);
    }

    @All('drugs')
    async proxyDrugs(@Req() req: Request, @Res() res: Response) {
        return this.proxyToService('medical', req, res, 'drugs', 'drugs');
    }

    @All('admin/*path')
    async proxyAdmin(@Req() req: Request, @Res() res: Response) {
        return this.proxyToService('medical', req, res, 'admin', 'admin');
    }

    @All('payment/*path')
    async proxyPayment(@Req() req: Request, @Res() res: Response) {
        return this.proxyToService('payment', req, res);
    }

    @All('notifications/*path')
    async proxyNotifications(@Req() req: Request, @Res() res: Response) {
        return this.proxyToService('notifications', req, res);
    }

    private async proxyToService(
        serviceName: string,
        req: Request,
        res: Response,
        routePrefix?: string,
        targetPrefix?: string,
    ) {
        const baseUrl = this.serviceUrls[serviceName];
        if (!baseUrl) {
            throw new HttpException('Service not found', HttpStatus.NOT_FOUND);
        }

        // Strip the route prefix from the path
        // e.g., /api/auth/login -> /login, /api/profile/doctors -> /doctors
        const prefix = routePrefix || serviceName;
        const path = req.originalUrl.replace(`/api/${prefix}`, '');
        const targetPath = targetPrefix ? `/${targetPrefix}${path}` : path;
        const targetUrl = `${baseUrl}${targetPath}`;

        try {
            // Forward authorization header
            const headers: Record<string, string> = {
                'Content-Type': req.headers['content-type'] || 'application/json',
            };
            if (req.headers.authorization) {
                headers['Authorization'] = req.headers.authorization as string;
            }

            const method = req.method.toLowerCase() as 'get' | 'post' | 'put' | 'patch' | 'delete';

            const response: AxiosResponse = await firstValueFrom(
                this.httpService.request({
                    method,
                    url: targetUrl,
                    headers,
                    data: req.body,
                    params: req.query,
                    responseType: 'json',
                }),
            );

            res.status(response.status).json(response.data);
        } catch (error: any) {
            if (error.response) {
                res.status(error.response.status).json(error.response.data);
            } else {
                throw new HttpException(
                    'Service unavailable',
                    HttpStatus.SERVICE_UNAVAILABLE,
                );
            }
        }
    }
}

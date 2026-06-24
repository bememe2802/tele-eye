import { Module, Global } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { ConfigModule, ConfigService } from '@nestjs/config';

@Global()
@Module({
    imports: [
        ClientsModule.registerAsync([
            {
                name: 'RABBITMQ_SERVICE',
                imports: [ConfigModule],
                inject: [ConfigService],
                useFactory: (config: ConfigService) => ({
                    transport: Transport.RMQ,
                    options: {
                        urls: [config.get<string>('RABBITMQ_URL', 'amqp://guest:guest@localhost:5672')],
                        queue: 'email_queue',
                        queueOptions: {
                            durable: true,
                        },
                    },
                }),
            },
        ]),
    ],
    exports: [ClientsModule],
})
export class RabbitMQModule { }
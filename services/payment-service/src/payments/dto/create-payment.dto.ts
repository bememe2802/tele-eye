import { IsInt, IsNumber, IsOptional, IsString } from 'class-validator';

export class CreatePaymentDto {
    @IsInt()
    appointment_id: number;

    @IsInt()
    patient_id: number;

    @IsNumber()
    amount: number;

    @IsOptional()
    @IsString()
    payment_method?: string;
}
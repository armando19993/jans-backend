import {
  IsBoolean,
  IsDate,
  IsDateString,
  IsEmail,
  IsNotEmpty,
  IsNumber,
  IsNumberString,
  IsOptional,
  IsString,
} from 'class-validator';
import { STATUS_ENUM } from 'src/enums/status.enums';

export class CreateCompanyDto {
  @IsString()
  name: string;

  @IsString()
  nit: string;

  @IsEmail()
  email: string;

  @IsString()
  phone: string;

  @IsNotEmpty()
  ctda_users: number;

  @IsNotEmpty()
  ctda_documents: number;

  @IsDateString()
  date_start: string;

  @IsDateString()
  date_end: string;

  @IsBoolean()
  service_radian: boolean;

  @IsBoolean()
  service_download: boolean;

  @IsOptional()
  status: STATUS_ENUM;
}

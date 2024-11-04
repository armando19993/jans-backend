import { IsString, IsEnum, IsOptional } from 'class-validator';
import { Transform } from 'class-transformer';
import { TYPES_USERS } from '../enums/types-users.enum';
import { Company } from 'src/company/entities/company.entity';
import { STATUS_ENUM } from 'src/enums/status.enums';

export class CreateUserDto {
  @IsString()
  name: string;

  @IsString()
  username: string;

  @IsString()
  password: string;

  @Transform(({ value }) => TYPES_USERS[value as keyof typeof TYPES_USERS])
  @IsEnum(TYPES_USERS, {
    message: 'El rol debe ser uno de los que ya existen!',
  })
  role: TYPES_USERS;

  @IsOptional()
  company: Company;

  @Transform(({ value }) => STATUS_ENUM[value as keyof typeof STATUS_ENUM])
  @IsOptional()
  status: STATUS_ENUM
}

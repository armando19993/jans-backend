import { IsOptional } from 'class-validator';
import { Column } from 'typeorm';

export class CreateComunicationsClientDto {
  @IsOptional()
  view: boolean;
}

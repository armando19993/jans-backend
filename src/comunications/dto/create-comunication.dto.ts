import { IsString } from 'class-validator';

export class CreateComunicationDto {
  @IsString()
  titulo: string;

  @IsString()
  description: string;
}

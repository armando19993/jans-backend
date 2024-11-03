import { PartialType } from '@nestjs/mapped-types';
import { CreateComunicationDto } from './create-comunication.dto';

export class UpdateComunicationDto extends PartialType(CreateComunicationDto) {}

import { PartialType } from '@nestjs/mapped-types';
import { CreateComunicationsClientDto } from './create-comunications-client.dto';

export class UpdateComunicationsClientDto extends PartialType(CreateComunicationsClientDto) {}

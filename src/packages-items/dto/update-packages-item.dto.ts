import { PartialType } from '@nestjs/mapped-types';
import { CreatePackagesItemDto } from './create-packages-item.dto';

export class UpdatePackagesItemDto extends PartialType(CreatePackagesItemDto) {}

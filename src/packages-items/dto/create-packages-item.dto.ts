import { IsString, IsNotEmpty, IsUUID, IsOptional } from 'class-validator';

export class CreatePackagesItemDto {
  @IsString()
  @IsNotEmpty()
  description: string;

  @IsOptional()
  @IsUUID()
  packageId?: string;
}

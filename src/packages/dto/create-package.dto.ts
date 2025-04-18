import { IsString, IsNotEmpty, IsNumber, IsPositive, IsOptional, ValidateNested, ArrayMinSize } from 'class-validator';
import { Type } from 'class-transformer';
import { CreatePackagesItemDto } from '../../packages-items/dto/create-packages-item.dto';

export class CreatePackageDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsNotEmpty()
  shortDescription: string;

  @IsNumber()
  @IsPositive()
  price: number;

  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => CreatePackagesItemDto)
  @ArrayMinSize(0)
  items?: CreatePackagesItemDto[];
}

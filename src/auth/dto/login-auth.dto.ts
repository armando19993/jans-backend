import { IsString } from "class-validator";

export class LoginAuthDto {

    @IsString()
    user: string

    @IsString()
    password: string

}

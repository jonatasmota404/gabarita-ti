import { Transform } from 'class-transformer';
import { IsEmail, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

const aparar = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

export class EntrarDto {
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toLowerCase() : value))
  @IsEmail({}, { message: 'E-mail inválido' })
  @MaxLength(254)
  email!: string;

  @IsString()
  @MinLength(1, { message: 'Informe a senha' })
  @MaxLength(128)
  senha!: string;
}

export class CadastroDto extends EntrarDto {
  @IsString()
  @MinLength(8, { message: 'A senha precisa ter pelo menos 8 caracteres' })
  @MaxLength(128)
  declare senha: string;

  @IsOptional()
  @Transform(aparar)
  @IsString()
  @MaxLength(80)
  nome?: string;
}

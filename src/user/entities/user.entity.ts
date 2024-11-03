import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToMany,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { TYPES_USERS } from '../enums/types-users.enum';
import { Company } from 'src/company/entities/company.entity';
import { Lote } from 'src/lotes/entities/lote.entity';
import { STATUS_ENUM } from 'src/enums/status.enums';
import { ComunicationsClient } from 'src/comunications-client/entities/comunications-client.entity';

@Entity()
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column()
  username: string;

  @Column()
  password: string;

  @Column({ type: 'enum', enum: TYPES_USERS, default: TYPES_USERS.OPERATOR })
  role: TYPES_USERS;

  @Column({ type: 'enum', enum: STATUS_ENUM, default: STATUS_ENUM.ACTIVO })
  status: STATUS_ENUM;

  @ManyToOne(() => Company, (company) => company.users, { nullable: true })
  company: Company;

  @OneToMany(() => ComunicationsClient, (comunication) => comunication.user)
  comunications: ComunicationsClient[];

  @OneToMany(() => Lote, (lote) => lote.user)
  lotes: Lote[];

  @CreateDateColumn({ type: 'timestamp' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt: Date;
}

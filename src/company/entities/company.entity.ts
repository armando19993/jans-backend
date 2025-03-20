import { STATUS_ENUM } from 'src/enums/status.enums';
import { Lote } from 'src/lotes/entities/lote.entity';
import { User } from 'src/user/entities/user.entity';
import { TYPES_USERS } from 'src/user/enums/types-users.enum';
import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity()
export class Company {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column()
  nit: string;

  @Column()
  email: string;

  @Column()
  phone: string;

  @Column()
  ctda_users: number;

  @Column()
  ctda_documents: number;

  @Column({ type: 'date' })
  date_start: Date;

  @Column({ type: 'date' })
  date_end: Date;

  @Column({ default: true })
  service_radian: boolean;

  @Column({ default: false })
  service_download: boolean;

  @Column({ type: 'enum', enum: STATUS_ENUM, default: STATUS_ENUM.ACTIVO })
  status: STATUS_ENUM

  @OneToMany(() => User, (user) => user.company)
  users: User[];

  @OneToMany(() => Lote, (lote) => lote.company)
  lotes: Lote[];

  @CreateDateColumn({ type: 'timestamp' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt: Date;
}

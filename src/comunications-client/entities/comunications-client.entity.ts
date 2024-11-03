import { Comunication } from 'src/comunications/entities/comunication.entity';
import { User } from 'src/user/entities/user.entity';
import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity()
export class ComunicationsClient {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Comunication, (comunication) => comunication.clients)
  comunication: Comunication;

  @ManyToOne(() => User, (user) => user.comunications)
  user: User;

  @Column({ type: 'boolean', default: false })
  view: boolean;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt: Date;
}

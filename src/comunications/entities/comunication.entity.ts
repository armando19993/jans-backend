import { text } from 'express';
import { ComunicationsClient } from 'src/comunications-client/entities/comunications-client.entity';
import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity()
export class Comunication {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  titulo: string;

  @Column({ type: 'longtext' })
  description: string;

  @OneToMany(() => ComunicationsClient, (client) => client.comunication)
  clients: ComunicationsClient[];

  @CreateDateColumn({ type: 'timestamp' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt: Date;
}

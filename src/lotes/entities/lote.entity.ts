import { Company } from 'src/company/entities/company.entity';
import { Document } from 'src/documents/entities/document.entity';
import { User } from 'src/user/entities/user.entity';
import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity()
export class Lote {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'integer' })
  ctda_registros: number;

  @Column({ type: 'integer' })
  ctda_consultados: number;

  @Column({ type: 'boolean', default: false })
  procesado: boolean;

  @ManyToOne(() => User, (user) => user.lotes)
  user: User;

  @ManyToOne(() => Company, (company) => company.lotes)
  company: Company;

  @OneToMany(() => Document, (document) => document.lote)
  documents: Document[];

  @CreateDateColumn({ type: 'timestamp' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt: Date;
}

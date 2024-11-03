import { Event } from 'src/events/entities/event.entity';
import { Lote } from 'src/lotes/entities/lote.entity';
import {
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Entity,
  OneToMany,
  ManyToOne,
  Column,
} from 'typeorm';

@Entity()
export class Document {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  cufe: string;

  @Column({ nullable: true })
  factura_pdf: string;

  @Column({ nullable: true })
  tipo: string;

  @Column({ nullable: true })
  forma_pago: string;

  @Column({ nullable: true })
  nro_factura: string;

  @Column({ type: 'date', nullable: true })
  date_factura: Date;

  @Column({ nullable: true })
  nit_emisor: string;

  @Column({ nullable: true })
  razon_social_emisor: string;

  @Column({ nullable: true })
  nit_receptor: string;

  @Column({ nullable: true })
  razon_social_receptor: string;

  @Column({ type: 'float', precision: 3, nullable: true })
  iva: number;

  @Column({ type: 'float', precision: 3, nullable: true })
  total: number;

  @Column({ nullable: true })
  legitimo_tenedor: string;

  @Column({ type: 'boolean', default: false })
  status: boolean;

  @ManyToOne(() => Lote, (lote) => lote.documents)
  lote: Lote;

  @OneToMany(() => Event, (event) => event.document)
  events: Event[];

  @CreateDateColumn({ type: 'timestamp' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt: Date;
}

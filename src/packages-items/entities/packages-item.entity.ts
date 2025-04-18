import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne } from "typeorm";
import { Package } from "../../packages/entities/package.entity";

@Entity()
export class PackagesItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 500 })
  description: string;

  @ManyToOne(() => Package, pack => pack.items, { onDelete: 'CASCADE' })
  package: Package;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

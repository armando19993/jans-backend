import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getHello() {
    let data = {
      version: 1.0,
      developer: 'Armando Campos',
      date: '29-10-2024',
    };

    return data;
  }
}

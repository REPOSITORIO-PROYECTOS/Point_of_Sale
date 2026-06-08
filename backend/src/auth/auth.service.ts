import { Injectable } from '@nestjs/common';
import { LoginDto } from './dto/login.dto';
@Injectable()
export class AuthService { login(payload: LoginDto) { return { accessToken:'scaffold-token', user:{ email: payload.email, role:'admin' } }; } profile() { return { email:'admin@pos.local', role:'admin' }; } }

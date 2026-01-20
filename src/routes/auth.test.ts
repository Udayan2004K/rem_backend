import request from 'supertest';
import { prismaMock } from '../test/prismaMock';
import app from '../app';
import bcrypt from 'bcrypt';

describe('Auth Routes', () => {
    it('should register a new user', async () => {
        const newUser = {
            email: 'test@example.com',
            password: 'password123'
        };

        // Mock Prisma create
        prismaMock.user.create.mockResolvedValue({
            id: '123',
            email: newUser.email,
            password: 'hashedpassword'
        } as any);

        const res = await request(app)
            .post('/api/auth/register')
            .send(newUser);

        expect(res.statusCode).toEqual(200);
        expect(res.body).toHaveProperty('email', newUser.email);
        expect(prismaMock.user.create).toHaveBeenCalledWith(expect.objectContaining({
            data: expect.objectContaining({ email: newUser.email })
        }));
    });

    it('should login an existing user', async () => {
        const user = {
            id: '123',
            email: 'test@example.com',
            password: await bcrypt.hash('password123', 10)
        };

        // Mock Prisma findUnique
        prismaMock.user.findUnique.mockResolvedValue(user as any);

        const res = await request(app)
            .post('/api/auth/login')
            .send({
                email: 'test@example.com',
                password: 'password123'
            });

        expect(res.statusCode).toEqual(200);
        expect(res.body).toHaveProperty('email', 'test@example.com');
    });

    it('should fail login with wrong password', async () => {
        const user = {
            id: '123',
            email: 'test@example.com',
            password: await bcrypt.hash('password123', 10)
        };

        prismaMock.user.findUnique.mockResolvedValue(user as any);

        const res = await request(app)
            .post('/api/auth/login')
            .send({
                email: 'test@example.com',
                password: 'wrongpassword'
            });

        expect(res.statusCode).toEqual(401);
    });
});

import prisma from '../prisma'; // This will be the mocked version
import { PrismaClient } from '@prisma/client';
import { mockDeep, mockReset, DeepMockProxy } from 'jest-mock-extended';

// Mock the prisma module
jest.mock('../prisma', () => {
    const { mockDeep } = require('jest-mock-extended');
    return {
        __esModule: true,
        default: mockDeep(),
    }
});

beforeEach(() => {
    mockReset(prismaMock);
});

export const prismaMock = prisma as unknown as DeepMockProxy<PrismaClient>;

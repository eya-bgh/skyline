import { jest } from '@jest/globals';
import httpMocks from 'node-mocks-http';

// ✅ Fix jsonwebtoken mock - it's a CommonJS module
jest.unstable_mockModule('jsonwebtoken', () => ({
  default: {
    sign: jest.fn(() => 'mockedAccessToken'),
    verify: jest.fn(() => ({ userId: 'mockUserId' })),
  },
  sign: jest.fn(() => 'mockedAccessToken'),
  verify: jest.fn(() => ({ userId: 'mockUserId' })),
}));

// ✅ Mock crypto module for consistent reset tokens
jest.unstable_mockModule('crypto', () => ({
  default: {
    randomBytes: jest.fn().mockReturnValue({
      toString: jest.fn().mockReturnValue('mock-reset-token-123')
    })
  },
  randomBytes: jest.fn().mockReturnValue({
    toString: jest.fn().mockReturnValue('mock-reset-token-123')
  })
}));

// ✅ Mock bcryptjs
jest.unstable_mockModule('bcryptjs', () => ({
  default: {
    hash: jest.fn().mockResolvedValue('hashedPassword'),
    compare: jest.fn().mockResolvedValue(true),
  },
  hash: jest.fn().mockResolvedValue('hashedPassword'),
  compare: jest.fn().mockResolvedValue(true),
}));

// ✅ Create User constructor mock
const mockUserInstance = {
  _id: 'user123',
  email: 'test@example.com',
  name: 'Test User',
  _doc: {
    _id: 'user123',
    email: 'test@example.com',
    name: 'Test User',
    password: 'hashedPassword'
  },
  save: jest.fn().mockResolvedValue(true)
};

// ✅ Mock User as both constructor and static methods
const mockUser = jest.fn().mockImplementation(() => mockUserInstance);
mockUser.findOne = jest.fn();
mockUser.findById = jest.fn();
mockUser.create = jest.fn();
mockUser.findByIdAndUpdate = jest.fn();
mockUser.findByIdAndDelete = jest.fn();

jest.unstable_mockModule('../models/user.model.js', () => ({
  User: mockUser
}));

// ✅ Mock emails
const mockEmailService = {
  sendVerificationEmail: jest.fn(),
  sendWelcomeEmail: jest.fn(),
  sendPasswordResetEmail: jest.fn(),
  sendResetSuccessEmail: jest.fn()
};

jest.unstable_mockModule('../mailtrap/emails.js', () => ({
  sendVerificationEmail: mockEmailService.sendVerificationEmail,
  sendWelcomeEmail: mockEmailService.sendWelcomeEmail,
  sendPasswordResetEmail: mockEmailService.sendPasswordResetEmail,
  sendResetSuccessEmail: mockEmailService.sendResetSuccessEmail
}));

// ✅ Mock utility functions
const mockUtils = {
  generateTokenAndSetCookie: jest.fn(),
  generateTokens: jest.fn()
};

jest.unstable_mockModule('../utils/generateTokenAndSetCookie.js', () => ({
  generateTokenAndSetCookie: mockUtils.generateTokenAndSetCookie
}));

jest.unstable_mockModule('../utils/generateTokens.js', () => ({
  generateTokens: mockUtils.generateTokens
}));

// ✅ Suppress console logs during tests (optional)
beforeAll(() => {
  jest.spyOn(console, 'log').mockImplementation(() => {});
  jest.spyOn(console, 'error').mockImplementation(() => {});
});

afterAll(() => {
  console.log.mockRestore();
  console.error.mockRestore();
});

let forgotPassword, signup, login, logout, resetPassword, verifyEmail, checkAuth, refreshAccessToken;

beforeAll(async () => {
  // ✅ Import controller after mocks
  const controller = await import('../controllers/auth.controller.js');
  forgotPassword = controller.forgotPassword;
  signup = controller.signup;
  login = controller.login;
  logout = controller.logout;
  resetPassword = controller.resetPassword;
  verifyEmail = controller.verifyEmail;
  checkAuth = controller.checkAuth;
  refreshAccessToken = controller.refreshAccessToken;
});

describe('auth.controller', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('signup', () => {
    it('should return 400 if required fields are missing', async () => {
      const req = httpMocks.createRequest({
        method: 'POST',
        body: { email: 'test@example.com' }, // missing password and name
      });
      const res = httpMocks.createResponse();

      await signup(req, res);

      expect(res.statusCode).toBe(400);
      const data = res._getJSONData();
      expect(data.success).toBe(false);
      expect(data.message).toBe('All fields are required');
    });

    it('should return 400 if user already exists', async () => {
      mockUser.findOne.mockResolvedValue({ email: 'test@example.com' });

      const req = httpMocks.createRequest({
        method: 'POST',
        body: { email: 'test@example.com', password: 'password123', name: 'Test User' },
      });
      const res = httpMocks.createResponse();

      await signup(req, res);

      expect(res.statusCode).toBe(400);
      const data = res._getJSONData();
      expect(data.success).toBe(false);
      expect(data.message).toBe('User already exists');
    });

    it('should create user successfully', async () => {
      // Mock that user doesn't exist
      mockUser.findOne.mockResolvedValue(null);
      
      // Mock successful email sending
      mockEmailService.sendVerificationEmail.mockResolvedValue(true);

      const req = httpMocks.createRequest({
        method: 'POST',
        body: { email: 'test@example.com', password: 'password123', name: 'Test User' },
      });
      const res = httpMocks.createResponse();

      await signup(req, res);

      expect(res.statusCode).toBe(201);
      expect(mockUser.findOne).toHaveBeenCalledWith({ email: 'test@example.com' });
      expect(mockUser).toHaveBeenCalled(); // User constructor called
      expect(mockUserInstance.save).toHaveBeenCalled();
      expect(mockUtils.generateTokenAndSetCookie).toHaveBeenCalled();
      expect(mockEmailService.sendVerificationEmail).toHaveBeenCalled();
      
      const data = res._getJSONData();
      expect(data.success).toBe(true);
      expect(data.message).toBe('User created successfully');
    });
  });

  describe('login', () => {
    it('should return 400 if user not found', async () => {
      mockUser.findOne.mockResolvedValue(null);

      const req = httpMocks.createRequest({
        method: 'POST',
        body: { email: 'test@example.com', password: 'password123' },
      });
      const res = httpMocks.createResponse();

      await login(req, res);

      expect(res.statusCode).toBe(400);
      const data = res._getJSONData();
      expect(data.message).toBe('Invalid credentials');
    });

    it('should login successfully', async () => {
      const mockUserData = {
        _id: 'user123',
        email: 'test@example.com',
        password: 'hashedPassword',
        _doc: { _id: 'user123', email: 'test@example.com' },
        save: jest.fn().mockResolvedValue(true)
      };
      
      mockUser.findOne.mockResolvedValue(mockUserData);

      const req = httpMocks.createRequest({
        method: 'POST',
        body: { email: 'test@example.com', password: 'password123' },
      });
      const res = httpMocks.createResponse();

      await login(req, res);

      expect(res.statusCode).toBe(200);
      expect(mockUtils.generateTokens).toHaveBeenCalled();
      expect(mockUserData.save).toHaveBeenCalled();
      
      const data = res._getJSONData();
      expect(data.success).toBe(true);
      expect(data.message).toBe('Logged in successfully');
    });
  });

  describe('logout', () => {
    it('should logout successfully', async () => {
      const req = httpMocks.createRequest();
      const res = httpMocks.createResponse();

      await logout(req, res);

      expect(res.statusCode).toBe(200);
      const data = res._getJSONData();
      expect(data.success).toBe(true);
      expect(data.message).toBe('Logged out successfully');
    });
  });

  describe('verifyEmail', () => {
    it('should return 400 if verification code is invalid', async () => {
      mockUser.findOne.mockResolvedValue(null);

      const req = httpMocks.createRequest({
        method: 'POST',
        body: { code: '123456' },
      });
      const res = httpMocks.createResponse();

      await verifyEmail(req, res);

      expect(res.statusCode).toBe(400);
      const data = res._getJSONData();
      expect(data.message).toBe('Invalid or expired verification code');
    });

    it('should verify email successfully', async () => {
      const mockUserData = {
        _id: 'user123',
        email: 'test@example.com',
        name: 'Test User',
        isVerified: false,
        _doc: { _id: 'user123', email: 'test@example.com' },
        save: jest.fn().mockResolvedValue(true)
      };
      
      mockUser.findOne.mockResolvedValue(mockUserData);
      mockEmailService.sendWelcomeEmail.mockResolvedValue(true);

      const req = httpMocks.createRequest({
        method: 'POST',
        body: { code: '123456' },
      });
      const res = httpMocks.createResponse();

      await verifyEmail(req, res);

      expect(res.statusCode).toBe(200);
      expect(mockUserData.isVerified).toBe(true);
      expect(mockUserData.save).toHaveBeenCalled();
      expect(mockEmailService.sendWelcomeEmail).toHaveBeenCalled();
      
      const data = res._getJSONData();
      expect(data.success).toBe(true);
      expect(data.message).toBe('Email verified successfully');
    });
  });

  describe('resetPassword', () => {
    it('should return 400 if reset token is invalid', async () => {
      mockUser.findOne.mockResolvedValue(null);

      const req = httpMocks.createRequest({
        method: 'POST',
        params: { token: 'invalid-token' },
        body: { password: 'newPassword123' },
      });
      const res = httpMocks.createResponse();

      await resetPassword(req, res);

      expect(res.statusCode).toBe(400);
      const data = res._getJSONData();
      expect(data.message).toBe('Invalid or expired reset token');
    });

    it('should reset password successfully', async () => {
      const mockUserData = {
        _id: 'user123',
        email: 'test@example.com',
        resetPasswordToken: 'valid-token',
        resetPasswordExpiresAt: Date.now() + 3600000,
        save: jest.fn().mockResolvedValue(true)
      };
      
      mockUser.findOne.mockResolvedValue(mockUserData);
      mockEmailService.sendResetSuccessEmail.mockResolvedValue(true);

      const req = httpMocks.createRequest({
        method: 'POST',
        params: { token: 'valid-token' },
        body: { password: 'newPassword123' },
      });
      const res = httpMocks.createResponse();

      await resetPassword(req, res);

      expect(res.statusCode).toBe(200);
      expect(mockUserData.save).toHaveBeenCalled();
      expect(mockEmailService.sendResetSuccessEmail).toHaveBeenCalled();
      
      const data = res._getJSONData();
      expect(data.success).toBe(true);
      expect(data.message).toBe('Password reset successful');
    });
  });

  describe('checkAuth', () => {
    it('should return 400 if user not found', async () => {
      mockUser.findById.mockReturnValue({
        select: jest.fn().mockResolvedValue(null)
      });

      const req = httpMocks.createRequest({
        userId: 'user123'
      });
      const res = httpMocks.createResponse();

      await checkAuth(req, res);

      expect(res.statusCode).toBe(400);
      const data = res._getJSONData();
      expect(data.message).toBe('User not found');
    });

    it('should return user data successfully', async () => {
      const mockUserData = {
        _id: 'user123',
        email: 'test@example.com',
        name: 'Test User'
      };
      
      mockUser.findById.mockReturnValue({
        select: jest.fn().mockResolvedValue(mockUserData)
      });

      const req = httpMocks.createRequest({
        userId: 'user123'
      });
      const res = httpMocks.createResponse();

      await checkAuth(req, res);

      expect(res.statusCode).toBe(200);
      const data = res._getJSONData();
      expect(data.success).toBe(true);
      expect(data.user).toEqual(mockUserData);
    });
  });

  describe('refreshAccessToken', () => {
    it('should return 401 if refresh token is missing', async () => {
      const req = httpMocks.createRequest({
        cookies: {}
      });
      const res = httpMocks.createResponse();

      await refreshAccessToken(req, res);

      expect(res.statusCode).toBe(401);
      const data = res._getJSONData();
      expect(data.message).toBe('Refresh token missing');
    });

    it('should refresh access token successfully', async () => {
      const req = httpMocks.createRequest({
        cookies: { refreshToken: 'valid-refresh-token' }
      });
      const res = httpMocks.createResponse();

      await refreshAccessToken(req, res);

      expect(res.statusCode).toBe(200);
      const data = res._getJSONData();
      expect(data.success).toBe(true);
      expect(data.message).toBe('Access token refreshed');
    });
  });

  describe('forgotPassword', () => {
    it('should return 400 if user not found', async () => {
      mockUser.findOne.mockResolvedValue(null);

      const req = httpMocks.createRequest({
        method: 'POST',
        body: { email: 'test@example.com' },
      });
      const res = httpMocks.createResponse();

      await forgotPassword(req, res);

      expect(res.statusCode).toBe(400);
      expect(mockUser.findOne).toHaveBeenCalledWith({ email: 'test@example.com' });
      expect(mockEmailService.sendPasswordResetEmail).not.toHaveBeenCalled();
    });

    it('should send reset email if user found', async () => {
      const mockUserData = {
        _id: 'user123',
        email: 'test@example.com',
        resetPasswordToken: undefined,
        resetPasswordExpiresAt: undefined,
        save: jest.fn().mockResolvedValue(true),
      };
      
      mockUser.findOne.mockResolvedValue(mockUserData);
      mockEmailService.sendPasswordResetEmail.mockResolvedValue({
        success: true,
        messageId: 'test-message-id',
      });

      const req = httpMocks.createRequest({
        method: 'POST',
        body: { email: 'test@example.com' },
      });
      const res = httpMocks.createResponse();

      await forgotPassword(req, res);

      expect(res.statusCode).toBe(200);
      expect(mockUser.findOne).toHaveBeenCalledWith({ email: 'test@example.com' });
      expect(mockEmailService.sendPasswordResetEmail).toHaveBeenCalledWith(
        'test@example.com',
        expect.stringContaining('mock-reset-token-123')
      );
      expect(mockUserData.save).toHaveBeenCalled();
    });

    it('should return 400 if email sending fails', async () => {
      const mockUserData = {
        _id: 'user123',
        email: 'test@example.com',
        resetPasswordToken: undefined,
        resetPasswordExpiresAt: undefined,
        save: jest.fn().mockResolvedValue(true),
      };
      
      mockUser.findOne.mockResolvedValue(mockUserData);
      mockEmailService.sendPasswordResetEmail.mockRejectedValue(
        new Error('Email service error')
      );

      const req = httpMocks.createRequest({
        method: 'POST',
        body: { email: 'test@example.com' },
      });
      const res = httpMocks.createResponse();

      await forgotPassword(req, res);

      expect(res.statusCode).toBe(400);
      expect(mockUser.findOne).toHaveBeenCalledWith({ email: 'test@example.com' });
      expect(mockEmailService.sendPasswordResetEmail).toHaveBeenCalled();
    });
  });
});

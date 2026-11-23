import jwt from 'jsonwebtoken';

/**
 * Sign JWT Token
 */
export const signToken = (id, role = 'user') => {
  const secret = process.env.JWT_SECRET || 'bitebox_default_secure_jwt_secret_key_2026';
  return jwt.sign({ id, role }, secret, {
    expiresIn: '30d',
  });
};

/**
 * Set HttpOnly Secure Cookie and return standardized JSON response
 */
export const sendTokenResponse = (user, statusCode, res, message = 'Success') => {
  const token = signToken(user._id || user.id, user.role);

  const cookieOptions = {
    expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    path: '/',
  };

  res
    .status(statusCode)
    .cookie('bitebox_token', token, cookieOptions)
    .json({
      success: true,
      message,
      token,
      user: {
        id: user._id || user.id,
        name: user.name,
        email: user.email,
        profileImage: user.profileImage,
        provider: user.provider,
        role: user.role,
        isVerified: user.isVerified,
        createdAt: user.createdAt,
      },
    });
};

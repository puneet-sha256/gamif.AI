"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SuccessMessages = exports.ErrorMessages = void 0;
exports.createSuccessResponse = createSuccessResponse;
exports.createErrorResponse = createErrorResponse;
exports.sanitizeUser = sanitizeUser;
// Helper function to create success responses
function createSuccessResponse(message, data, user, sessionId, changes) {
    const response = {
        success: true,
        message
    };
    if (data !== undefined)
        response.data = data;
    if (user !== undefined)
        response.user = user;
    if (sessionId !== undefined)
        response.sessionId = sessionId;
    if (changes !== undefined)
        response.changes = changes;
    return response;
}
// Helper function to create error responses
function createErrorResponse(message, code) {
    const response = {
        success: false,
        message
    };
    if (code)
        response.code = code;
    return response;
}
// Helper function to remove password from user object
function sanitizeUser(user) {
    const { passwordHash, ...userWithoutPassword } = user;
    return userWithoutPassword;
}
// Common error messages
exports.ErrorMessages = {
    INVALID_REQUEST: 'Invalid request format',
    USER_EXISTS: 'Player with this email already exists',
    USERNAME_TAKEN: 'Player name already taken',
    USER_NOT_FOUND: 'Player not found in the system',
    INVALID_CREDENTIALS: 'Invalid email or password',
    INVALID_SESSION: 'Invalid session',
    INTERNAL_ERROR: 'Internal server error',
    INSUFFICIENT_SHARDS: 'Insufficient shards',
    VALIDATION_ERROR: (field) => `Invalid ${field} provided`
};
// Common success messages
exports.SuccessMessages = {
    REGISTRATION_SUCCESS: 'Player registered successfully!',
    LOGIN_SUCCESS: 'Welcome back, Player!',
    LOGOUT_SUCCESS: 'Logged out successfully',
    UPDATE_SUCCESS: 'Updated successfully',
    EXPERIENCE_UPDATED: 'Experience updated successfully',
    SHARDS_UPDATED: 'Shards updated successfully'
};
//# sourceMappingURL=responseHelpers.js.map
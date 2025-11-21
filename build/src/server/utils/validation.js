"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isValidString = isValidString;
exports.isValidNumber = isValidNumber;
exports.isValidEmail = isValidEmail;
exports.validateRegisterRequest = validateRegisterRequest;
exports.validateLoginRequest = validateLoginRequest;
exports.validateExperienceUpdateRequest = validateExperienceUpdateRequest;
exports.validateShardsUpdateRequest = validateShardsUpdateRequest;
// Server-specific validation helper functions
function isValidString(value) {
    return typeof value === 'string' && value.trim().length > 0;
}
function isValidNumber(value) {
    return typeof value === 'number' && !isNaN(value);
}
function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}
function validateRegisterRequest(body) {
    return (isValidString(body.username) &&
        isValidString(body.email) &&
        isValidEmail(body.email) &&
        isValidString(body.password) &&
        body.password.length >= 6);
}
function validateLoginRequest(body) {
    return (isValidString(body.email) &&
        isValidEmail(body.email) &&
        isValidString(body.password));
}
function validateExperienceUpdateRequest(body) {
    return (isValidString(body.sessionId) &&
        (body.strengthDelta === undefined || isValidNumber(body.strengthDelta)) &&
        (body.intelligenceDelta === undefined || isValidNumber(body.intelligenceDelta)) &&
        (body.charismaDelta === undefined || isValidNumber(body.charismaDelta)));
}
function validateShardsUpdateRequest(body) {
    return (isValidString(body.sessionId) &&
        isValidNumber(body.shardsDelta) &&
        (body.reason === undefined || isValidString(body.reason)));
}
//# sourceMappingURL=validation.js.map
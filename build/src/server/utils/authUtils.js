"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.hashPassword = hashPassword;
exports.generateSessionId = generateSessionId;
exports.generateUserId = generateUserId;
exports.verifyPassword = verifyPassword;
const uuid_1 = require("uuid");
function hashPassword(password) {
    // Simple hash function for demo purposes
    // In production, use bcrypt or similar
    let hash = 0;
    for (let i = 0; i < password.length; i++) {
        const char = password.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32-bit integer
    }
    return hash.toString();
}
function generateSessionId() {
    return (0, uuid_1.v4)();
}
function generateUserId() {
    return (0, uuid_1.v4)();
}
function verifyPassword(inputPassword, hashedPassword) {
    return hashPassword(inputPassword) === hashedPassword;
}
//# sourceMappingURL=authUtils.js.map
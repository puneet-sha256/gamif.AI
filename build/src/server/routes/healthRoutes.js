"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.healthCheck = healthCheck;
const responseHelpers_1 = require("../utils/responseHelpers");
// Health check
function healthCheck(_req, res) {
    const response = (0, responseHelpers_1.createSuccessResponse)('Server is running', { timestamp: new Date().toISOString() });
    res.json(response);
}
//# sourceMappingURL=healthRoutes.js.map
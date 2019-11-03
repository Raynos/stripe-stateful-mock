"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const log = require("loglevel");
const server_1 = require("./server");
if (process.env.hasOwnProperty("LOG_LEVEL")) {
    log.setLevel(process.env["LOG_LEVEL"]);
}
const app = server_1.createApp();
exports.app = app;
const port = process.env["PORT"] || 8000;
exports.port = port;
app.listen(+port, () => {
    log.info(`Server started on port ${port}`);
});
//# sourceMappingURL=index.js.map
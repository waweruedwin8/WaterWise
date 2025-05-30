const functions = require("firebase-functions");
const app = require("./app");

// Export the app as a Firebase HTTPS function
exports.app = functions.https.onRequest(app);

const functions = require("firebase-functions");
const app = require("./app");

// Export the app as a Firebase HTTPS function
// exports.app = functions.https.onRequest(app);
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
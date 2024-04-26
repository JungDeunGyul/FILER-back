const admin = require("firebase-admin");

const base64Encoded = `${process.env.FIREBASE_ADMIN_SDK}=`;
const decodedJson = Buffer.from(base64Encoded, "base64").toString("utf-8");
const serviceAccount = JSON.parse(decodedJson);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const verifyToken = async (req, res, next) => {
  try {
    const userToken = req.body.token;

    if (!userToken) {
      return res.status(400).json({ message: "The token does not exist." });
    }

    const decodedData = await admin.auth().verifyIdToken(userToken);
    req.user = decodedData;

    next();
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }
};

module.exports = verifyToken;

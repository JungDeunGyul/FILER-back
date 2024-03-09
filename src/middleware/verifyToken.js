const admin = require("firebase-admin");

const serviceAccount = require(process.env.GOOGLE_CREDENTIALS);

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

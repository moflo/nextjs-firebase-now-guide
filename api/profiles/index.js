const url = require("url");
// const { firestore } = require("../../lib/firebase");

const serviceAccount = require("../../credentials/serviceAccountKey.json");
const admin = require("firebase-admin");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

var db = admin.firestore();

module.exports = async (req, res) => {
  const { query } = url.parse(req.url, true);
  let current_page = parseInt(query.page) || 1;
  const limit = parseInt(query.limit) || 9;

  // const db = admin.firestore();
  const snapshot = await db.collection("users").get();

  const pageCount = 10;
  const page = 1;
  // const documents = snapshot.docs;

  // console.log("Firestore documents: ", snapshot.data() );
  var profiles = [];
  snapshot.forEach(doc => {
    // console.log(doc.id, "=>", doc.data());
    const profile = { id: doc.id, ...doc.data() };
    profiles.push(profile);
  });

  //   console.log("Firestore profiles json: ", JSON.stringify(profiles));

  res.end(JSON.stringify({ profiles, pageCount, page }));
};

const url = require("url");
const fetch = require("isomorphic-unfetch");

module.exports = async (req, res) => {
  const { query } = url.parse(req.url, true);
  let profile_id = query.id || "TEST";

  const FIREBASE_HOST = process.env.FIREBASE_HOST;

  const data = await fetch(
    `${FIREBASE_HOST}/databases/(default)/documents/users/${profile_id}`
  );
  const json = await data.json();

  console.log("Firestore profile json: ", JSON.stringify(json));

  const name = json.fields.name.stringValue;
  const avatar = json.fields.avatar_url.stringValue;
  const address = json.fields.email.stringValue;
  const email = json.fields.email.stringValue;

  res.end(JSON.stringify({ profile: {name, avatar, address, email } }));

};

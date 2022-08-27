const express = require("express");
const ces = require("./main");
const app = express();
const port = 3000;
app.use(express.static(`${__dirname}/public`));
app.get("/", (req, res) => {
  // res.send("Hello World!");
  res.sendFile("index.html", { root: __dirname });
});

app.get("/assetids", (req, res) => {
  data = ces.getAssetIds();
  data.then((resp) => {
    console.log(resp);
    resp = JSON.stringify(resp);
    res.send(resp);
  });
});

app.get("/uploads", (req, res) => {
  const data = ces.uploadFiles();
  data.then((resp) => {
    console.log(resp);
    ces.afterUploadReq(resp);
    resp = JSON.stringify(resp);
    res.send(resp);
  });
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}!`);
});

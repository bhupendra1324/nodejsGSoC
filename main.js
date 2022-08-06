// Retrieve a list of assets available with the supplied accessToken
const request = require("request-promise");
const AWS = require("aws-sdk");
const fs = require("fs");
const accessToken =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiJjZDVlYzI3Ni01ZTcxLTQzNzEtYjA1MC1lNTQ4MmI3OWI3ZjEiLCJpZCI6OTgyMzAsImlhdCI6MTY1OTY5MTQ4N30.kocZXnKaN5T_JK3f6BxjELLWZLkZ9HwvPl4okUJSUsw"; // Replace this with your token from above.

let resp = null;
const start = async function (ifcomplete = null) {
  const response = await request({
    url: "https://api.cesium.com/v1/assets",
    headers: { Authorization: `Bearer ${accessToken}` },
    json: true,
  });

  //   console.log(response);
  const data = await response;
  return data, ifcomplete;
};

const promise = start();
promise.then((data, ifcomplete) => {
  resp = data;
  //   console.log(data);
});

const postBody = {
  name: "Reichstag",
  description: "See [Wikipedia](https://en.wikipedia.org/?curid=217577).",
  type: "3DTILES",
  options: {
    sourceType: "CITYGML",
    clampToTerrain: true,
    baseTerrainId: 1,
  },
};

let postResponse = null;
let s3 = null;
const post_asset = async function () {
  const response = await request({
    url: "https://api.cesium.com/v1/assets",
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}` },
    json: true,
    body: postBody,
  });
  postResponse = response;
  const uploadLocation = postResponse.uploadLocation;
  s3 = new AWS.S3({
    apiVersion: "2006-03-01",
    region: "us-east-1",
    signatureVersion: "v4",
    endpoint: uploadLocation.endpoint,
    credentials: new AWS.Credentials(
      uploadLocation.accessKey,
      uploadLocation.secretAccessKey,
      uploadLocation.sessionToken
    ),
  });
  // console.log(response);
  upload(uploadLocation, postResponse);
};

post_asset();

const upload = async (uploadLocation, response) => {
  const input = "./Reichstag.zip";

  await s3
    .upload({
      Body: fs.createReadStream(input),
      Bucket: uploadLocation.bucket,
      Key: `${uploadLocation.prefix}Reichstag.zip`,
    })
    .promise()
    .then((res) => {
      console.log("Hello");
      console.log(res);
      const onComplete1 = response.onComplete;
      onComplete(onComplete1, response);
    });
};

const onComplete = async (response, mainRes) => {
  await request({
    url: response.url,
    method: response.method,
    headers: { Authorization: `Bearer ${accessToken}` },
    json: true,
    body: response.fields,
  }).then((r) => {
    console.log(r);
    waitUntilReady(mainRes);
  });
  console.log("Okay");
};

async function waitUntilReady(response) {
  const assetId = response.assetMetadata.id;

  // Issue a GET request for the metadata
  const assetMetadata = await request({
    url: `https://api.cesium.com/v1/assets/${assetId}`,
    headers: { Authorization: `Bearer ${accessToken}` },
    json: true,
  });

  const status = assetMetadata.status;
  if (status === "COMPLETE") {
    console.log("Asset tiled successfully");
    console.log(
      `View in ion: https://cesium.com/ion/assets/${assetMetadata.id}`
    );
  } else if (status === "DATA_ERROR") {
    console.log("ion detected a problem with the uploaded data.");
  } else if (status === "ERROR") {
    console.log(
      "An unknown tiling error occurred, please contact support@cesium.com."
    );
  } else {
    if (status === "NOT_STARTED") {
      console.log("Tiling pipeline initializing.");
    } else {
      // IN_PROGRESS
      console.log(`Asset is ${assetMetadata.percentComplete}% complete.`);
    }

    // Not done yet, check again in 10 seconds
    setTimeout(waitUntilReady, 10000);
  }
}

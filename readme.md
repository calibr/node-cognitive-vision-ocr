## Microsoft Cognitive Services Vision OCR Client

### Install

`npm i cognitive-vision-ocr`

### Usage

In the example below image is sent for recognition as a buffer and response is returned in gcloud vision format(if you don't need to convert a response to gcloud format just remove `gcloud` option from request as well as `imageSize` because it is used only for converting)

```js
var ocr = require("./index");
var fs = require("fs");

var image = fs.readFileSync("./test.jpg");

ocr({
  key: "PUT YOUR API KEY HERE",
  image: image,
  gcloud: true,
  imageSize: {
    width: 728,
    height: 546
  }
}).then((data) => {
  console.log(JSON.stringify(data[1].responses[0].textAnnotations));
}).catch((err) => {
  console.log(err);
});
```


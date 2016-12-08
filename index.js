var request = require("request");

function deg2rad(deg) {
  return deg * (Math.PI/180);
}

function parseBoundingBox(bb) {
  var [x, y, width, height] = bb.split(",");
  return {
    x: parseInt(x),
    y: parseInt(y),
    width: parseInt(width),
    height: parseInt(height)
  };
}

function rotateVertex(cx, cy, angle, vertex) {
  vertex = {x: vertex.x, y: vertex.y};
  if(angle == 0) {
    return vertex;
  }

  vertex.y = -vertex.y;
  cy = -cy;

  var s = Math.sin(deg2rad(angle));
  var c = Math.cos(deg2rad(angle));
  vertex.x -= cx;
  vertex.y -= cy;
  var xnew = vertex.x * c - vertex.y * s;
  var ynew = vertex.x * s + vertex.y * c;
  vertex.x = xnew + cx;
  vertex.y = ynew + cy;

  vertex.y = -vertex.y;
  cy = -cy;

  return vertex;
}

function boxToPoly(box) {
  let vertex = {x: box.x, y: box.y};
  let poly = [
    vertex,
    {x: vertex.x + box.width, y: vertex.y},
    {x: vertex.x + box.width, y: vertex.y + box.height},
    {x: vertex.x, y: vertex.y + box.height},
  ];
  return poly;
}

function mergePolys(destination, source) {
  if(source[0].x < destination[0].x) {
    destination[0].x = source[0].x;
  }
  if(source[0].y < destination[0].y) {
    destination[0].y = source[0].y;
  }

  if(source[1].x > destination[1].x) {
    destination[1].x = source[1].x;
  }
  if(source[1].y < destination[1].y) {
    destination[1].y = source[1].y;
  }

  if(source[2].x > destination[2].x) {
    destination[2].x = source[2].x;
  }
  if(source[2].y > destination[2].y) {
    destination[2].y = source[2].y;
  }

  if(source[3].x < destination[3].x) {
    destination[3].x = source[3].x;
  }
  if(source[3].y > destination[3].y) {
    destination[3].y = source[3].y;
  }
  return destination;
}

function convertToGcloudFormat(cognitiveData, cx, cy) {
  var annotations = [];
  var fullText = "";
  var fullTextPoly = null;
  for(let region of cognitiveData.regions) {
    let regionPoly = boxToPoly(parseBoundingBox(region.boundingBox));
    if(!fullTextPoly) {
      fullTextPoly = regionPoly;
    }
    else {
      fullTextPoly = mergePolys(fullTextPoly, regionPoly);
    }
    for(let line of region.lines) {
      for(let word of line.words) {
        fullText += word.text + " ";
        let wordBox = parseBoundingBox(word.boundingBox);
        let poly = boxToPoly(wordBox);
        for(let i = 0; i != poly.length; i++) {
          let vertex = poly[i];
          poly[i] = rotateVertex(cx, cy, -cognitiveData.textAngle, vertex);
        }
        annotations.push({
          boundingPoly: {
            vertices: poly
          },
          description: word.text
        });
      }
      fullText += "\n";
    }
  }
  if(fullTextPoly) {
    annotations.unshift({
      boundingPoly: {
        vertices: fullTextPoly
      },
      locale: cognitiveData.language,
      description: fullText
    });
  }
  return annotations.length ? annotations : null;
}


module.exports = function(params, cb) {
  var requestParams = {
    url: "https://api.projectoxford.ai/vision/v1.0/ocr",
    method: "POST",
    headers: {
      'Ocp-Apim-Subscription-Key': params.key
    }
  };
  if(typeof params.image === "string") {
    // url
    requestParams.body = JSON.stringify({
      url: params.image
    });
    requestParams.headers["Content-Type"] = "application/json";
  }
  else {
    requestParams.headers["Content-Type"] = "application/octet-stream";
    requestParams.body = params.image;
  }
  return new Promise(function(resolve, reject) {
    request(requestParams, function(err, res, data) {
      if(err) {
        return reject(err);
      }
      try {
        data = JSON.parse(data);
      }
      catch(ex) {
        return reject("Can't parse JSON response(" + data + ")");
      }
      if(res.statusCode !== 200) {
        var err = new Error(data.message);
        return reject(err);
      }
      if(params.gcloud && params.imageSize) {
        // should return response like gcloud vision
        let cx = params.imageSize.width / 2;
        let cy = params.imageSize.height / 2;
        let annotations = convertToGcloudFormat(data, cx, cy);
        data = [null, {
          responses: [{
            textAnnotations: annotations
          }]
        }];
      }
      resolve(data)
    });
  }).then((data) => {
    if(cb) {
      cb(null, data);
    }
    return data;
  }).catch((err) => {
    if(cb) {
      cb(err);
    }
    throw err;
  });
};
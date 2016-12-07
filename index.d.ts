interface DetectParams {
  key: string,
  image: string | Object,
  gcloud?: boolean,
  imageSize?: {
    width: number,
    height: number
  }
}

declare function detect(detectParams: DetectParams, cb: any);

export = detect

// getImageProps normally receives images.qualities from Next's build-time
// define plugin. Plain Vitest otherwise silently clamps quality65 to75.
// Use the real installed optimizer helpers with the site's existing allowlist.
import type { ImageProps } from "next/image";
import { getImgProps } from "next/dist/shared/lib/get-img-props";
import { imageConfigDefault } from "next/dist/shared/lib/image-config";
import defaultLoader from "next/dist/shared/lib/image-loader";

export function getImageProps(input: ImageProps) {
  return getImgProps(input, {
    defaultLoader,
    imgConf: { ...imageConfigDefault, qualities: [65, 75] },
  });
}

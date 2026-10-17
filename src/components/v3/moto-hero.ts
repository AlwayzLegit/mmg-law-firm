import { getImageProps } from "next/image";

// Keep the original artwork and intrinsic dimensions. The existing Next image
// optimizer negotiates AVIF/WebP; no asset, crop, or page metadata is rewritten.
const { props } = getImageProps({
  src: "/v3/moto-photos/motorcycle-coastal-highway-hero.webp",
  alt: "",
  width: 1672,
  height: 941,
  quality: 65,
});

export const MOTO_HERO = {
  src: props.src,
  srcSet: props.srcSet,
  style: {
    // Fallback for browsers without image-set(). The density candidates below
    // are also used by the preload, so supporting browsers fetch one image.
    background: `#12171b url("${props.src}") center/cover no-repeat`,
    backgroundImage: `image-set(${props.srcSet!
      .split(", ")
      .map((candidate) => {
        const [url, density] = candidate.split(" ");
        return `url("${url}") ${density}`;
      })
      .join(", ")})`,
  },
};

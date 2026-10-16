import { getImageProps } from "next/image";

// Preserve each original asset, intrinsic dimensions, crop and background.
// Matching density candidates let the preload and CSS request the same image.
function optimizedBackground(src: string, width: number, height: number) {
  const { props } = getImageProps({ src, alt: "", width, height, quality: 75 });
  return {
    src: props.src,
    srcSet: props.srcSet,
    style: {
      background: `#12171b url("${props.src}") center/cover no-repeat`,
      backgroundImage: `image-set(${props
        .srcSet!.split(", ")
        .map((candidate) => {
          const [url, density] = candidate.split(" ");
          return `url("${url}") ${density}`;
        })
        .join(", ")})`,
    },
  };
}

export const CAR_HERO = optimizedBackground(
  "/v3/photos/car-accident-hero.webp",
  1920,
  817,
);

export const TRUCK_HERO = optimizedBackground(
  "/v3/photos/truck-highway-hero.webp",
  1920,
  640,
);

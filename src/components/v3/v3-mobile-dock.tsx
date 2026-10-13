import Link from "next/link";

import { FIRM } from "@/lib/constants";

/** Persistent tap-to-call + consultation dock on small screens. */
export function V3MobileDock() {
  return (
    <div role="region" aria-label="Quick contact" className="v3-dock">
      <a href={`tel:${FIRM.phoneTel}`} className="v3-dock-call">
        <svg width="18" height="18" viewBox="0 0 256 256" fill="currentColor" aria-hidden="true">
          <path d="M231.88,175.08A56.26,56.26,0,0,1,176,224C96.6,224,32,159.4,32,80A56.26,56.26,0,0,1,80.92,24.12a16,16,0,0,1,16.62,9.52l21.12,47.15,0,.12A16,16,0,0,1,117.39,96c-.18.27-.37.52-.57.77L96,121.45c7.49,15.22,23.41,31,38.83,38.51l24.34-20.71a8.12,8.12,0,0,1,.75-.56,16,16,0,0,1,15.17-1.4l.13.06,47.11,21.11A16,16,0,0,1,231.88,175.08Z" />
        </svg>
        Call
      </a>
      <Link href="/contact" className="v3-dock-consult">
        Free consultation
      </Link>
    </div>
  );
}

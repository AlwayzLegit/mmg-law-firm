"use client";

import * as React from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";

import { updateLeadCase } from "./actions";

export type CaseOption = { id: string; name: string };
export type CityOption = CaseOption & { county_id: string | null };

/**
 * Intake sets the case facts the public form left blank (practice area,
 * county, city, incident date). The public form keeps these optional on
 * purpose; the firm fills them in after the first call so the lead shows up
 * in the right practice-area and county reports.
 */
export default function CaseControl({
  leadId,
  current,
  practiceAreas,
  counties,
  cities,
}: {
  leadId: string;
  current: {
    practice_area_id: string | null;
    county_id: string | null;
    city_id: string | null;
    incident_date: string | null;
  };
  practiceAreas: CaseOption[];
  counties: CaseOption[];
  cities: CityOption[];
}) {
  const [pa, setPa] = React.useState(current.practice_area_id ?? "");
  const [county, setCounty] = React.useState(current.county_id ?? "");
  const [city, setCity] = React.useState(current.city_id ?? "");
  const [incident, setIncident] = React.useState(current.incident_date ?? "");
  const [pending, startTransition] = React.useTransition();

  const cityChoices = county ? cities.filter((c) => c.county_id === county) : cities;
  const dirty =
    pa !== (current.practice_area_id ?? "") ||
    county !== (current.county_id ?? "") ||
    city !== (current.city_id ?? "") ||
    incident !== (current.incident_date ?? "");

  function onCountyChange(next: string) {
    setCounty(next);
    // A city outside the newly chosen county no longer applies.
    if (city && next && !cities.some((c) => c.id === city && c.county_id === next)) {
      setCity("");
    }
  }

  function save() {
    const fd = new FormData();
    fd.set("leadId", leadId);
    fd.set("practice_area_id", pa);
    fd.set("county_id", county);
    fd.set("city_id", city);
    fd.set("incident_date", incident);
    startTransition(async () => {
      const result = await updateLeadCase(fd);
      if (result.ok) toast.success("Case details saved.");
      else toast.error(result.error);
    });
  }

  const selectClass =
    "h-9 w-full rounded-md border border-border bg-background px-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring";

  return (
    <div className="grid gap-3">
      <label className="grid gap-1 text-xs">
        <span className="text-muted-foreground font-medium tracking-[0.18em] uppercase">
          Practice area
        </span>
        <select value={pa} onChange={(e) => setPa(e.currentTarget.value)} className={selectClass}>
          <option value="">— not set —</option>
          {practiceAreas.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </label>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="grid gap-1 text-xs">
          <span className="text-muted-foreground font-medium tracking-[0.18em] uppercase">
            County
          </span>
          <select
            value={county}
            onChange={(e) => onCountyChange(e.currentTarget.value)}
            className={selectClass}
          >
            <option value="">— not set —</option>
            {counties.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-1 text-xs">
          <span className="text-muted-foreground font-medium tracking-[0.18em] uppercase">
            City
          </span>
          <select value={city} onChange={(e) => setCity(e.currentTarget.value)} className={selectClass}>
            <option value="">— not set —</option>
            {cityChoices.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
      </div>
      <label className="grid gap-1 text-xs">
        <span className="text-muted-foreground font-medium tracking-[0.18em] uppercase">
          Incident date
        </span>
        <input
          type="date"
          value={incident}
          onChange={(e) => setIncident(e.currentTarget.value)}
          max={new Date().toISOString().slice(0, 10)}
          className={selectClass}
        />
      </label>
      <div>
        <Button size="sm" onClick={save} disabled={pending || !dirty}>
          {pending ? "Saving..." : "Save case details"}
        </Button>
      </div>
    </div>
  );
}

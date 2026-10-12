import { StyleSheet, Text, View } from "@react-pdf/renderer";
import type { Database } from "@/lib/db/types";
import { todayIso } from "@/lib/domain/dates";
import { formatCents } from "@/lib/domain/money";
import { formatDate } from "@/lib/format";

type Vehicle = Database["public"]["Tables"]["vehicles"]["Row"];

export const styles = StyleSheet.create({
  page: {
    paddingTop: 36,
    paddingBottom: 48,
    paddingHorizontal: 40,
    fontSize: 9.5,
    fontFamily: "Helvetica",
    color: "#111",
  },
  title: { fontSize: 18, fontFamily: "Helvetica-Bold" },
  subtitle: { fontSize: 10, color: "#555", marginTop: 2 },
  header: {
    borderBottomWidth: 1,
    borderBottomColor: "#111",
    paddingBottom: 10,
    marginBottom: 14,
  },
  meta: { flexDirection: "row", flexWrap: "wrap", marginTop: 8 },
  metaItem: { marginRight: 18, marginTop: 2 },
  metaLabel: { fontSize: 7.5, color: "#666", textTransform: "uppercase" },
  h2: {
    fontSize: 12,
    fontFamily: "Helvetica-Bold",
    marginTop: 10,
    marginBottom: 6,
  },
  entry: {
    borderBottomWidth: 0.5,
    borderBottomColor: "#ccc",
    paddingVertical: 7,
  },
  row: { flexDirection: "row" },
  date: { width: 72, fontFamily: "Helvetica-Bold" },
  odo: { width: 72, color: "#444" },
  body: { flex: 1 },
  jobTitle: { fontFamily: "Helvetica-Bold" },
  small: { fontSize: 8.5, color: "#444", marginTop: 2 },
  mono: { fontFamily: "Courier", fontSize: 8.5 },
  cost: { width: 70, textAlign: "right" },
  footer: {
    position: "absolute",
    bottom: 20,
    left: 40,
    right: 40,
    fontSize: 7.5,
    color: "#777",
    flexDirection: "row",
    justifyContent: "space-between",
  },
});

export function VehicleHeader({
  vehicle,
  title,
  filters,
}: {
  vehicle: Vehicle;
  title: string;
  filters: { from: string | null; to: string | null; phaseName: string | null };
}) {
  const range =
    filters.from || filters.to
      ? `${filters.from ? formatDate(filters.from) : "start"} – ${filters.to ? formatDate(filters.to) : "today"}`
      : null;
  const items = [
    [
      "Vehicle",
      [vehicle.year, vehicle.model ?? vehicle.name].filter(Boolean).join(" ") +
        (vehicle.generation ? ` (${vehicle.generation})` : ""),
    ],
    ["VIN", vehicle.vin ?? "—"],
    [
      "Current odometer",
      `${vehicle.current_odometer.toLocaleString("en-US")} mi`,
    ],
    ["Generated", formatDate(todayIso())],
    ...(range ? [["Dates", range]] : []),
    ...(filters.phaseName ? [["Phase", filters.phaseName]] : []),
  ];
  return (
    <View style={styles.header}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.subtitle}>{vehicle.name}</Text>
      <View style={styles.meta}>
        {items.map(([label, value]) => (
          <View key={label} style={styles.metaItem}>
            <Text style={styles.metaLabel}>{label}</Text>
            <Text>{value}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

export function Footer({ note }: { note?: string | null }) {
  return (
    <View style={styles.footer} fixed>
      <Text>{note ?? "Cayenne Project Tracker"}</Text>
      <Text
        render={({ pageNumber, totalPages }) =>
          `Page ${pageNumber} of ${totalPages}`
        }
      />
    </View>
  );
}

export const money = (cents: number | null) =>
  cents === null ? "" : formatCents(cents);

export function partLine(p: {
  name: string;
  brand: string | null;
  oem_part_number: string | null;
  aftermarket_part_number: string | null;
}) {
  const numbers = [
    p.oem_part_number && `OEM ${p.oem_part_number}`,
    p.aftermarket_part_number,
  ]
    .filter(Boolean)
    .join(" · ");
  return { label: p.brand ? `${p.brand} ${p.name}` : p.name, numbers };
}

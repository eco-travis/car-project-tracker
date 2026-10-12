import { Document, Image, Page, Text, View } from "@react-pdf/renderer";
import type { loadBuildSheet } from "@/lib/exports/data";
import { formatDate } from "@/lib/format";
import { Footer, VehicleHeader, money, partLine, styles } from "./common";

type Data = Awaited<ReturnType<typeof loadBuildSheet>>;

/** Spec export: modifications grouped by phase, installed parts, one photo per job. */
export function BuildSheetPdf({ data }: { data: Data }) {
  const total = data.showCosts
    ? data.groups.reduce((s, g) => s + (g.subtotalCents ?? 0), 0)
    : null;
  return (
    <Document
      title={`${data.vehicle.name} build sheet`}
      author="Cayenne Project Tracker"
    >
      <Page size="LETTER" style={styles.page}>
        <VehicleHeader
          vehicle={data.vehicle}
          title="Build sheet"
          filters={data.filters}
        />
        {data.groups.length === 0 && (
          <Text>No completed modifications in this range.</Text>
        )}
        {data.groups.map((g) => (
          <View key={g.phaseName}>
            <View style={[styles.row, { alignItems: "flex-end" }]}>
              <Text style={[styles.h2, styles.body]}>{g.phaseName}</Text>
              {data.showCosts && (
                <Text style={[styles.cost, styles.h2]}>
                  {money(g.subtotalCents)}
                </Text>
              )}
            </View>
            {g.jobs.map((j) => (
              <View key={j.id} style={[styles.entry, styles.row]} wrap={false}>
                {j.photo && (
                  // eslint-disable-next-line jsx-a11y/alt-text -- react-pdf Image has no alt
                  <Image
                    src={j.photo}
                    style={{
                      width: 120,
                      height: 90,
                      objectFit: "cover",
                      marginRight: 10,
                    }}
                  />
                )}
                <View style={styles.body}>
                  <Text style={styles.jobTitle}>{j.title}</Text>
                  <Text style={styles.small}>
                    {formatDate(j.completed_on)}
                    {j.completed_odometer !== null
                      ? ` · ${j.completed_odometer.toLocaleString("en-US")} mi`
                      : ""}
                  </Text>
                  {j.parts.length === 0 && (
                    <Text style={styles.small}>
                      No installed parts recorded.
                    </Text>
                  )}
                  {j.parts.map((p, i) => {
                    const { label, numbers } = partLine(p);
                    return (
                      <Text key={i} style={styles.small}>
                        • {label}
                        {numbers ? (
                          <Text style={styles.mono}> {numbers}</Text>
                        ) : null}
                      </Text>
                    );
                  })}
                </View>
                {data.showCosts && (
                  <Text style={styles.cost}>{money(j.costCents)}</Text>
                )}
              </View>
            ))}
          </View>
        ))}
        {total !== null && data.groups.length > 0 && (
          <View style={[styles.row, { marginTop: 10 }]}>
            <Text
              style={[
                styles.body,
                { textAlign: "right", fontFamily: "Helvetica-Bold" },
              ]}
            >
              Total
            </Text>
            <Text style={[styles.cost, { fontFamily: "Helvetica-Bold" }]}>
              {money(total)}
            </Text>
          </View>
        )}
        <Footer />
      </Page>
    </Document>
  );
}

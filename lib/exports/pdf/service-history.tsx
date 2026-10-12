import { Document, Image, Page, Text, View } from "@react-pdf/renderer";
import type { loadServiceHistory } from "@/lib/exports/data";
import { formatDate } from "@/lib/format";
import { PERFORMED_BY_LABELS, JOB_TYPE_LABELS } from "@/lib/labels";
import { Footer, VehicleHeader, money, partLine, styles } from "./common";

type Data = Awaited<ReturnType<typeof loadServiceHistory>>;

/** Spec export: every done Maintenance/Repair/Diagnosis job, newest first. */
export function ServiceHistoryPdf({ data }: { data: Data }) {
  const total = data.showCosts
    ? data.entries.reduce((s, e) => s + (e.costCents ?? 0), 0)
    : null;
  return (
    <Document
      title={`${data.vehicle.name} service history`}
      author="Cayenne Project Tracker"
    >
      <Page size="LETTER" style={styles.page}>
        <VehicleHeader
          vehicle={data.vehicle}
          title="Service history"
          filters={data.filters}
        />
        {data.entries.length === 0 ? (
          <Text>
            No completed maintenance, repair, or diagnosis jobs in this range.
          </Text>
        ) : (
          data.entries.map((e) => (
            <View key={e.id} style={styles.entry} wrap={false}>
              <View style={styles.row}>
                <Text style={styles.date}>{formatDate(e.completed_on)}</Text>
                <Text style={styles.odo}>
                  {e.completed_odometer !== null
                    ? `${e.completed_odometer.toLocaleString("en-US")} mi`
                    : ""}
                </Text>
                <View style={styles.body}>
                  <Text style={styles.jobTitle}>{e.title}</Text>
                  <Text style={styles.small}>
                    {[
                      JOB_TYPE_LABELS[e.type],
                      e.performed_by
                        ? `${PERFORMED_BY_LABELS[e.performed_by]}${e.performer_name ? `: ${e.performer_name}` : ""}`
                        : null,
                      e.phaseName,
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </Text>
                  {e.notes && <Text style={styles.small}>{e.notes}</Text>}
                  {e.parts.map((p, i) => {
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
                  {e.receipts.length > 0 && (
                    <View style={{ flexDirection: "row", marginTop: 4 }}>
                      {e.receipts.map((r, i) => (
                        // eslint-disable-next-line jsx-a11y/alt-text -- react-pdf Image has no alt
                        <Image
                          key={i}
                          src={r}
                          style={{
                            width: 54,
                            height: 54,
                            objectFit: "cover",
                            marginRight: 4,
                          }}
                        />
                      ))}
                    </View>
                  )}
                </View>
                {data.showCosts && (
                  <Text style={styles.cost}>{money(e.costCents)}</Text>
                )}
              </View>
            </View>
          ))
        )}
        {total !== null && data.entries.length > 0 && (
          <View style={[styles.row, { marginTop: 8 }]}>
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
        <Footer note={data.note} />
      </Page>
    </Document>
  );
}

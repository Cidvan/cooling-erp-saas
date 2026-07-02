import { Document, Page, Text, View, StyleSheet, PDFViewer } from '@react-pdf/renderer';
import { format } from 'date-fns';
import type { ServiceReport, Client, ServiceLineItem, ServiceTechnician, ServiceAcUnit } from '@shared/schema';

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 10,
    fontFamily: 'Helvetica',
  },
  header: {
    marginBottom: 20,
    borderBottom: '2 solid #2563eb',
    paddingBottom: 10,
  },
  companyName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2563eb',
    marginBottom: 4,
  },
  companyTagline: {
    fontSize: 9,
    color: '#64748b',
    marginBottom: 8,
  },
  documentTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1e293b',
    marginTop: 8,
  },
  section: {
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 8,
    paddingBottom: 4,
    borderBottom: '1 solid #e2e8f0',
  },
  row: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  label: {
    width: '35%',
    fontSize: 9,
    color: '#64748b',
  },
  value: {
    width: '65%',
    fontSize: 10,
    color: '#1e293b',
  },
  textArea: {
    fontSize: 9,
    color: '#1e293b',
    lineHeight: 1.4,
    marginTop: 4,
    padding: 8,
    backgroundColor: '#f8fafc',
    borderRadius: 4,
  },
  table: {
    marginTop: 8,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#f1f5f9',
    padding: 6,
    fontWeight: 'bold',
    fontSize: 9,
    borderBottom: '1 solid #cbd5e1',
  },
  tableRow: {
    flexDirection: 'row',
    padding: 6,
    borderBottom: '1 solid #e2e8f0',
  },
  tableCell: {
    fontSize: 9,
    color: '#1e293b',
  },
  technicianCard: {
    backgroundColor: '#f8fafc',
    padding: 8,
    marginBottom: 6,
    borderRadius: 4,
    border: '1 solid #e2e8f0',
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 40,
    right: 40,
    textAlign: 'center',
    fontSize: 8,
    color: '#94a3b8',
    borderTop: '1 solid #e2e8f0',
    paddingTop: 10,
  },
});

interface ServiceReportPDFProps {
  serviceReport: ServiceReport;
  client: Client;
  lineItems?: ServiceLineItem[];
  technicians?: ServiceTechnician[];
  acUnits?: ServiceAcUnit[];
}

export function ServiceReportPDFDocument({ serviceReport, client, lineItems = [], technicians = [], acUnits = [] }: ServiceReportPDFProps) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.companyName}>JCAJ COOLING SOLUTIONS</Text>
          <Text style={styles.companyTagline}>Professional Air Conditioning Services</Text>
          <Text style={styles.documentTitle}>SERVICE REPORT</Text>
        </View>

        {/* Service Report Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Service Report Details</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Report Number:</Text>
            <Text style={styles.value}>{serviceReport.reportNumber}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Service Date:</Text>
            <Text style={styles.value}>
              {serviceReport.serviceDate ? format(new Date(serviceReport.serviceDate), 'MMMM dd, yyyy') : '-'}
            </Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Status:</Text>
            <Text style={styles.value}>{serviceReport.status?.toUpperCase()}</Text>
          </View>
        </View>

        {/* Client Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Client Information</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Name:</Text>
            <Text style={styles.value}>{client.name}</Text>
          </View>
          {client.company && (
            <View style={styles.row}>
              <Text style={styles.label}>Company:</Text>
              <Text style={styles.value}>{client.company}</Text>
            </View>
          )}
          <View style={styles.row}>
            <Text style={styles.label}>Contact:</Text>
            <Text style={styles.value}>{Array.isArray(client.phone) ? client.phone.join(' / ') : client.phone}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Email:</Text>
            <Text style={styles.value}>{client.email}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Address:</Text>
            <Text style={styles.value}>{client.address}</Text>
          </View>
        </View>

        {/* AC Unit Details */}
        {acUnits.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Air Conditioning Unit Details</Text>
            {acUnits.map((unit, index) => (
              <View key={index} style={{ marginBottom: 8, padding: 6, borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 4 }}>
                <Text style={{ fontSize: 9, fontWeight: 'bold', color: '#64748b', marginBottom: 4 }}>Unit {index + 1}</Text>
                {unit.acBrand ? <View style={styles.row}><Text style={styles.label}>Brand:</Text><Text style={styles.value}>{unit.acBrand}</Text></View> : null}
                {unit.acModel ? <View style={styles.row}><Text style={styles.label}>Model:</Text><Text style={styles.value}>{unit.acModel}</Text></View> : null}
                {unit.acSerialNumber ? <View style={styles.row}><Text style={styles.label}>Serial Number:</Text><Text style={styles.value}>{unit.acSerialNumber}</Text></View> : null}
                {unit.acLocation ? <View style={styles.row}><Text style={styles.label}>Location:</Text><Text style={styles.value}>{unit.acLocation}</Text></View> : null}
                {unit.serviceDone ? <View style={styles.row}><Text style={styles.label}>Service Done:</Text><Text style={styles.value}>{unit.serviceDone}</Text></View> : null}
              </View>
            ))}
          </View>
        )}

        {/* Technicians */}
        {technicians.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Assigned Technicians</Text>
            {technicians.map((tech, index) => (
              <View key={index} style={styles.technicianCard}>
                <Text style={{ fontSize: 10, fontWeight: 'bold', marginBottom: 4 }}>
                  {tech.technicianName}
                </Text>
                <View style={styles.row}>
                  <Text style={styles.label}>Time Started:</Text>
                  <Text style={styles.value}>
                    {tech.timeStarted ? format(new Date(tech.timeStarted), 'MMM dd, yyyy hh:mm a') : '-'}
                  </Text>
                </View>
                <View style={styles.row}>
                  <Text style={styles.label}>Time Ended:</Text>
                  <Text style={styles.value}>
                    {tech.timeEnded ? format(new Date(tech.timeEnded), 'MMM dd, yyyy hh:mm a') : '-'}
                  </Text>
                </View>
                {tech.duration && (
                  <View style={styles.row}>
                    <Text style={styles.label}>Duration:</Text>
                    <Text style={styles.value}>{tech.duration}</Text>
                  </View>
                )}
              </View>
            ))}
          </View>
        )}

        {/* Service Details */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Service Details</Text>
          
          {serviceReport.troubleReported && (
            <View style={{ marginBottom: 8 }}>
              <Text style={{ fontSize: 9, fontWeight: 'bold', color: '#64748b', marginBottom: 2 }}>
                Trouble Reported:
              </Text>
              <Text style={styles.textArea}>{serviceReport.troubleReported}</Text>
            </View>
          )}

          {serviceReport.troubleFound && (
            <View style={{ marginBottom: 8 }}>
              <Text style={{ fontSize: 9, fontWeight: 'bold', color: '#64748b', marginBottom: 2 }}>
                Trouble Found:
              </Text>
              <Text style={styles.textArea}>{serviceReport.troubleFound}</Text>
            </View>
          )}

          {serviceReport.workDone && (
            <View style={{ marginBottom: 8 }}>
              <Text style={{ fontSize: 9, fontWeight: 'bold', color: '#64748b', marginBottom: 2 }}>
                Work Done:
              </Text>
              <Text style={styles.textArea}>{serviceReport.workDone}</Text>
            </View>
          )}

          {serviceReport.recommendations && (
            <View style={{ marginBottom: 8 }}>
              <Text style={{ fontSize: 9, fontWeight: 'bold', color: '#64748b', marginBottom: 2 }}>
                Recommendations:
              </Text>
              <Text style={styles.textArea}>{serviceReport.recommendations}</Text>
            </View>
          )}
        </View>

        {/* Line Items */}
        {lineItems.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Service Items</Text>
            <View style={styles.table}>
              <View style={styles.tableHeader}>
                <Text style={{ width: '10%', ...styles.tableCell }}>Qty</Text>
                <Text style={{ width: '50%', ...styles.tableCell }}>Description</Text>
                <Text style={{ width: '20%', ...styles.tableCell }}>Unit Price</Text>
                <Text style={{ width: '20%', ...styles.tableCell }}>Amount</Text>
              </View>
              {lineItems.map((item, index) => (
                <View key={index} style={styles.tableRow}>
                  <Text style={{ width: '10%', ...styles.tableCell }}>{item.quantity}</Text>
                  <Text style={{ width: '50%', ...styles.tableCell }}>{item.unitDescription}</Text>
                  <Text style={{ width: '20%', ...styles.tableCell }}>
                    ₱{parseFloat(item.unitPrice || '0').toFixed(2)}
                  </Text>
                  <Text style={{ width: '20%', ...styles.tableCell }}>
                    ₱{parseFloat(item.amount || '0').toFixed(2)}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Footer */}
        <View style={styles.footer}>
          <Text>This is an official service report from JCAJ Cooling Solutions</Text>
          <Text style={{ marginTop: 2 }}>
            Generated on {format(new Date(), 'MMMM dd, yyyy - hh:mm a')}
          </Text>
        </View>
      </Page>
    </Document>
  );
}

interface ServiceReportPDFViewerProps {
  serviceReport: ServiceReport;
  client: Client;
  lineItems?: ServiceLineItem[];
  technicians?: ServiceTechnician[];
  acUnits?: ServiceAcUnit[];
}

export default function ServiceReportPDFViewer({ serviceReport, client, lineItems = [], technicians = [], acUnits = [] }: ServiceReportPDFViewerProps) {
  return (
    <div className="w-full h-screen" data-testid="pdf-viewer-service-report">
      <PDFViewer width="100%" height="100%">
        <ServiceReportPDFDocument
          serviceReport={serviceReport}
          client={client}
          lineItems={lineItems}
          technicians={technicians}
          acUnits={acUnits}
        />
      </PDFViewer>
    </div>
  );
}

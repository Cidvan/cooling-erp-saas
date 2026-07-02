import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';
import { format } from 'date-fns';
import type { Quotation, Client, QuotationLineItem } from '@shared/schema';

const styles = StyleSheet.create({
  page: {
    paddingTop: 40,
    paddingBottom: 60,
    paddingHorizontal: 50,
    fontSize: 10,
    fontFamily: 'Helvetica',
  },
  headerContainer: {
    alignItems: 'center',
    marginBottom: 4,
  },
  companyName: {
    fontSize: 13,
    fontFamily: 'Helvetica-Bold',
    textAlign: 'center',
    marginBottom: 2,
  },
  headerLine: {
    fontSize: 9,
    textAlign: 'center',
    marginBottom: 1,
  },
  headerDivider: {
    borderBottom: '1 solid #000',
    marginTop: 6,
    marginBottom: 0,
  },
  title: {
    fontSize: 13,
    fontFamily: 'Helvetica-Bold',
    textAlign: 'center',
    marginTop: 10,
    marginBottom: 10,
    letterSpacing: 1,
  },
  dateRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  dateText: { fontSize: 10 },
  quotationNumber: { fontSize: 10 },
  clientBlock: { marginBottom: 8 },
  clientRow: { flexDirection: 'row', marginBottom: 2 },
  clientLabel: { width: 52, fontSize: 10, fontFamily: 'Helvetica-Bold' },
  clientColon: { width: 10, fontSize: 10 },
  clientIndent: { width: 62 },
  clientValue: { flex: 1, fontSize: 10 },
  reRow: { flexDirection: 'row', marginBottom: 10 },
  salutation: { fontSize: 10, marginTop: 6, marginBottom: 6 },
  bodyText: { fontSize: 10, marginBottom: 8, lineHeight: 1.5 },
  table: { marginTop: 8, marginBottom: 4 },
  tableHeaderRow: {
    flexDirection: 'row',
    borderTop: '1 solid #000',
    borderBottom: '1 solid #000',
    paddingVertical: 4,
    backgroundColor: '#eeeeee',
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 4,
    borderBottom: '0.5 solid #cccccc',
  },
  tableTotalRow: {
    flexDirection: 'row',
    paddingVertical: 5,
    borderTop: '1 solid #000',
    marginTop: 2,
  },
  colQty: { width: '9%', fontSize: 9, textAlign: 'center', fontFamily: 'Helvetica-Bold' },
  colQtyVal: { width: '9%', fontSize: 9, textAlign: 'center' },
  colDesc: { flex: 1, fontSize: 9, paddingHorizontal: 6, fontFamily: 'Helvetica-Bold' },
  colDescVal: { flex: 1, fontSize: 9, paddingHorizontal: 6 },
  colDescTotal: { flex: 1, fontSize: 9, paddingHorizontal: 6, fontFamily: 'Helvetica-Bold', textAlign: 'right' },
  colUnitPrice: { width: '18%', fontSize: 9, textAlign: 'right', fontFamily: 'Helvetica-Bold', paddingRight: 4 },
  colUnitPriceVal: { width: '18%', fontSize: 9, textAlign: 'right', paddingRight: 4 },
  colAmount: { width: '18%', fontSize: 9, textAlign: 'right', fontFamily: 'Helvetica-Bold', paddingRight: 2 },
  colAmountVal: { width: '18%', fontSize: 9, textAlign: 'right', paddingRight: 2 },
  footerSection: { marginTop: 12 },
  footerField: { flexDirection: 'row', marginBottom: 8, alignItems: 'flex-end' },
  footerLabel: { fontSize: 10, fontFamily: 'Helvetica-Bold', minWidth: 130 },
  footerUnderline: {
    flex: 1,
    borderBottom: '0.5 solid #000',
    fontSize: 10,
    paddingBottom: 1,
    minHeight: 14,
  },
  notesSection: { marginTop: 10 },
  closingText: { fontSize: 10, marginTop: 14, lineHeight: 1.5 },
  signatureSection: { marginTop: 14 },
  signatureGreeting: { fontSize: 10, marginBottom: 22 },
  signatureName: { fontSize: 10, fontFamily: 'Helvetica-Bold' },
  signatureTitle: { fontSize: 10 },
});

const formatCurrency = (amount: string | number | null | undefined) => {
  if (amount === null || amount === undefined || amount === '') return '\u20b10.00';
  const n = typeof amount === 'string' ? parseFloat(amount) : amount;
  return `\u20b1${n.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

interface QuotationPDFDocumentProps {
  quotation: Quotation;
  client: Client;
  lineItems: QuotationLineItem[];
  companyName?: string;
}

export function QuotationPDFDocument({ quotation, client, lineItems, companyName }: QuotationPDFDocumentProps) {
  const hasUnitPrice = lineItems.some(item => parseFloat(item.unitPrice || '0') > 0);

  const clientDisplay = client.company || client.name;
  const phones = Array.isArray(client.phone)
    ? client.phone.join(' / ')
    : (client.phone || '');

  return (
    <Document>
      <Page size="A4" style={styles.page}>

        {/* Header */}
        <View style={styles.headerContainer}>
          <Text style={styles.companyName}>{companyName || "CoolDesk"}</Text>
          <Text style={styles.headerLine}>#014 Pulo, Cabuyao, Laguna</Text>
          <Text style={styles.headerLine}>Contact Number: (0938) 405 9180 / (0922) 904 7082 / (0966) 678 9798</Text>
          <Text style={styles.headerLine}>Email: jcajcoolingsolutions@yahoo.com</Text>
        </View>
        <View style={styles.headerDivider} />

        {/* Title */}
        <Text style={styles.title}>QUOTATION</Text>

        {/* Date + Quotation Number */}
        <View style={styles.dateRow}>
          <Text style={styles.dateText}>
            {quotation.quotationDate ? format(new Date(quotation.quotationDate), 'MMMM d, yyyy') : ''}
          </Text>
          <Text style={styles.quotationNumber}>NO.: {quotation.quotationNumber}</Text>
        </View>

        {/* Client Block */}
        <View style={styles.clientBlock}>
          <View style={styles.clientRow}>
            <Text style={styles.clientLabel}>TO</Text>
            <Text style={styles.clientColon}>:</Text>
            <Text style={styles.clientValue}>{clientDisplay}</Text>
          </View>
          {client.address ? (
            <View style={styles.clientRow}>
              <Text style={styles.clientIndent}> </Text>
              <Text style={styles.clientValue}>{client.address}</Text>
            </View>
          ) : null}
          {phones ? (
            <View style={styles.clientRow}>
              <Text style={styles.clientIndent}> </Text>
              <Text style={styles.clientValue}>{phones}</Text>
            </View>
          ) : null}
        </View>

        {/* RE line */}
        {quotation.title ? (
          <View style={styles.reRow}>
            <Text style={styles.clientLabel}>RE.</Text>
            <Text style={styles.clientColon}>:</Text>
            <Text style={styles.clientValue}>{quotation.title}</Text>
          </View>
        ) : null}

        {/* Salutation */}
        <Text style={styles.salutation}>Dear Sir/Madam,</Text>

        {/* Introduction / Description */}
        {quotation.description ? (
          <Text style={styles.bodyText}>{quotation.description}</Text>
        ) : (
          <Text style={styles.bodyText}>
            We would like to present our scope of work and best price our company can offer you on the above mentioned subject, to wit;
          </Text>
        )}

        {/* Line Items Table */}
        {lineItems.length > 0 ? (
          <View style={styles.table}>
            {/* Table header */}
            <View style={styles.tableHeaderRow}>
              <Text style={styles.colQty}>QTY.</Text>
              <Text style={styles.colDesc}>DESCRIPTION</Text>
              {hasUnitPrice ? <Text style={styles.colUnitPrice}>UNIT PRICE</Text> : null}
              <Text style={styles.colAmount}>AMOUNT</Text>
            </View>

            {/* Rows */}
            {lineItems.map((item, i) => (
              <View key={i} style={styles.tableRow}>
                <Text style={styles.colQtyVal}>{item.quantity}</Text>
                <Text style={styles.colDescVal}>{item.unitDescription}</Text>
                {hasUnitPrice ? (
                  <Text style={styles.colUnitPriceVal}>
                    {parseFloat(item.unitPrice || '0') > 0 ? formatCurrency(item.unitPrice) : ''}
                  </Text>
                ) : null}
                <Text style={styles.colAmountVal}>{formatCurrency(item.amount)}</Text>
              </View>
            ))}

            {/* Total row */}
            <View style={styles.tableTotalRow}>
              <Text style={styles.colQtyVal}> </Text>
              <Text style={styles.colDescTotal}>TOTAL CONTRACT PRICE</Text>
              {hasUnitPrice ? <Text style={styles.colUnitPriceVal}> </Text> : null}
              <Text style={styles.colAmountVal}>{formatCurrency(quotation.total)}</Text>
            </View>
          </View>
        ) : null}

        {/* Footer fields */}
        <View style={styles.footerSection}>
          <View style={styles.footerField}>
            <Text style={styles.footerLabel}>AMOUNT IN WORDS:</Text>
            <Text style={styles.footerUnderline}> </Text>
          </View>
          <View style={styles.footerField}>
            <Text style={styles.footerLabel}>COMPLETION       :</Text>
            <Text style={styles.footerUnderline}> </Text>
          </View>
          <View style={styles.footerField}>
            <Text style={styles.footerLabel}>TERMS OF PAYMENT:</Text>
            <Text style={styles.footerUnderline}>{quotation.terms || ' '}</Text>
          </View>
        </View>

        {/* Notes / Exclusions */}
        {quotation.notes ? (
          <View style={styles.notesSection}>
            <Text style={styles.bodyText}>{quotation.notes}</Text>
          </View>
        ) : null}

        {/* Closing */}
        <Text style={styles.closingText}>
          Hoping that the above quotations meet your requirements, should you have further concerns regarding this matter, please feel free to contact us at your most convenient time.{'\n\n'}Thank you for giving us the opportunity to work with you.
        </Text>

        {/* Signature */}
        <View style={styles.signatureSection}>
          <Text style={styles.signatureGreeting}>Very truly yours,</Text>
          <Text style={styles.signatureName}>JONATHAN J. JALBUENA</Text>
          <Text style={styles.signatureTitle}> Operations Manager</Text>
        </View>

      </Page>
    </Document>
  );
}
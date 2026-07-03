/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'
import {
  Body, Column, Container, Head, Heading, Hr, Html, Link, Preview, Row, Section, Text,
} from 'npm:@react-email/components@0.0.22'

export interface OrderReceiptItem {
  title: string
  quantity: number
  unitPrice?: number | string
  lineTotal?: number | string
}

interface OrderReceiptEmailProps {
  recipientName?: string
  orderRef: string
  items: OrderReceiptItem[]
  subtotal?: string
  shipping?: string
  total: string
  currency?: string
  shippingAddress?: string
  ctaUrl?: string
}

export const OrderReceiptEmail = ({
  recipientName = 'Sporcu',
  orderRef,
  items,
  subtotal,
  shipping,
  total,
  shippingAddress,
  ctaUrl = 'https://app.dynabolic.co',
}: OrderReceiptEmailProps) => (
  <Html lang="tr" dir="ltr">
    <Head />
    <Preview>Sipariş #{orderRef} onaylandı — {total}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={hero}>
          <Text style={brand}>⚡ DYNABOLIC</Text>
          <Text style={brandSub}>Sipariş Onayı</Text>
        </Section>
        <Section style={card}>
          <Heading style={h1}>Teşekkürler, {recipientName}</Heading>
          <Text style={text}>
            Siparişini aldık. Aşağıda özet bilgileri bulabilirsin.
          </Text>

          <Section style={infoBox}>
            <Text style={infoLabel}>SİPARİŞ NO</Text>
            <Text style={infoValue}>{orderRef}</Text>
          </Section>

          <Hr style={hr} />

          {items.map((item, idx) => (
            <Row key={idx} style={itemRow}>
              <Column style={itemLeft}>
                <Text style={itemTitle}>{item.title}</Text>
                <Text style={itemMeta}>Adet: {item.quantity}</Text>
              </Column>
              <Column style={itemRight}>
                <Text style={itemPrice}>{item.lineTotal ?? item.unitPrice ?? ''}</Text>
              </Column>
            </Row>
          ))}

          <Hr style={hr} />

          {subtotal && (
            <Row style={sumRow}>
              <Column><Text style={sumLabel}>Ara Toplam</Text></Column>
              <Column style={itemRight}><Text style={sumValue}>{subtotal}</Text></Column>
            </Row>
          )}
          {shipping && (
            <Row style={sumRow}>
              <Column><Text style={sumLabel}>Kargo</Text></Column>
              <Column style={itemRight}><Text style={sumValue}>{shipping}</Text></Column>
            </Row>
          )}
          <Row style={sumRow}>
            <Column><Text style={totalLabel}>Toplam</Text></Column>
            <Column style={itemRight}><Text style={totalValue}>{total}</Text></Column>
          </Row>

          {shippingAddress && (
            <>
              <Hr style={hr} />
              <Text style={infoLabel}>KARGO ADRESİ</Text>
              <Text style={addressText}>{shippingAddress}</Text>
            </>
          )}

          <Section style={buttonWrap}>
            <Link style={button} href={ctaUrl}>Siparişimi Görüntüle</Link>
          </Section>

          <Hr style={hr} />
          <Text style={footer}>
            YILDIRIM GROUP LTD, 71 - 75 Shelton Street, Covent Garden, London, WC2H 9JQ, United Kingdom<br />
            © {new Date().getFullYear()} Dynabolic. Tüm hakları saklıdır.<br />
            <Link href="{{unsubscribe_url}}" style={footerLink}>Abonelikten çık</Link>
          </Text>
        </Section>
      </Container>
    </Body>
  </Html>
)

export default OrderReceiptEmail

const lime = 'hsl(68, 100%, 50%)'
const main = { backgroundColor: '#ffffff', fontFamily: 'Helvetica, Arial, sans-serif', margin: 0, padding: '24px 0' }
const container = { maxWidth: '560px', margin: '0 auto', padding: '0 16px' }
const hero = { textAlign: 'center' as const, padding: '16px 0 24px' }
const brand = { fontSize: '24px', fontWeight: 800 as const, letterSpacing: '-0.02em', color: '#0a0a0a', margin: 0 }
const brandSub = { fontSize: '10px', letterSpacing: '0.2em', color: '#737373', textTransform: 'uppercase' as const, margin: '4px 0 0' }
const card = { backgroundColor: '#0a0a0a', borderRadius: '16px', padding: '36px 28px', border: `1px solid ${lime}` }
const h1 = { fontSize: '22px', fontWeight: 700 as const, color: '#f8f8f8', margin: '0 0 12px' }
const text = { fontSize: '15px', color: '#a3a3a3', lineHeight: '1.6', margin: '0 0 20px' }
const infoBox = { margin: '0 0 8px' }
const infoLabel = { fontSize: '10px', letterSpacing: '0.15em', color: '#737373', textTransform: 'uppercase' as const, margin: '0 0 4px' }
const infoValue = { fontSize: '14px', color: '#f8f8f8', fontWeight: 600 as const, margin: 0 }
const itemRow = { margin: '8px 0' }
const itemLeft = { verticalAlign: 'top' as const }
const itemRight = { verticalAlign: 'top' as const, textAlign: 'right' as const }
const itemTitle = { fontSize: '14px', color: '#f8f8f8', margin: '0 0 2px' }
const itemMeta = { fontSize: '12px', color: '#737373', margin: 0 }
const itemPrice = { fontSize: '14px', color: '#f8f8f8', margin: 0 }
const sumRow = { margin: '4px 0' }
const sumLabel = { fontSize: '13px', color: '#a3a3a3', margin: 0 }
const sumValue = { fontSize: '13px', color: '#f8f8f8', margin: 0 }
const totalLabel = { fontSize: '15px', color: '#f8f8f8', fontWeight: 700 as const, margin: '8px 0 0' }
const totalValue = { fontSize: '18px', color: lime, fontWeight: 800 as const, margin: '8px 0 0' }
const addressText = { fontSize: '13px', color: '#a3a3a3', lineHeight: '1.6', margin: '0 0 16px', whiteSpace: 'pre-wrap' as const }
const buttonWrap = { textAlign: 'center' as const, margin: '24px 0 8px' }
const button = { backgroundColor: lime, color: '#000000', fontSize: '15px', fontWeight: 700 as const, borderRadius: '10px', padding: '14px 32px', textDecoration: 'none', display: 'inline-block' }
const hr = { borderColor: '#262626', margin: '20px 0' }
const footer = { fontSize: '11px', color: '#737373', margin: 0, lineHeight: '1.6' }
const footerLink = { color: '#a3a3a3', textDecoration: 'underline' }

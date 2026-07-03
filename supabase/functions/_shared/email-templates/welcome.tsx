/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'
import {
  Body, Button, Container, Head, Heading, Hr, Html, Link, Preview, Section, Text,
} from 'npm:@react-email/components@0.0.22'

interface WelcomeEmailProps {
  name?: string
  ctaUrl?: string
}

export const WelcomeEmail = ({ name = 'Sporcu', ctaUrl = 'https://app.dynabolic.co/login' }: WelcomeEmailProps) => (
  <Html lang="tr" dir="ltr">
    <Head />
    <Preview>Dynabolic'e hoş geldin — güç yolculuğun başlıyor</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={hero}>
          <Text style={brand}>⚡ DYNABOLIC</Text>
          <Text style={brandSub}>Elite Performance OS</Text>
        </Section>
        <Section style={card}>
          <Heading style={h1}>Hoş geldin, {name}</Heading>
          <Text style={text}>
            Dynabolic ailesine katıldığın için teşekkürler. Antrenman, beslenme ve topluluk özelliklerinin
            hepsi tek bir yerde — hemen keşfetmeye başla.
          </Text>
          <Section style={buttonWrap}>
            <Button style={button} href={ctaUrl}>Uygulamaya Git</Button>
          </Section>
          <Text style={small}>
            Buton çalışmazsa: <Link href={ctaUrl} style={link}>{ctaUrl}</Link>
          </Text>
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

export default WelcomeEmail

const lime = 'hsl(68, 100%, 50%)'
const main = { backgroundColor: '#ffffff', fontFamily: 'Helvetica, Arial, sans-serif', margin: 0, padding: '24px 0' }
const container = { maxWidth: '560px', margin: '0 auto', padding: '0 16px' }
const hero = { textAlign: 'center' as const, padding: '16px 0 24px' }
const brand = { fontSize: '24px', fontWeight: 800 as const, letterSpacing: '-0.02em', color: '#0a0a0a', margin: 0 }
const brandSub = { fontSize: '10px', letterSpacing: '0.2em', color: '#737373', textTransform: 'uppercase' as const, margin: '4px 0 0' }
const card = { backgroundColor: '#0a0a0a', borderRadius: '16px', padding: '36px 28px', border: `1px solid ${lime}` }
const h1 = { fontSize: '24px', fontWeight: 700 as const, color: '#f8f8f8', margin: '0 0 16px' }
const text = { fontSize: '15px', color: '#a3a3a3', lineHeight: '1.6', margin: '0 0 24px' }
const buttonWrap = { textAlign: 'center' as const, margin: '8px 0 24px' }
const button = { backgroundColor: lime, color: '#000000', fontSize: '15px', fontWeight: 700 as const, borderRadius: '10px', padding: '14px 32px', textDecoration: 'none', display: 'inline-block' }
const small = { fontSize: '12px', color: '#737373', wordBreak: 'break-all' as const, margin: '0 0 8px' }
const link = { color: lime, textDecoration: 'underline' }
const hr = { borderColor: '#262626', margin: '24px 0' }
const footer = { fontSize: '11px', color: '#737373', margin: 0, lineHeight: '1.6' }
const footerLink = { color: '#a3a3a3', textDecoration: 'underline' }

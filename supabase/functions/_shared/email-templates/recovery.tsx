/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'
import {
  Body, Button, Container, Head, Heading, Hr, Html, Link, Preview, Section, Text,
} from 'npm:@react-email/components@0.0.22'

interface RecoveryEmailProps {
  siteName: string
  confirmationUrl: string
}

export const RecoveryEmail = ({ siteName, confirmationUrl }: RecoveryEmailProps) => (
  <Html lang="tr" dir="ltr">
    <Head />
    <Preview>Dynabolic şifrenizi sıfırlayın</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={hero}>
          <Text style={brand}>⚡ DYNABOLIC</Text>
          <Text style={brandSub}>Coach Operating System</Text>
        </Section>
        <Section style={card}>
          <Heading style={h1}>Şifrenizi sıfırlayın</Heading>
          <Text style={text}>
            {siteName} hesabınız için bir şifre sıfırlama talebi aldık. Yeni şifrenizi belirlemek için aşağıdaki butona tıklayın.
          </Text>
          <Section style={buttonWrap}>
            <Button style={button} href={confirmationUrl}>Şifremi Sıfırla</Button>
          </Section>
          <Text style={small}>
            Buton çalışmazsa: <Link href={confirmationUrl} style={link}>{confirmationUrl}</Link>
          </Text>
          <Hr style={hr} />
          <Text style={footer}>
            Bu talebi siz yapmadıysanız bu maili görmezden gelebilirsiniz; şifreniz değişmeyecektir.
          </Text>
        </Section>
      </Container>
    </Body>
  </Html>
)

export default RecoveryEmail

const lime = 'hsl(68, 100%, 50%)'
const main = { backgroundColor: '#ffffff', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif', margin: 0, padding: '24px 0' }
const container = { maxWidth: '520px', margin: '0 auto', padding: '0 16px' }
const hero = { textAlign: 'center' as const, padding: '16px 0 24px' }
const brand = { fontSize: '24px', fontWeight: 800 as const, letterSpacing: '-0.02em', color: '#0a0a0a', margin: 0 }
const brandSub = { fontSize: '10px', letterSpacing: '0.2em', color: '#737373', textTransform: 'uppercase' as const, margin: '4px 0 0' }
const card = { backgroundColor: '#0a0a0a', borderRadius: '16px', padding: '32px 28px', border: `1px solid ${lime}` }
const h1 = { fontSize: '22px', fontWeight: 700 as const, color: '#f2f2f2', margin: '0 0 16px' }
const text = { fontSize: '15px', color: '#a3a3a3', lineHeight: '1.6', margin: '0 0 24px' }
const buttonWrap = { textAlign: 'center' as const, margin: '8px 0 24px' }
const button = { backgroundColor: lime, color: '#000000', fontSize: '15px', fontWeight: 700 as const, borderRadius: '8px', padding: '14px 28px', textDecoration: 'none', display: 'inline-block' }
const small = { fontSize: '12px', color: '#737373', wordBreak: 'break-all' as const, margin: '0 0 8px' }
const link = { color: lime, textDecoration: 'underline' }
const hr = { borderColor: '#262626', margin: '24px 0' }
const footer = { fontSize: '12px', color: '#737373', margin: 0, lineHeight: '1.6' }

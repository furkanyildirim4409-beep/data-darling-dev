/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Hr, Html, Preview, Section, Text,
} from 'npm:@react-email/components@0.0.22'

interface ReauthenticationEmailProps {
  token: string
}

export const ReauthenticationEmail = ({ token }: ReauthenticationEmailProps) => (
  <Html lang="tr" dir="ltr">
    <Head />
    <Preview>Dynabolic doğrulama kodunuz</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={hero}>
          <Text style={brand}>⚡ DYNABOLIC</Text>
          <Text style={brandSub}>Coach Operating System</Text>
        </Section>
        <Section style={card}>
          <Heading style={h1}>Kimliğinizi doğrulayın</Heading>
          <Text style={text}>Aşağıdaki kodu kullanarak işleminizi onaylayın:</Text>
          <Text style={codeStyle}>{token}</Text>
          <Hr style={hr} />
          <Text style={footer}>
            Bu kod kısa süre içinde geçersiz olur. Bu talebi siz yapmadıysanız bu maili görmezden gelebilirsiniz.
          </Text>
        </Section>
      </Container>
    </Body>
  </Html>
)

export default ReauthenticationEmail

const lime = 'hsl(68, 100%, 50%)'
const main = { backgroundColor: '#ffffff', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif', margin: 0, padding: '24px 0' }
const container = { maxWidth: '520px', margin: '0 auto', padding: '0 16px' }
const hero = { textAlign: 'center' as const, padding: '16px 0 24px' }
const brand = { fontSize: '24px', fontWeight: 800 as const, letterSpacing: '-0.02em', color: '#0a0a0a', margin: 0 }
const brandSub = { fontSize: '10px', letterSpacing: '0.2em', color: '#737373', textTransform: 'uppercase' as const, margin: '4px 0 0' }
const card = { backgroundColor: '#0a0a0a', borderRadius: '16px', padding: '32px 28px', border: `1px solid ${lime}` }
const h1 = { fontSize: '22px', fontWeight: 700 as const, color: '#f2f2f2', margin: '0 0 16px' }
const text = { fontSize: '15px', color: '#a3a3a3', lineHeight: '1.6', margin: '0 0 16px' }
const codeStyle = { fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', fontSize: '32px', fontWeight: 800 as const, color: lime, letterSpacing: '0.4em', textAlign: 'center' as const, backgroundColor: '#171717', borderRadius: '8px', padding: '20px', margin: '8px 0 24px' }
const hr = { borderColor: '#262626', margin: '8px 0 16px' }
const footer = { fontSize: '12px', color: '#737373', margin: 0, lineHeight: '1.6' }

/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import { Html, Head, Body, Container } from 'npm:@react-email/components@0.0.22'

export interface ShippingNotificationEmailProps {
  recipientName?: string
  orderId: string
  shippingCompany: string
  trackingNumber: string
  trackingUrl?: string
  orderUrl?: string
}

export const ShippingNotificationEmail: React.FC<ShippingNotificationEmailProps> = (_props) => (
  <Html>
    <Head />
    <Body>
      <Container>
        <h1>[PLACEHOLDER - DESIGN WILL BE INJECTED LATER]</h1>
      </Container>
    </Body>
  </Html>
)

export default ShippingNotificationEmail

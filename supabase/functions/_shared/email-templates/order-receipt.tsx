/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import { Html, Head, Body, Container } from 'npm:@react-email/components@0.0.22'

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
  shippingAddress?: string
  ctaUrl?: string
}

export const OrderReceiptEmail: React.FC<OrderReceiptEmailProps> = (_props) => (
  <Html>
    <Head />
    <Body>
      <Container>
        <h1>[PLACEHOLDER - DESIGN WILL BE INJECTED LATER]</h1>
      </Container>
    </Body>
  </Html>
)

export default OrderReceiptEmail

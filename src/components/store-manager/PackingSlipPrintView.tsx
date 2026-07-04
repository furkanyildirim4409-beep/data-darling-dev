interface OrderItem {
  id: string;
  items: any;
  total_price: number;
  created_at: string;
  shipping_address: any;
  tracking_number: string | null;
  shopify_order_number?: string | null;
}

interface Props {
  order: OrderItem;
  coachName?: string;
}

const shortId = (id: string, shopifyOrderNumber?: string | null) =>
  shopifyOrderNumber
    ? `#${String(shopifyOrderNumber).replace(/^#/, "")}`
    : `#ORD-${id.replace(/-/g, "").slice(0, 4).toUpperCase()}`;

/** Deterministic pseudo-barcode generated from the order ID hash. */
function Barcode({ value }: { value: string }) {
  const clean = value.replace(/-/g, "");
  // FNV-ish hash → expand to a long pseudo-random bit stream
  let h = 2166136261;
  for (let i = 0; i < clean.length; i++) {
    h ^= clean.charCodeAt(i);
    h = (h * 16777619) >>> 0;
  }

  const bars: { x: number; w: number }[] = [];
  let x = 0;
  let seed = h;
  while (x < 360) {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    const w = (seed % 3) + 1; // 1..3 px
    seed = (seed * 1664525 + 1013904223) >>> 0;
    const isBar = (seed & 1) === 1;
    if (isBar) bars.push({ x, w });
    x += w + 1;
  }

  return (
    <div style={{ textAlign: "center" }}>
      <svg
        width="100%"
        height="56"
        viewBox="0 0 360 56"
        preserveAspectRatio="none"
        style={{ display: "block" }}
      >
        {bars.map((b, i) => (
          <rect key={i} x={b.x} y={0} width={b.w} height={56} fill="#000" />
        ))}
      </svg>
      <div
        style={{
          fontFamily: "ui-monospace, SFMono-Regular, monospace",
          fontSize: 10,
          letterSpacing: 1,
          marginTop: 4,
          color: "#000",
        }}
      >
        {clean.toUpperCase()}
      </div>
    </div>
  );
}

export default function PackingSlipPrintView({ order, coachName }: Props) {
  const addr = order.shipping_address ?? {};
  const fullName =
    [addr.firstName, addr.lastName].filter(Boolean).join(" ") ||
    addr.name ||
    "—";
  const phone = addr.phone ?? "—";
  const street = [addr.address1, addr.address2].filter(Boolean).join(" ");
  const cityLine = [addr.zip, addr.city, addr.province, addr.country]
    .filter(Boolean)
    .join(", ");

  const items: any[] = Array.isArray(order.items) ? order.items : [];
  const totalQty = items.reduce(
    (sum, it) => sum + Number(it.quantity ?? 1),
    0
  );

  const baseStyle: React.CSSProperties = {
    fontFamily: "ui-sans-serif, system-ui, -apple-system, sans-serif",
    color: "#000",
    background: "#fff",
  };

  return (
    <div
      id="printable-packing-slip"
      style={{
        ...baseStyle,
        padding: 24,
        maxWidth: "100mm",
        margin: "0 auto",
        fontSize: 12,
        lineHeight: 1.4,
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-end",
          borderBottom: "2px solid #000",
          paddingBottom: 8,
          marginBottom: 12,
        }}
      >
        <div>
          <div style={{ fontWeight: 900, fontSize: 16, letterSpacing: 1 }}>
            DYNABOLIC LOGISTICS
          </div>
          <div style={{ fontSize: 10, textTransform: "uppercase" }}>
            Packing Slip / Kargo Fişi
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontWeight: 700 }}>{shortId(order.id, order.shopify_order_number)}</div>
          <div style={{ fontSize: 10 }}>
            {new Date(order.created_at).toLocaleDateString("tr-TR")}
          </div>
        </div>
      </div>

      {/* Barcode */}
      <div style={{ margin: "8px 0 16px" }}>
        <Barcode value={order.id} />
      </div>

      {/* From / To */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 8,
          marginBottom: 16,
        }}
      >
        <div style={{ border: "1px solid #000", padding: 8 }}>
          <div
            style={{
              fontSize: 9,
              textTransform: "uppercase",
              fontWeight: 700,
              marginBottom: 4,
            }}
          >
            Gönderen / From
          </div>
          <div style={{ fontWeight: 700 }}>
            {coachName || "Dynabolic Coach"}
          </div>
          <div style={{ fontSize: 10 }}>Dynabolic E-Commerce</div>
        </div>
        <div style={{ border: "1px solid #000", padding: 8 }}>
          <div
            style={{
              fontSize: 9,
              textTransform: "uppercase",
              fontWeight: 700,
              marginBottom: 4,
            }}
          >
            Alıcı / To
          </div>
          <div style={{ fontWeight: 700 }}>{fullName}</div>
          <div style={{ fontSize: 10 }}>{phone}</div>
          {street && <div style={{ fontSize: 10 }}>{street}</div>}
          {cityLine && <div style={{ fontSize: 10 }}>{cityLine}</div>}
        </div>
      </div>

      {/* Tracking */}
      {order.tracking_number && (
        <div
          style={{
            border: "1px solid #000",
            padding: 6,
            marginBottom: 12,
            fontSize: 10,
          }}
        >
          <strong>Kargo Takip:</strong>{" "}
          <span style={{ fontFamily: "ui-monospace, monospace" }}>
            {order.tracking_number}
          </span>
        </div>
      )}

      {/* Items table */}
      <table
        style={{
          width: "100%",
          borderCollapse: "collapse",
          marginBottom: 12,
          fontSize: 11,
        }}
      >
        <thead>
          <tr>
            <th
              style={{
                border: "1px solid #000",
                padding: 4,
                textAlign: "left",
                width: 28,
              }}
            >
              #
            </th>
            <th
              style={{
                border: "1px solid #000",
                padding: 4,
                textAlign: "left",
              }}
            >
              Ürün
            </th>
            <th
              style={{
                border: "1px solid #000",
                padding: 4,
                textAlign: "right",
                width: 48,
              }}
            >
              Adet
            </th>
          </tr>
        </thead>
        <tbody>
          {items.length === 0 && (
            <tr>
              <td
                colSpan={3}
                style={{
                  border: "1px solid #000",
                  padding: 6,
                  textAlign: "center",
                }}
              >
                Ürün yok
              </td>
            </tr>
          )}
          {items.map((it: any, idx: number) => (
            <tr key={it.id ?? idx}>
              <td style={{ border: "1px solid #000", padding: 4 }}>{idx + 1}</td>
              <td style={{ border: "1px solid #000", padding: 4 }}>
                {it.title ?? "Ürün"}
              </td>
              <td
                style={{
                  border: "1px solid #000",
                  padding: 4,
                  textAlign: "right",
                  fontWeight: 700,
                }}
              >
                {Number(it.quantity ?? 1)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          fontSize: 11,
          fontWeight: 700,
          borderTop: "2px solid #000",
          paddingTop: 6,
          marginBottom: 16,
        }}
      >
        <span>Toplam Adet</span>
        <span>{totalQty}</span>
      </div>

      <div
        style={{
          fontSize: 9,
          textAlign: "center",
          borderTop: "1px dashed #000",
          paddingTop: 6,
        }}
      >
        Bu fiş Dynabolic tarafından üretilmiştir •{" "}
        {new Date().toLocaleString("tr-TR")}
      </div>
    </div>
  );
}

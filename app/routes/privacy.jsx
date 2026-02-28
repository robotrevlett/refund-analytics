export default function PrivacyPolicy() {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>Privacy Policy — Refund &amp; Return Analytics</title>
        <style
          dangerouslySetInnerHTML={{
            __html: `
              * { margin: 0; padding: 0; box-sizing: border-box; }
              body {
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
                color: #1a1a1a;
                background: #f6f6f7;
                line-height: 1.6;
              }
              .container {
                max-width: 720px;
                margin: 0 auto;
                padding: 48px 24px;
              }
              h1 {
                font-size: 28px;
                font-weight: 600;
                margin-bottom: 8px;
              }
              .updated {
                color: #616161;
                font-size: 14px;
                margin-bottom: 32px;
              }
              h2 {
                font-size: 20px;
                font-weight: 600;
                margin-top: 32px;
                margin-bottom: 12px;
              }
              p, li {
                font-size: 15px;
                margin-bottom: 12px;
              }
              ul {
                padding-left: 24px;
                margin-bottom: 16px;
              }
              a { color: #2c6ecb; }
            `,
          }}
        />
      </head>
      <body>
        <div className="container">
          <h1>Privacy Policy</h1>
          <p className="updated">Last updated: February 2026</p>

          <p>
            Refund &amp; Return Analytics ("the App") is a Shopify application
            that helps merchants understand their refund and return data. This
            policy explains what data the App accesses, how it is stored, and
            your rights regarding that data.
          </p>

          <h2>Data We Collect</h2>
          <p>
            The App fetches the following data from your Shopify store via the
            Shopify GraphQL Admin API:
          </p>
          <ul>
            <li>Order IDs and order names</li>
            <li>Refund amounts, dates, and notes</li>
            <li>Product titles and SKUs associated with refunded line items</li>
            <li>Return reasons (when a refund is linked to a return)</li>
          </ul>

          <h2>Data We Do Not Collect</h2>
          <p>The App does not collect or store:</p>
          <ul>
            <li>Customer names, email addresses, or physical addresses</li>
            <li>Payment or credit card information</li>
            <li>Browsing behavior or analytics about your customers</li>
          </ul>
          <p>
            The App does not use cookies, tracking pixels, or any third-party
            analytics services.
          </p>

          <h2>How Data Is Stored</h2>
          <p>
            All data is stored in our secure database and is associated with
            your shop domain only. Your data is not shared with, sold to, or
            accessed by any third parties.
          </p>

          <h2>GDPR Compliance</h2>
          <p>
            The App implements all required Shopify compliance webhooks:
          </p>
          <ul>
            <li>
              <strong>Customer data request</strong> — Acknowledged. The App
              does not store customer-keyed personally identifiable information.
            </li>
            <li>
              <strong>Customer redact</strong> — Deletes any order and refund
              records that may be linked to the specified customer.
            </li>
            <li>
              <strong>Shop redact</strong> — Purges all stored data for the
              shop upon request.
            </li>
          </ul>

          <h2>Data Retention</h2>
          <p>
            All data associated with your shop is automatically deleted when
            the App is uninstalled (via the app/uninstalled webhook) or when a
            shop redact request is received from Shopify.
          </p>

          <h2>Data Access</h2>
          <p>
            Merchants can view all data stored by the App within the Settings
            page inside the application.
          </p>

          <h2>Contact</h2>
          <p>
            For privacy-related inquiries, please contact us at{" "}
            <a href="mailto:support@refundanalytics.com">
              support@refundanalytics.com
            </a>.
          </p>
        </div>
      </body>
    </html>
  );
}

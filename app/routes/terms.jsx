export default function TermsOfService() {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>Terms of Service — Refund &amp; Return Analytics</title>
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
          <h1>Terms of Service</h1>
          <p className="updated">Last updated: February 2026</p>

          <h2>Service Description</h2>
          <p>
            Refund &amp; Return Analytics ("the App") is an analytics tool that
            displays refund and return data from your Shopify store. The App
            helps merchants understand refund trends, return reasons, and their
            impact on revenue.
          </p>

          <h2>Acceptance of Terms</h2>
          <p>
            By installing and using the App, you agree to be bound by these
            Terms of Service. If you do not agree to these terms, please
            uninstall the App.
          </p>

          <h2>Billing</h2>
          <p>
            All billing for the App is handled through Shopify's billing
            system. Any refunds for app charges follow Shopify's refund
            policies. Please refer to Shopify's documentation for details on
            billing and payment processing.
          </p>

          <h2>Data Accuracy</h2>
          <p>
            The analytics provided by the App are derived from data available
            through the Shopify GraphQL Admin API. While we strive to present
            this data accurately, we do not guarantee the accuracy,
            completeness, or timeliness of Shopify's underlying data. The App
            reflects what is reported by your store's API.
          </p>

          <h2>Limitation of Liability</h2>
          <p>
            The App provides analytics and reporting only. It should not be the
            sole basis for business, financial, or operational decisions. We are
            not liable for any losses or damages arising from reliance on the
            data displayed by the App.
          </p>

          <h2>Termination</h2>
          <p>
            You may terminate your use of the App at any time by uninstalling
            it from your Shopify admin. Upon uninstallation, all stored data
            associated with your shop is automatically deleted.
          </p>

          <h2>Changes to These Terms</h2>
          <p>
            We may update these Terms of Service from time to time. Continued
            use of the App after changes are posted constitutes your acceptance
            of the revised terms.
          </p>

          <h2>Governing Law</h2>
          <p>
            These terms are governed by and construed in accordance with
            applicable laws. Any disputes arising from the use of the App will
            be resolved under the jurisdiction of the applicable courts.
          </p>

          <h2>Contact</h2>
          <p>
            For questions about these terms, please contact us at{" "}
            <a href="mailto:support@refundanalytics.com">
              support@refundanalytics.com
            </a>.
          </p>
        </div>
      </body>
    </html>
  );
}

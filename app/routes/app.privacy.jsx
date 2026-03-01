import { json } from "@remix-run/node";
import { Link } from "@remix-run/react";
import { authenticate } from "../shopify.server.js";

export const loader = async ({ request }) => {
  await authenticate.admin(request);
  return json({});
};

export default function AppPrivacyPolicy() {
  return (
    <s-page title="Privacy Policy" back-action-url="/app/settings">
      <s-stack gap="500">
        <s-section>
          <s-stack gap="400">
            <s-text as="p" tone="subdued">
              Last updated: February 2026
            </s-text>
            <s-text as="p">
              Refund &amp; Return Analytics ("the App") is a Shopify
              application that helps merchants understand their refund and
              return data. This policy explains what data the App accesses,
              how it is stored, and your rights regarding that data.
            </s-text>
          </s-stack>
        </s-section>

        <s-section>
          <s-stack gap="400">
            <s-text variant="headingMd" as="h2">
              Data We Collect
            </s-text>
            <s-text as="p">
              The App fetches the following data from your Shopify store via
              the Shopify GraphQL Admin API:
            </s-text>
            <ul>
              <li>Order IDs and order names</li>
              <li>Refund amounts, dates, and notes</li>
              <li>
                Product titles and SKUs associated with refunded line items
              </li>
              <li>
                Return reasons (when a refund is linked to a return)
              </li>
            </ul>
          </s-stack>
        </s-section>

        <s-section>
          <s-stack gap="400">
            <s-text variant="headingMd" as="h2">
              Data We Do Not Collect
            </s-text>
            <s-text as="p">The App does not collect or store:</s-text>
            <ul>
              <li>
                Customer names, email addresses, or physical addresses
              </li>
              <li>Payment or credit card information</li>
              <li>
                Browsing behavior or analytics about your customers
              </li>
            </ul>
            <s-text as="p">
              The App does not use cookies, tracking pixels, or any
              third-party analytics services.
            </s-text>
          </s-stack>
        </s-section>

        <s-section>
          <s-stack gap="400">
            <s-text variant="headingMd" as="h2">
              How Data Is Stored
            </s-text>
            <s-text as="p">
              All data is stored in our secure database and is associated with
              your shop domain only. Your data is not shared with, sold to, or
              accessed by any third parties.
            </s-text>
          </s-stack>
        </s-section>

        <s-section>
          <s-stack gap="400">
            <s-text variant="headingMd" as="h2">
              GDPR Compliance
            </s-text>
            <s-text as="p">
              The App implements all required Shopify compliance webhooks:
            </s-text>
            <ul>
              <li>
                <strong>Customer data request</strong>{" "}
                — Acknowledged. The App does not store customer-keyed
                personally identifiable information.
              </li>
              <li>
                <strong>Customer redact</strong>{" "}
                — Deletes any order and refund records that may be linked to
                the specified customer.
              </li>
              <li>
                <strong>Shop redact</strong>{" "}
                — Purges all stored data for the shop upon request.
              </li>
            </ul>
          </s-stack>
        </s-section>

        <s-section>
          <s-stack gap="400">
            <s-text variant="headingMd" as="h2">
              Data Retention
            </s-text>
            <s-text as="p">
              Order and refund analytics data is retained for as long as the
              App is installed on your store. We do not retain data beyond
              what is needed to provide the service.
            </s-text>
            <s-text as="p">
              All data associated with your shop is automatically and
              permanently deleted when:
            </s-text>
            <ul>
              <li>
                You uninstall the App (via the app/uninstalled webhook)
              </li>
              <li>
                A shop redact request is received from Shopify
              </li>
              <li>
                You contact us to request deletion
              </li>
            </ul>
            <s-text as="p">
              Data deletion is immediate and irreversible. No backups of
              merchant data are retained after deletion.
            </s-text>
          </s-stack>
        </s-section>

        <s-section>
          <s-stack gap="400">
            <s-text variant="headingMd" as="h2">
              Data Access
            </s-text>
            <s-text as="p">
              Merchants can view all data stored by the App within the{" "}
              <Link to="/app/settings">Settings</Link> page inside the
              application.
            </s-text>
          </s-stack>
        </s-section>

        <s-section>
          <s-stack gap="400">
            <s-text variant="headingMd" as="h2">
              Contact
            </s-text>
            <s-text as="p">
              For privacy-related inquiries, please contact us at{" "}
              <a href="mailto:support@refundanalytics.com">
                support@refundanalytics.com
              </a>
              .
            </s-text>
          </s-stack>
        </s-section>
      </s-stack>
    </s-page>
  );
}
